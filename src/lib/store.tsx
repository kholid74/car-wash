"use client";

import { createContext, useContext, useState, useSyncExternalStore, useEffect, type ReactNode } from "react";
import { seed } from "./seed";
import type { DemoState } from "./domain";

const KEY = "kalsara-car-wash-v1";
let snapshot: DemoState | null = null;
let storageIssue = "";
const listeners = new Set<() => void>();
function readStore(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as DemoState;
      if (saved.version === 1 && [saved.vehicles, saved.customers, saved.orders, saved.transactions, saved.services].every(Array.isArray) && saved.settings && Number.isInteger(saved.nextQueue)) return saved;
      storageIssue = "Data demo tidak kompatibel. Data contoh dimuat kembali.";
    }
  } catch { storageIssue = "Penyimpanan browser tidak tersedia atau data rusak. Gunakan Reset Demo bila diperlukan."; }
  return seed();
}
function emit() { listeners.forEach(listener => listener()); }
function onStorage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) { snapshot = readStore(); emit(); }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) { snapshot = readStore(); window.addEventListener("storage", onStorage); }
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", onStorage); };
}
const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;
type DemoContextValue = { state: DemoState; update: (fn: (state: DemoState) => DemoState) => void; notify: (message: string) => void };
const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [message, setMessage] = useState("");
  useEffect(() => { if (message) { const timer = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(timer); } }, [message]);
  function update(fn: (current: DemoState) => DemoState) {
    if (!snapshot) return;
    const next = fn(snapshot);
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { throw new Error("Data belum disimpan. Penyimpanan browser penuh atau diblokir; kurangi foto lalu coba lagi."); }
    snapshot = next;
    emit();
  }
  if (!state) return <div className="loading-screen"><span className="loading-dot" />Menyiapkan operasional...</div>;
  return <DemoContext.Provider value={{ state, update, notify: setMessage }}>
    {storageIssue && <div className="storage-warning" role="alert">{storageIssue}</div>}
    {children}
    {message && <div className="toast" role="status">{message}<button onClick={() => setMessage("")} aria-label="Tutup pemberitahuan">×</button></div>}
  </DemoContext.Provider>;
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("DemoProvider diperlukan.");
  return context;
}
