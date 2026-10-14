"use client";

import { createContext, useContext, useState, useSyncExternalStore, useEffect, type ReactNode } from "react";
import { seed } from "./seed";
import type { DemoState } from "./domain";
import { migrateDemoState } from "./migration";
import { ConfirmDialog } from "@/components/ui";

const KEY = "kalsara-car-wash-v1";
const serverSeed = seed();
let snapshot: DemoState | null = null;
let storageIssue = "";
let unreadableData: string | null = null;
const listeners = new Set<() => void>();
function readStore(): DemoState {
  storageIssue = "";
  unreadableData = null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const saved = JSON.parse(raw);
      const migrated = migrateDemoState(saved);
      if (saved.version !== migrated.version) {
        try { localStorage.setItem(KEY, JSON.stringify(migrated)); }
        catch { storageIssue = "Data lama berhasil dibaca, tetapi pembaruan belum tersimpan. Penyimpanan browser penuh atau diblokir."; }
      }
      return migrated;
    }
  } catch { unreadableData = raw; storageIssue = raw !== null ? "Data tersimpan belum dapat dibaca. Data asli tetap dipertahankan." : "Penyimpanan browser tidak tersedia. Perubahan mungkin tidak dapat disimpan."; }
  return seed();
}
function emit() { listeners.forEach(listener => listener()); }
function onStorage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) { snapshot = readStore(); emit(); }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", onStorage); };
}
const getSnapshot = () => snapshot;
const getServerSnapshot = () => serverSeed;
type DemoContextValue = { state: DemoState; update: (fn: (state: DemoState) => DemoState) => void; reset: () => void; notify: (message: string) => void };
const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [message, setMessage] = useState("");
  const [resetDialog, setResetDialog] = useState(false);
  useEffect(() => { snapshot = readStore(); emit(); }, []);
  useEffect(() => { if (message) { const timer = setTimeout(() => setMessage(""), 5000); return () => clearTimeout(timer); } }, [message]);
  function commit(next: DemoState) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { throw new Error("Data belum disimpan. Penyimpanan browser penuh atau diblokir; kurangi foto lalu coba lagi."); }
    snapshot = next;
    storageIssue = "";
    unreadableData = null;
    emit();
  }
  function update(fn: (current: DemoState) => DemoState) {
    if (!snapshot) return;
    if (unreadableData !== null) throw new Error("Data belum dapat dibaca. Unduh salinan sebelum mereset demo.");
    commit(fn(snapshot));
  }
  function reset() { commit(seed()); }
  if (!state) return <div className="loading-screen"><span className="loading-dot" />Menyiapkan operasional...</div>;
  if (unreadableData !== null) return <main className="recovery-page"><h1>Data demo perlu diperiksa</h1><p role="alert">{storageIssue}</p><a className="button secondary" download="car-wash-data-original.json" href={`data:application/json;charset=utf-8,${encodeURIComponent(unreadableData)}`}>Unduh data asli</a><button className="button danger-outline" onClick={() => setResetDialog(true)}>Reset Demo</button>{message && <p role="alert">{message}</p>}{resetDialog && <ConfirmDialog title="Reset semua data demo?" message="Seluruh data tersimpan akan diganti data contoh. Unduh data asli terlebih dahulu bila ingin menyimpannya." label="Ya, Reset Demo" onClose={() => setResetDialog(false)} onConfirm={() => { try { reset(); setResetDialog(false); } catch { setMessage("Data belum dapat disimpan. Periksa izin atau kapasitas penyimpanan browser."); } }} />}</main>;
  return <DemoContext.Provider value={{ state, update, reset, notify: setMessage }}>
    {storageIssue && <div className="storage-warning" role="alert">{storageIssue}</div>}
    {children}
    {message && <div className="toast" role="status">{message}<button onClick={() => setMessage("")} aria-label="Tutup pemberitahuan">Ã—</button></div>}
  </DemoContext.Provider>;
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("DemoProvider diperlukan.");
  return context;
}
