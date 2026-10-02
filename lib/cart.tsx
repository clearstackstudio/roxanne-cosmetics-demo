'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { findProduct } from '@/data/products';

export interface CartLine {
  productId: string;
  qty: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (productId: string, qty?: number) => void;
  updateQty: (productId: string, qty: number) => void;
  removeLine: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const value = useMemo<CartContextValue>(() => {
    const add = (productId: string, qty: number = 1) => {
      if (!findProduct(productId)) return;
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === productId);
        if (existing) {
          return prev.map((l) =>
            l.productId === productId ? { ...l, qty: Math.min(99, l.qty + qty) } : l,
          );
        }
        return [...prev, { productId, qty: Math.min(99, Math.max(1, qty)) }];
      });
    };
    const updateQty = (productId: string, qty: number) => {
      setLines((prev) =>
        qty <= 0
          ? prev.filter((l) => l.productId !== productId)
          : prev.map((l) => (l.productId === productId ? { ...l, qty: Math.min(99, qty) } : l)),
      );
    };
    const removeLine = (productId: string) =>
      setLines((prev) => prev.filter((l) => l.productId !== productId));
    const clear = () => setLines([]);

    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((sum, l) => {
      const p = findProduct(l.productId);
      return sum + (p ? p.price * l.qty : 0);
    }, 0);

    return { lines, count, subtotal, add, updateQty, removeLine, clear };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
