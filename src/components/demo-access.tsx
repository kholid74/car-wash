"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { ArrowRight } from "@/components/icon";
import { ErrorMessage } from "./ui";
import { BrandLogo } from "./brand";

const SESSION_KEY = "kalsara-demo-session";
const SESSION_EVENT = "kalsara-session-change";
function subscribe(listener: () => void) {
  window.addEventListener(SESSION_EVENT, listener);
  return () => window.removeEventListener(SESSION_EVENT, listener);
}
function readSession() {
  try { return sessionStorage.getItem(SESSION_KEY) === "admin"; }
  catch { return false; }
}
function nextPage() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && /^\/admin(?:\/[a-zA-Z0-9_-]+)*$/.test(next) && next !== "/admin/login" ? next : "/admin";
}
export function logoutDemo() {
  sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

// shortcut: sessionStorage gates the showcase UI only; replace with server authentication before using real data.
export function DemoAccess({ children }: { children: ReactNode }) {
  const authenticated = useSyncExternalStore(subscribe, readSession, () => null);
  const pathname = usePathname();
  const router = useRouter();
  const login = pathname === "/admin/login";
  useEffect(() => {
    if (authenticated === false && !login) router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    if (authenticated === true && login) router.replace(nextPage());
  }, [authenticated, login, pathname, router]);
  if (authenticated === null || (!authenticated && !login) || (authenticated && login)) {
    return <div className="loading-screen" role="status">Menyiapkan ruang operasional...</div>;
  }
  return authenticated ? children : <DemoLogin />;
}

function DemoLogin() {
  const [error, setError] = useState("");
  function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (String(form.get("email")).trim().toLowerCase() !== "admin@klautocare.demo" || form.get("password") !== "demo123") {
      setError("Gunakan email dan kata sandi demo yang tercantum di bawah.");
      return;
    }
    try {
      sessionStorage.setItem(SESSION_KEY, "admin");
      window.dispatchEvent(new Event(SESSION_EVENT));
    } catch { setError("Penyimpanan browser diblokir. Aktifkan penyimpanan untuk masuk ke demo."); }
  }
  return <main className="login-page">
    <section className="login-story"><Link href="/" className="public-brand"><BrandLogo /></Link><div><span className="eyebrow">RUANG OPERASIONAL</span><h1>Setiap detail.<br />Dalam kendali.</h1><p>Dari kendaraan datang hingga kembali ke jalan. Satu tempat untuk menjaga kualitas setiap perawatan.</p></div><span>DIGITAL EXPERIENCE BY KALSARA</span></section>
    <section className="login-form"><span className="demo-badge">AKSES DEMO</span><h2>Selamat datang kembali</h2><p>Masuk untuk menjelajahi operasional KL Autocare.</p><form onSubmit={login}><label>Email<input type="email" name="email" autoComplete="username" required placeholder="admin@klautocare.demo" /></label><label>Kata sandi<input type="password" name="password" autoComplete="current-password" required placeholder="Masukkan kata sandi demo" /></label><ErrorMessage message={error} /><button className="button primary full-width" type="submit">Masuk ke dashboard<ArrowRight size={17} /></button></form><div className="login-credentials"><strong>Akun untuk mencoba</strong><span>admin@klautocare.demo</span><span>Kata sandi: <b>demo123</b></span></div><p className="small-muted">Login simulasi untuk showcase. Gunakan data fiktif; sesi berlaku di tab ini.</p><Link className="text-link" href="/">Kembali ke website</Link></section>
  </main>;
}
