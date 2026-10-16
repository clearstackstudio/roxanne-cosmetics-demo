'use client';

import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';

type InvCategory = 'fragrance' | 'skincare' | 'makeup';
type InvAudience = 'women' | 'men' | 'unisex';

interface InvItem {
  /** Database row id — present when the item lives in the inventory DB. */
  id?: number;
  barcode: string; // '' when the item has no barcode
  name: string;
  brand: string;
  size: string;
  price: number | null;
  qty: number;
  /** Catalog category — '' until she picks one (required before export is importable). */
  category: InvCategory | '';
  /** Who it's sold for — drives the For Her / For Him views. */
  audience: InvAudience;
}

interface PriceHint {
  merchant: string;
  price: number;
}

/** What a barcode lookup returns: identity + online price suggestions. */
interface LookupHit {
  name: string;
  brand: string;
  size: string;
  category: InvCategory | '';
  priceHints: PriceHint[];
}

interface PendingItem {
  barcode: string;
  name: string;
  brand: string;
  size: string;
  price: string;
  qty: number;
  category: InvCategory | '';
  audience: InvAudience;
  priceHints: PriceHint[];
}

const CATEGORY_OPTIONS: { id: InvCategory; label: string }[] = [
  { id: 'fragrance', label: 'Fragrance (perfume / cologne)' },
  { id: 'skincare', label: 'Skincare' },
  { id: 'makeup', label: 'Makeup' },
];

const AUDIENCE_OPTIONS: { id: InvAudience; label: string }[] = [
  { id: 'women', label: 'For Her' },
  { id: 'men', label: 'For Him' },
  { id: 'unisex', label: 'For Everyone' },
];

const LS_KEY = 'roxanne-inventory-v1';

function guessCategory(p: Record<string, unknown>): InvCategory | '' {
  const tags = [
    ...(Array.isArray(p.categories_tags) ? p.categories_tags : []),
    typeof p.categories === 'string' ? p.categories : '',
  ]
    .join(' ')
    .toLowerCase();
  if (/perfume|fragrance|cologne|eau-de|parfum/.test(tags)) return 'fragrance';
  if (/makeup|make-up|lipstick|mascara|foundation|cosmetic/.test(tags)) return 'makeup';
  if (/skin|cream|lotion|serum|face|body|hair|shampoo|soap/.test(tags)) return 'skincare';
  return '';
}

