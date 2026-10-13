'use client';

import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';

type InvCategory = 'fragrance' | 'skincare' | 'makeup';
type InvAudience = 'women' | 'men' | 'unisex';

interface InvItem {
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

interface PendingItem {
  barcode: string;
  name: string;
  brand: string;
  size: string;
  price: string;
  qty: number;
  category: InvCategory | '';
  audience: InvAudience;
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

async function lookupBarcode(
  code: string,
): Promise<{ name: string; brand: string; size: string; category: InvCategory | '' } | null> {
  // Open Beauty Facts first (cosmetics), Open Food Facts as a fallback —
  // both are free, keyless, and CORS-friendly.
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
        };
      }
    } catch {
      // try the next source
    }
  }
  return null;
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

export default function InventoryScanner() {
  const [items, setItems] = useState<InvItem[]>([]);
  const [pending, setPending] = useState<PendingItem | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const loadedRef = useRef(false);

  // Load the saved list once, then persist every change. localStorage is a
  // client-only external store: reading it after mount (not during render)
  // is deliberate, so the prerendered page and first client render agree.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load from localStorage after mount (see comment above)
      if (raw) {
        // Normalize lists saved before category/audience existed.
        const parsed = JSON.parse(raw) as Partial<InvItem>[];
        setItems(
          parsed.map((i) => ({
            barcode: i.barcode ?? '',
            name: i.name ?? '',
            brand: i.brand ?? '',
            size: i.size ?? '',
            price: i.price ?? null,
            qty: i.qty ?? 1,
            category: i.category ?? '',
            audience: i.audience ?? 'unisex',
          })),
        );
      }
    } catch {
      // corrupted storage — start fresh
    }
    loadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {
      // storage full/blocked — list still works for this session
    }
  }, [items]);

  const stopScanner = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => controlsRef.current?.stop(), []);

  const handleCode = async (code: string) => {
    const existing = items.findIndex((i) => i.barcode && i.barcode === code);
    if (existing >= 0) {
      setItems((prev) =>
        prev.map((it, i) => (i === existing ? { ...it, qty: it.qty + 1 } : it)),
      );
      setStatus(`Already in the list — added one more: ${items[existing].name}`);
      return;
    }
    setBusy(true);
    setStatus('Looking up the barcode…');
    const found = await lookupBarcode(code);
    setBusy(false);
    setPending({
      barcode: code,
      name: found?.name ?? '',
      brand: found?.brand ?? '',
      size: found?.size ?? '',
      price: '',
      qty: 1,
      category: found?.category ?? '',
      audience: 'unisex',
    });
    setStatus(
      found
        ? 'Found it — check the details, add the price, then save.'
        : 'Barcode not recognized — type the product name in, then save.',
    );
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
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      const onResult = (
        result: { getText: () => string } | undefined,
        _error: unknown,
        c: IScannerControls,
      ) => {
        if (result) {
          c.stop();
          controlsRef.current = null;
          setScanning(false);
          beep();
          void handleCode(result.getText());
        }
      };
      setScanning(true);
      let controls: IScannerControls;
      try {
        // Rear camera explicitly — with no constraint, phones may open
        // the front (selfie) camera, which is useless for barcodes.
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' }, audio: false },
          video,
          onResult,
        );
      } catch {
        // A device that refuses the rear-camera constraint (e.g. a
        // single-webcam laptop) falls back to any available camera.
        controls = await reader.decodeFromVideoDevice(undefined, video, onResult);
      }
      controlsRef.current = controls;
    } catch {
      setScanning(false);
      setStatus(
        'Camera could not start. Allow camera access, or type the barcode number below instead.',
      );
    }
  };

  const savePending = () => {
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
    setItems((prev) => [
      {
        barcode: pending.barcode,
        name: pending.name.trim(),
        brand: pending.brand.trim(),
        size: pending.size.trim(),
        price: price !== null && Number.isFinite(price) ? price : null,
        qty: Math.max(1, Math.floor(pending.qty) || 1),
        category: pending.category,
        audience: pending.audience,
      },
      ...prev,
    ]);
    setStatus(`Saved: ${pending.name.trim()}`);
    setPending(null);
  };

  const updateItem = (idx: number, patch: Partial<InvItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

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

  return (
    <div className="mt-6">
      {/* Scanner */}
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="p-4">
          {/* Always mounted so videoRef is valid before the camera starts;
              hidden while idle. */}
          <div className={scanning ? '' : 'hidden'}>
            <video
              ref={videoRef}
              className="aspect-[4/3] w-full rounded-2xl bg-black object-cover"
              muted
              playsInline
            />
            <p className="mt-3 text-center text-sm text-stone-500 dark:text-stone-400">
              Point the camera at a barcode…
            </p>
            <button
              onClick={stopScanner}
              className="mt-3 w-full rounded-full border border-stone-300 py-3 text-sm font-semibold text-stone-700 dark:border-stone-700 dark:text-stone-200"
            >
              Stop camera
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
          <button
            onClick={() => {
              stopScanner();
              setPending({ barcode: '', name: '', brand: '', size: '', price: '', qty: 1, category: '', audience: 'unisex' });
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
              <div className="flex gap-2">
                <button
                  onClick={savePending}
                  className="flex-1 rounded-full bg-stone-900 py-3 text-sm font-semibold text-white hover:bg-stone-700 dark:bg-rose-600 dark:hover:bg-rose-500"
                >
                  Save to inventory
                </button>
                <button
                  onClick={() => setPending(null)}
                  className="rounded-full border border-stone-300 px-5 text-sm font-semibold text-stone-600 dark:border-stone-700 dark:text-stone-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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
                if (window.confirm('Clear the whole inventory list on this phone?')) {
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
        The list lives in this phone&apos;s browser — it survives closing the page,
        but use the same browser each time and export a copy when you finish a
        session. Barcode names come from Open Beauty Facts / Open Food Facts;
        anything unrecognized can be typed in by hand.
      </p>
    </div>
  );
}