async function lookupBarcode(code: string): Promise<LookupHit | null> {
  // Primary path: the site's own lookup API — identity from Open Beauty
  // Facts / Open Food Facts PLUS online price suggestions (UPCitemdb).
  try {
    const res = await fetch(`/api/lookup/${encodeURIComponent(code)}`);
    if (res.ok) {
      const j = (await res.json()) as {
        found?: boolean;
        name?: string;
        brand?: string;
        size?: string;
        category?: InvCategory | '';
        priceHints?: PriceHint[];
      };
      if (j.found) {
        return {
          name: j.name ?? '',
          brand: j.brand ?? '',
          size: j.size ?? '',
          category: j.category ?? '',
          priceHints: Array.isArray(j.priceHints) ? j.priceHints : [],
        };
      }
    }
  } catch {
    // fall through to the direct lookup below
  }
  // Fallback: query the open databases directly (identity only, no
  // prices) so lookups still work even if the API route is down.
  const urls = [
    `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const j = await res.json();
      if (j?.status === 1 && j.product) {
        const p = j.product;
        return {
          name: typeof p.product_name === 'string' ? p.product_name : '',
          brand:
            typeof p.brands === 'string' ? p.brands.split(',')[0].trim() : '',
          size: typeof p.quantity === 'string' ? p.quantity : '',
          category: guessCategory(p as Record<string, unknown>),
          priceHints: [],
        };
      }
    } catch {
      // try the next source
    }
  }
  return null;
}

function normalizeItem(i: Partial<InvItem>): InvItem {
  return {
    id: i.id,
    barcode: i.barcode ?? '',
    name: i.name ?? '',
    brand: i.brand ?? '',
    size: i.size ?? '',
    price: i.price ?? null,
    qty: i.qty ?? 1,
    category: i.category ?? '',
    audience: i.audience ?? 'unisex',
  };
}

function beep() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1320;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    osc.onended = () => void ctx.close();
  } catch {
    // no audio — not essential
  }
}

/**
 * Build a ZXing reader tuned for retail product barcodes.
 * TRY_HARDER plus a retail-only format list: perfume/cosmetics boxes
 * carry small EAN/UPC codes, often under shiny cellophane — the default
 * reader gave up on them (field report 2026-10-13: the camera preview
 * worked, but a perfume-box barcode was never picked up).
 */
async function makeBarcodeReader() {
  const { BrowserMultiFormatReader, BarcodeFormat } = await import('@zxing/browser');
  const { DecodeHintType } = await import('@zxing/library');
  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
  ]);
  return new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200 });
}

/**
 * Draw a video frame or image onto a fresh canvas, rotated by `deg`
 * and capped at `maxEdge` px on the long side. ZXing's 1D reader only
 * scans horizontally: upright and upside-down barcodes decode as-is,
 * but a sideways one (box turned on the shelf) is invisible until the
 * image is turned upright — verified against the reader core with a
 * real shop barcode at all four rotations (2026-10-15). Every rotated
 * retry in the scanner goes through here.
 */
function drawRotated(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  deg: 0 | 90 | 180 | 270,
  maxEdge: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const swap = deg === 90 || deg === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? h : w;
  canvas.height = swap ? w : h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(source, -w / 2, -h / 2, w, h);
  }
  return canvas;
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const inputCls =
  'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 outline-none focus:border-rose-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100';

type StoreMode = 'checking' | 'db' | 'local' | 'locked';

export default function InventoryScanner() {
  const [items, setItems] = useState<InvItem[]>([]);
  const [pending, setPending] = useState<PendingItem | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  // Where the inventory lives: the shop database ('db'), this phone
  // only ('local' — fallback until the database is connected), the
  // passcode gate ('locked'), or still finding out ('checking').
  const [mode, setMode] = useState<StoreMode>('checking');
  const [passcode, setPasscode] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const sweepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sweepBusyRef = useRef(false);
  const sweepReaderRef = useRef<Awaited<ReturnType<typeof makeBarcodeReader>> | null>(null);
  const loadedRef = useRef(false);

  // --- Scan & Go session state (continuous scanning, Sam's Club style) ---
  // The camera stays open across items: a code already in the list adds
  // +1 instantly; a NEW code resolves on the spot — its lookup runs and
  // the confirm card opens right there (camera view hides, decodes are
  // gated) so she checks the suggested name/price and taps Save, then
  // scanning resumes. Only a deliberate "Review later" (or a stop with
  // deferred items pending) uses the review queue, which is worked
  // through when the camera stops. Refs mirror the state because the
  // decode callback is registered once at start and would otherwise see
  // stale closures.
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [sessionAdded, setSessionAdded] = useState(0);
  const [sessionItems, setSessionItems] = useState<
    { name: string; qty: number; price: number | null }[]
  >([]);
  const [flash, setFlash] = useState(false);
  const itemsRef = useRef<InvItem[]>([]);
  const queueRef = useRef<string[]>([]);
  const pendingRef = useRef<PendingItem | null>(null);
  const dismissedRef = useRef(new Set<string>());
  const lookupCacheRef = useRef(new Map<string, LookupHit | null>());
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  /** Record one scanned/saved item in the visible session list. */
  const addSessionEntry = (name: string, qty: number, price: number | null) => {
    setSessionItems((prev) => {
      const idx = prev.findIndex((e) => e.name === name);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return [next[idx], ...next.filter((_, i) => i !== idx)];
      }
      return [{ name, qty, price }, ...prev];
    });
  };

  // Load the inventory once, after mount (client-only stores must not be
  // read during render, so the prerendered page and first client render
  // agree). The database is the source of truth; localStorage is the
  // fallback until the database is connected, and its contents are
  // offered for one-time import on the first database load.
  useEffect(() => {
    let cancelled = false;
    const loadLocal = (): InvItem[] => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return [];
        return (JSON.parse(raw) as Partial<InvItem>[]).map(normalizeItem);
      } catch {
        return [];
      }
    };
    (async () => {
      try {
        const res = await fetch('/api/inventory');
        if (cancelled) return;
        if (res.status === 401) {
          setMode('locked');
          loadedRef.current = true;
          return;
        }
        if (!res.ok) throw new Error('inventory api unavailable');
        const j = (await res.json()) as { items: Partial<InvItem>[] };
        let dbItems = j.items.map(normalizeItem);
        // One-time bridge: phone-only items scanned before the database
        // existed are uploaded once, then the phone copy is retired.
        const localItems = loadLocal();
        if (localItems.length > 0) {
          for (const li of localItems) {
            try {
              const r = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item: li }),
              });
              if (r.ok) {
                const saved = (await r.json()) as { item: Partial<InvItem> };
                dbItems = [
                  normalizeItem(saved.item),
                  ...dbItems.filter((d) => d.id !== saved.item.id),
                ];
              }
            } catch {
              // leave the phone copy in place; import retries next load
            }
          }
          const stillLocal = loadLocal();
          const allInDb = localItems.every((li) =>
            dbItems.some(
              (d) => (li.barcode && d.barcode === li.barcode) || d.name === li.name,
            ),
          );
          if (allInDb && stillLocal.length > 0) {
            try {
              localStorage.removeItem(LS_KEY);
            } catch {
              // nothing to clean
            }
            if (!cancelled) {
              setStatus('Your phone inventory was moved into the shop database.');
            }
          }
        }
        if (cancelled) return;
        setItems(dbItems);
        setMode('db');
        loadedRef.current = true;
      } catch {
        if (cancelled) return;
        setItems(loadLocal());
        setMode('local');
        loadedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Phone-only mode persists every change locally (original behavior).
  useEffect(() => {
    if (!loadedRef.current || mode !== 'local') return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {
      // storage full/blocked — list still works for this session
    }
  }, [items, mode]);

  const unlock = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/inventory-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) {
        setStatus('That passcode did not work — check it and try again.');
        return;
      }
      setPasscode('');
      // Cookie is set; reload from the database.
      const list = await fetch('/api/inventory');
      if (list.ok) {
        const j = (await list.json()) as { items: Partial<InvItem>[] };
        setItems(j.items.map(normalizeItem));
        setMode('db');
        setStatus('Unlocked — inventory is saving to the shop database.');
      } else {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            setItems((JSON.parse(raw) as Partial<InvItem>[]).map(normalizeItem));
          }
        } catch {
          // no phone copy — start empty
        }
        setMode('local');
        setStatus('Unlocked, but the database is not connected yet — saving to this phone only.');
      }
    } catch {
      setStatus('Could not unlock — check the connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  // Debounced database save for in-list edits (qty, price, category…).
  // Fires 600ms after the last change and sends the item's latest
  // state, so rapid edits collapse into one write of final values.
  const patchTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const scheduleSave = (id: number) => {
    if (mode !== 'db') return;
    const timers = patchTimers.current;
    const old = timers.get(id);
    if (old) clearTimeout(old);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        const item = itemsRef.current.find((i) => i.id === id);
        if (!item) return;
        void fetch('/api/inventory', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, patch: item }),
        }).then((r) => {
          if (!r.ok) {
            setStatus(
              'A change could not be saved to the database — check the connection, then re-enter it.',
            );
          }
        });
      }, 600),
    );
  };

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (sweepTimerRef.current) {
      clearInterval(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }
    setScanning(false);
    // Scan & Go: stopping the camera opens the review queue (only
    // items she deferred with "Review later"), one at a time — unless
    // a confirm card is already open.
    if (!pendingRef.current && queueRef.current.length > 0) void advanceReview();
  };

  useEffect(
    () => () => {
      controlsRef.current?.stop();
      if (sweepTimerRef.current) clearInterval(sweepTimerRef.current);
    },
    [],
  );

  const openPendingFor = (code: string, found: LookupHit | null) => {
    setPending({
      barcode: code,
      name: found?.name ?? '',
      brand: found?.brand ?? '',
      size: found?.size ?? '',
      price: '',
      qty: 1,
      category: found?.category ?? '',
      audience: 'unisex',
      priceHints: found?.priceHints ?? [],
    });
    setStatus(
      found
        ? 'Found it — check the details, add the price, then save.'
        : 'Barcode not recognized — type the product name in, then save.',
    );
  };

  const handleCode = async (code: string) => {
    const existing = items.findIndex((i) => i.barcode && i.barcode === code);
    if (existing >= 0) {
      updateItem(existing, { qty: items[existing].qty + 1 });
      setStatus(`Already in the list — added one more: ${items[existing].name}`);
      return;
    }
    setBusy(true);
    setStatus('Looking up the barcode…');
    const found = await lookupBarcode(code);
    setBusy(false);
    openPendingFor(code, found);
  };

  const dropFromQueue = (code: string) => {
    queueRef.current = queueRef.current.filter((c) => c !== code);
    setReviewQueue(queueRef.current);
    lookupCacheRef.current.delete(code);
  };

  /** Open the detail form for the next queued code, if any. */
  const advanceReview = async () => {
    const code = queueRef.current[0];
    if (!code) return;
    let found = lookupCacheRef.current.get(code);
    if (found === undefined) {
      setBusy(true);
      setStatus('Looking up the barcode…');
      found = await lookupBarcode(code);
      lookupCacheRef.current.set(code, found);
      setBusy(false);
    }
    openPendingFor(code, found ?? null);
  };

  /**
   * One decoded code during continuous scanning. The camera never
   * stops: known items add instantly, a NEW code resolves inline (its
   * lookup runs and the confirm card opens over the session — decodes
   * are gated while the card is up), and the same code re-read across
   * consecutive frames is debounced so a slow pass over one box
   * doesn't add five of it.
   */
  const onScan = (code: string) => {
    // A confirm card is open — hold all decodes until it's dealt with.
    if (pendingRef.current) return;
    // eslint-disable-next-line react-hooks/purity -- decode callback (not render); wall-clock time is the debounce source
    const now = Date.now();
    if (lastScanRef.current.code === code && now - lastScanRef.current.at < 2000) return;
    lastScanRef.current = { code, at: now };
    const existingIdx = itemsRef.current.findIndex(
      (i) => i.barcode && i.barcode === code,
    );
    // Skipped or deferred earlier this session and still not in the
    // list: stay silent, or the same box re-triggers every few seconds.
    if (existingIdx < 0 && dismissedRef.current.has(code)) return;
    beep();
    try {
      navigator.vibrate?.(60);
    } catch {
      // vibration is a nicety, not a requirement
    }
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    setSessionAdded((n) => n + 1);
    if (existingIdx >= 0) {
      const existing = itemsRef.current[existingIdx];
      updateItem(existingIdx, { qty: existing.qty + 1 });
      addSessionEntry(existing.name || code, 1, existing.price);
      setStatus(`Added one more: ${existing.name || code}`);
      return;
    }
    if (queueRef.current.includes(code)) {
      setStatus('Already scanned — it is waiting in the review list.');
      return;
    }
    // New item — Sam's Club style: resolve it right now. The lookup
    // runs and the confirm card opens with whatever it found (or the
    // type-it-in form when nothing recognizes the code).
    setStatus('Looking up the barcode…');
    void lookupBarcode(code).then((found) => {
      lookupCacheRef.current.set(code, found);
      openPendingFor(code, found);
    });
  };

  /**
   * Fallback for barcodes the live camera can't resolve (small codes on
   * shiny perfume boxes): decode from a still photo instead. The phone's
   * camera app gives full resolution plus tap-to-focus, which is exactly
   * what those boxes need. The photo is tried at all four rotations, so
   * a barcode photographed sideways decodes too.
   */
  const scanPhoto = async (file: File) => {
    setBusy(true);
    setStatus('Reading the photo…');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('image load failed'));
        img.src = url;
      });
      const reader = await makeBarcodeReader();
      for (const deg of [0, 90, 270, 180] as const) {
        const canvas = drawRotated(img, img.naturalWidth, img.naturalHeight, deg, 2048);
        try {
          const result = await reader.decodeFromCanvas(canvas);
          beep();
          await handleCode(result.getText());
          return;
        } catch {
          // nothing at this rotation — try the next
        }
      }
      setStatus(
        'No barcode found in that photo. Get closer so the barcode fills the picture, keep the box flat, and tilt it a little to dodge the glare — or type the number below.',
      );
    } catch {
      setStatus(
        'No barcode found in that photo. Get closer so the barcode fills the picture, keep the box flat, and tilt it a little to dodge the glare — or type the number below.',
      );
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  };

  /**
   * Any-direction sweep for the live camera. The continuous reader only
   * scans horizontally, so while it works a few times a second this
   * snapshots the current frame, turns it 90° and 270°, and tries
   * again — a sideways barcode gets its chance without her having to
   * rotate the box. Hits go through the same onScan path as a normal
   * read (debounce, +1, confirm card), and the sweep stands down while
   * a confirm card is open.
   */
  const sweepRotatedFrame = async () => {
    if (sweepBusyRef.current || pendingRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return;
    sweepBusyRef.current = true;
    try {
      if (!sweepReaderRef.current) {
        sweepReaderRef.current = await makeBarcodeReader();
      }
      const reader = sweepReaderRef.current;
      for (const deg of [90, 270] as const) {
        const canvas = drawRotated(video, video.videoWidth, video.videoHeight, deg, 1280);
        try {
          const result = await reader.decodeFromCanvas(canvas);
          onScan(result.getText());
          break;
        } catch {
          // nothing readable at this angle — try the other
        }
      }
    } catch {
      // best-effort only — the main reader keeps running regardless
    } finally {
      sweepBusyRef.current = false;
    }
  };

  const startScanner = async () => {
    setStatus(null);
    setPending(null);
    // The <video> element is always mounted (hidden while idle), so the
    // ref is valid here. The previous version rendered it only while
    // `scanning` was true and read the ref synchronously right after
    // setScanning(true) — before React re-rendered — so the reader got
    // no video element and the preview stayed black: scanning never
    // really started. Fixed 2026-10-12.
    const video = videoRef.current;
    if (!video) {
      setStatus('Scanner is not ready — reload the page and try again.');
      return;
    }
    try {
      const reader = await makeBarcodeReader();
      const onResult = (
        result: { getText: () => string } | undefined,
        _error: unknown,
        _c: IScannerControls,
      ) => {
        // Continuous mode: never stop on a read — onScan decides what
        // the code means (instant add vs. review queue).
        if (result) onScan(result.getText());
      };
      setSessionAdded(0);
      setSessionItems([]);
      dismissedRef.current = new Set<string>();
      lastScanRef.current = { code: '', at: 0 };
      setScanning(true);
      let controls: IScannerControls;
      try {
        // Rear camera explicitly — with no constraint, phones may open
        // the front (selfie) camera, which is useless for barcodes.
        controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: 'environment',
              // Ask for a high-resolution stream: small perfume-box
              // barcodes are only a handful of pixels across at 480p,
              // which is why the default stream never resolved them.
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
          video,
          onResult,
        );
      } catch {
        // A device that refuses the rear-camera constraint (e.g. a
        // single-webcam laptop) falls back to any available camera.
        controls = await reader.decodeFromVideoDevice(undefined, video, onResult);
      }
      controlsRef.current = controls;
      // Start the any-direction sweep alongside the main reader.
      if (sweepTimerRef.current) clearInterval(sweepTimerRef.current);
      sweepTimerRef.current = setInterval(() => void sweepRotatedFrame(), 650);
    } catch {
      setScanning(false);
      setStatus(
        'Camera could not start. Allow camera access, or type the barcode number below instead.',
      );
    }
  };

  /** After a save: if the item came from the review queue, open the next. */
  const afterSave = (barcode: string) => {
    if (barcode && queueRef.current.includes(barcode)) {
      dropFromQueue(barcode);
      void advanceReview();
    }
  };

  const savePending = async () => {
    if (!pending) return;
    if (!pending.name.trim()) {
      setStatus('Give the product a name before saving.');
      return;
    }
    if (!pending.category) {
      setStatus('Pick a category (Fragrance, Skincare, or Makeup) before saving — the website needs it to place the product.');
      return;
    }
    const price =
      pending.price.trim() === '' ? null : Number.parseFloat(pending.price);
    const newItem: InvItem = {
      barcode: pending.barcode,
      name: pending.name.trim(),
      brand: pending.brand.trim(),
      size: pending.size.trim(),
      price: price !== null && Number.isFinite(price) ? price : null,
      qty: Math.max(1, Math.floor(pending.qty) || 1),
      category: pending.category,
      audience: pending.audience,
    };
    if (mode === 'db') {
      setBusy(true);
      try {
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: newItem }),
        });
        if (!res.ok) throw new Error('save failed');
        const saved = normalizeItem(
          ((await res.json()) as { item: Partial<InvItem> }).item,
        );
        setItems((prev) => [
          saved,
          ...prev.filter((i) => i.id !== saved.id),
        ]);
        setStatus(`Saved: ${saved.name}`);
        dismissedRef.current.delete(saved.barcode);
        if (scanning) addSessionEntry(saved.name, saved.qty, saved.price);
        setPending(null);
        afterSave(saved.barcode);
      } catch {
        setStatus(
          'Could not save to the database — check the connection and tap Save again. Nothing was lost; the form is still filled in.',
        );
      } finally {
        setBusy(false);
      }
      return;
    }
    setItems((prev) => [newItem, ...prev]);
    setStatus(`Saved: ${newItem.name}`);
    dismissedRef.current.delete(newItem.barcode);
    if (scanning) addSessionEntry(newItem.name, newItem.qty, newItem.price);
    setPending(null);
    afterSave(newItem.barcode);
  };

  const updateItem = (idx: number, patch: Partial<InvItem>) => {
    const target = items[idx];
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    if (target?.id) scheduleSave(target.id);
  };

  const removeItem = (idx: number) => {
    const target = items[idx];
    setItems((prev) => prev.filter((_, i) => i !== idx));
    if (mode === 'db' && target?.id) {
      void fetch('/api/inventory', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: target.id }),
      }).then((r) => {
        if (!r.ok) {
          setStatus('That item could not be removed from the database — reload the page to check.');
        }
      });
    }
  };

  const totalUnits = items.reduce((s, i) => s + i.qty, 0);
  const totalValue = items.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0);
  const today = new Date().toISOString().slice(0, 10);

  const exportCsv = () => {
    const esc = (v: string | number | null) => {
      const s = v === null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      'barcode,name,brand,size,price,quantity,category,audience',
      ...items.map((i) =>
        [i.barcode, i.name, i.brand, i.size, i.price ?? '', i.qty, i.category, i.audience]
          .map(esc)
          .join(','),
      ),
    ];
    download(`roxanne-inventory-${today}.csv`, rows.join('\n'), 'text/csv');
  };

  const exportJson = () =>
    download(
      `roxanne-inventory-${today}.json`,
      JSON.stringify(items, null, 2),
      'application/json',
    );

  if (mode === 'checking') {
    return (
      <div className="mt-6">
        <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Loading the inventory…
        </p>
      </div>
    );
  }

  if (mode === 'locked') {
    return (
      <div className="mt-6">
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">
            Staff only
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            The inventory lives in the shop database now. Enter the staff
            passcode to open it — you only do this once on each phone.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && passcode) void unlock();
              }}
              placeholder="Passcode"
              autoComplete="off"
              className={inputCls}
              aria-label="Inventory passcode"
            />
            <button
              onClick={() => void unlock()}
              disabled={busy || !passcode}
              className="shrink-0 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-rose-600"
            >
              Unlock
            </button>
          </div>
          {status && (
            <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-800 dark:bg-stone-800 dark:text-rose-200">
              {status}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Scanner */}
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="p-4">
          {/* Always mounted so videoRef is valid before the camera starts;
              hidden while idle. */}
          <div className={scanning && !pending ? '' : 'hidden'}>
            <div className="relative">
              <video
                ref={videoRef}
                className="aspect-[4/3] w-full rounded-2xl bg-black object-cover"
                muted
                playsInline
              />
              {/* Viewfinder frame + success flash, Scan & Go style. */}
              <div className="pointer-events-none absolute inset-x-10 inset-y-8 rounded-2xl border-2 border-white/70" />
              {flash && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-emerald-400/30" />
              )}
            </div>
            <p className="mt-3 text-center text-sm text-stone-500 dark:text-stone-400">
              Point the camera at each barcode and keep going — items already
              in the list add instantly, and a new item pops up its details to
              check and save. Barcodes can face any direction, sideways
              included. Hold boxes flat, 4–6 inches away, and tilt shiny
              wrappers slightly so they don&apos;t reflect the light.
            </p>
            <p className="mt-2 text-center text-sm font-semibold text-stone-700 dark:text-stone-200">
              Scanned this session: {sessionAdded}
              {reviewQueue.length > 0 &&
                ` · ${reviewQueue.length} new item${reviewQueue.length > 1 ? 's' : ''} to review`}
            </p>
            {sessionItems.length > 0 && (
              <div className="mt-3 rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/60">
                <ul className="space-y-1">
                  {sessionItems.slice(0, 6).map((e) => (
                    <li
                      key={e.name}
                      className="flex items-baseline justify-between gap-3 text-sm text-stone-700 dark:text-stone-200"
                    >
                      <span className="min-w-0 truncate">
                        {e.name}{' '}
                        <span className="text-stone-400">×{e.qty}</span>
                      </span>
                      <span className="shrink-0 font-medium">
                        ${((e.price ?? 0) * e.qty).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 border-t border-stone-200 pt-2 text-sm font-semibold text-stone-800 dark:border-stone-700 dark:text-stone-100">
                  Session total: $
                  {sessionItems
                    .reduce((s, e) => s + (e.price ?? 0) * e.qty, 0)
                    .toFixed(2)}
                  <span className="font-normal text-stone-500 dark:text-stone-400">
                    {' '}
                    · {sessionItems.reduce((s, e) => s + e.qty, 0)} units
                  </span>
                </p>
              </div>
            )}
            <button
              onClick={stopScanner}
              className="mt-3 w-full rounded-full border border-stone-300 py-3 text-sm font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200"
            >
              {reviewQueue.length > 0
                ? `Stop & review ${reviewQueue.length} new item${reviewQueue.length > 1 ? 's' : ''}`
                : 'Stop camera'}
            </button>
          </div>
          {!scanning && (
            <button
              onClick={() => void startScanner()}
              disabled={busy}
              className="w-full rounded-full bg-stone-900 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:opacity-50 dark:bg-rose-600 dark:hover:bg-rose-500"
            >
              📷 Start scanning
            </button>
          )}

          {/* Manual entry */}
          <div className="mt-4 flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              inputMode="numeric"
              placeholder="…or type the barcode number"
              className={inputCls}
              aria-label="Barcode number"
            />
            <button
              onClick={() => {
                const code = manualCode.trim();
                if (code) {
                  setManualCode('');
                  void handleCode(code);
                }
              }}
              disabled={busy || !manualCode.trim()}
              className="shrink-0 rounded-xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200"
            >
              Look up
            </button>
          </div>
          {/* Photo fallback for stubborn barcodes (small codes, shiny wrap) */}
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            aria-label="Take a photo of a barcode"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void scanPhoto(f);
            }}
          />
          <button
            onClick={() => photoRef.current?.click()}
            disabled={busy}
            className="mt-3 w-full rounded-full border border-stone-300 py-3 text-sm font-semibold text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200"
          >
            📸 Barcode won&apos;t scan? Take a photo of it instead
          </button>
          <button
            onClick={() => {
              stopScanner();
              setPending({ barcode: '', name: '', brand: '', size: '', price: '', qty: 1, category: '', audience: 'unisex', priceHints: [] });
              setStatus('Adding an item with no barcode — fill in the name.');
            }}
            className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400"
          >
            + Add an item with no barcode
          </button>

          {status && (
            <p className="mt-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-800 dark:bg-stone-800 dark:text-rose-200">
              {status}
            </p>
          )}
        </div>

        {/* Pending item form */}
        {pending && (
          <div className="border-t border-stone-200 p-4 dark:border-stone-800">
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-50">
              {pending.barcode ? `Barcode ${pending.barcode}` : 'New item'}
            </p>
            <div className="mt-3 space-y-3">
              <input
                value={pending.name}
                onChange={(e) => setPending({ ...pending, name: e.target.value })}
                placeholder="Product name *"
                className={inputCls}
                aria-label="Product name"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={pending.category}
                  onChange={(e) =>
                    setPending({ ...pending, category: e.target.value as InvCategory | '' })
                  }
                  className={inputCls}
                  aria-label="Category"
                >
                  <option value="">Category * — choose…</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <select
                  value={pending.audience}
                  onChange={(e) =>
                    setPending({ ...pending, audience: e.target.value as InvAudience })
                  }
                  className={inputCls}
                  aria-label="Who it is for"
                >
                  {AUDIENCE_OPTIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={pending.brand}
                  onChange={(e) => setPending({ ...pending, brand: e.target.value })}
                  placeholder="Brand"
                  className={inputCls}
                  aria-label="Brand"
                />
                <input
                  value={pending.size}
                  onChange={(e) => setPending({ ...pending, size: e.target.value })}
                  placeholder="Size (e.g. 50 ml)"
                  className={inputCls}
                  aria-label="Size"
                />
                <input
                  value={pending.price}
                  onChange={(e) => setPending({ ...pending, price: e.target.value })}
                  inputMode="decimal"
                  placeholder="Price ($)"
                  className={inputCls}
                  aria-label="Price in dollars"
                />
                <div className="flex items-center gap-3">
                  <span className="text-sm text-stone-500 dark:text-stone-400">Qty</span>
                  <button
                    onClick={() => setPending({ ...pending, qty: Math.max(1, pending.qty - 1) })}
                    className="h-10 w-10 rounded-full border border-stone-300 text-lg dark:border-stone-700"
                    aria-label="One less"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold">{pending.qty}</span>
                  <button
                    onClick={() => setPending({ ...pending, qty: pending.qty + 1 })}
                    className="h-10 w-10 rounded-full border border-stone-300 text-lg dark:border-stone-700"
                    aria-label="One more"
                  >
                    +
                  </button>
                </div>
              </div>
              {pending.priceHints.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                    Selling online at — tap one to use it as the price:
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {pending.priceHints.map((h) => (
                      <button
                        key={h.merchant}
                        onClick={() =>
                          setPending({ ...pending, price: h.price.toFixed(2) })
                        }
                        className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200"
                      >
                        ${h.price.toFixed(2)} · {h.merchant}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => void savePending()}
                  className="flex-1 rounded-full bg-stone-900 py-3 text-sm font-semibold text-white hover:bg-stone-700 dark:bg-rose-600 dark:hover:bg-rose-500"
                >
                  Save to inventory
                </button>
                {scanning && pending.barcode && (
                  <button
                    onClick={() => {
                      const code = pending.barcode;
                      if (!queueRef.current.includes(code)) {
                        queueRef.current = [...queueRef.current, code];
                        setReviewQueue(queueRef.current);
                      }
                      dismissedRef.current.add(code);
                      setPending(null);
                      setStatus('Set aside — review it when you stop scanning.');
                    }}
                    className="rounded-full border border-stone-300 px-4 text-sm font-semibold text-stone-600 dark:border-stone-700 dark:text-stone-300"
                  >
                    Review later
                  </button>
                )}
                <button
                  onClick={() => {
                    const code = pending.barcode;
                    setPending(null);
                    if (code && queueRef.current.includes(code)) {
                      // Skipping a queued item: drop it and move to the next.
                      dropFromQueue(code);
                      setStatus('Skipped — not added to the list.');
                      void advanceReview();
                    } else if (code && scanning) {
                      // Skipped mid-scan: don't let the same box, still
                      // sitting in front of the camera, reopen the card.
                      dismissedRef.current.add(code);
                      setStatus('Skipped — keep scanning.');
                    }
                  }}
                  className="rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-600 dark:border-stone-700 dark:text-stone-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {mode === 'local' && (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-stone-800 dark:text-amber-200">
          Saving to this phone only — the shop database isn&apos;t connected
          yet, so this list doesn&apos;t appear anywhere else.
        </p>
      )}

      {/* Summary + export */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          <strong className="text-stone-900 dark:text-stone-50">{items.length}</strong>{' '}
          products · <strong className="text-stone-900 dark:text-stone-50">{totalUnits}</strong>{' '}
          units ·{' '}
          <strong className="text-stone-900 dark:text-stone-50">
            ${totalValue.toFixed(2)}
          </strong>{' '}
          total value
        </p>
        {items.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200"
            >
              Export CSV
            </button>
            <button
              onClick={exportJson}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200"
            >
              Export JSON
            </button>
            <button
              onClick={() => {
                if (!window.confirm('Clear the whole inventory list?')) return;
                if (mode === 'db') {
                  void fetch('/api/inventory', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ all: true }),
                  }).then((r) => {
                    if (r.ok) {
                      setItems([]);
                      setStatus('Inventory cleared.');
                    } else {
                      setStatus('Could not clear the database list — try again.');
                    }
                  });
                } else {
                  setItems([]);
                  setStatus('Inventory cleared.');
                }
              }}
              className="rounded-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Nothing scanned yet. Tap “Start scanning” and point the camera at a
          product barcode.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-stone-200 rounded-3xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
          {items.map((item, idx) => (
            <li key={`${item.barcode}-${idx}`} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-50">{item.name}</p>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    {[item.brand, item.size, item.barcode ? `UPC ${item.barcode}` : 'no barcode']
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-stone-400 hover:text-red-500"
                  aria-label={`Remove ${item.name}`}
                >
                  ✕
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <select
                  value={item.category}
                  onChange={(e) =>
                    updateItem(idx, { category: e.target.value as InvCategory | '' })
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-rose-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  aria-label={`Category for ${item.name}`}
                >
                  <option value="">Category — choose…</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <select
                  value={item.audience}
                  onChange={(e) =>
                    updateItem(idx, { audience: e.target.value as InvAudience })
                  }
                  className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 outline-none focus:border-rose-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                  aria-label={`Who ${item.name} is for`}
                >
                  {AUDIENCE_OPTIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              {item.category === '' && (
                <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                  Pick a category above — without one, this item can&apos;t go on the website yet.
                </p>
              )}
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateItem(idx, { qty: Math.max(1, item.qty - 1) })}
                    className="h-8 w-8 rounded-full border border-stone-300 dark:border-stone-700"
                    aria-label="One less"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-semibold">{item.qty}</span>
                  <button
                    onClick={() => updateItem(idx, { qty: item.qty + 1 })}
                    className="h-8 w-8 rounded-full border border-stone-300 dark:border-stone-700"
                    aria-label="One more"
                  >
                    +
                  </button>
                </div>
                <label className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                  $
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={item.price ?? ''}
                    onChange={(e) => {
                      const v = e.target.value === '' ? null : Number.parseFloat(e.target.value);
                      updateItem(idx, { price: v !== null && Number.isFinite(v) ? v : null });
                    }}
                    placeholder="0.00"
                    className="w-24 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-stone-900 outline-none focus:border-rose-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                    aria-label={`Price for ${item.name}`}
                  />
                </label>
                <span className="ml-auto text-sm font-medium text-stone-700 dark:text-stone-200">
                  ${((item.price ?? 0) * item.qty).toFixed(2)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-stone-400 dark:text-stone-500">
        {mode === 'db'
          ? 'This list is saved in the shop\u2019s inventory database — it is the same list on every phone or computer that unlocks this page. Product names and online price suggestions come from Open Beauty Facts / Open Food Facts / UPCitemdb; the price that counts is always the one entered here.'
          : 'The list lives in this phone\u2019s browser — it survives closing the page, but use the same browser each time and export a copy when you finish a session. Barcode names come from Open Beauty Facts / Open Food Facts; anything unrecognized can be typed in by hand.'}
      </p>
    </div>
  );
}
