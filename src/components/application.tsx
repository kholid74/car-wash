"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, CalendarDays, CarFront, ChevronDown, ClipboardList, Droplets, ExternalLink, LayoutDashboard, ListOrdered, Menu, Monitor, Plus, ReceiptText, Settings, SlidersHorizontal, Users, X } from "lucide-react";
import { DemoProvider, useDemo } from "@/lib/store";
import { demoNow, fullDateLabel } from "@/lib/domain";
import { Dashboard, Reports } from "./dashboard";
import { CheckIn, InspectionPage, ServiceSelection, Confirmation } from "./check-in";
import { QueuePage, WorkOrderDetail, QueueDisplay, Cashier } from "./operations";
import { VehiclesPage, VehicleDetail, CustomersPage, CustomerDetail, TransactionsPage, ServicesPage, SettingsPage } from "./records";
import { EmptyState } from "./ui";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/check-in", label: "Check-in", icon: Plus },
  { href: "/queue", label: "Antrian", icon: ListOrdered },
  { href: "/transactions", label: "Transaksi", icon: ReceiptText },
  { href: "/vehicles", label: "Kendaraan", icon: CarFront },
  { href: "/customers", label: "Pelanggan", icon: Users },
  { href: "/services", label: "Layanan & Harga", icon: SlidersHorizontal },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
];
export default function Application() { return <DemoProvider><AppRouter /></DemoProvider>; }
function AppRouter() {
  const pathname = usePathname();
  const { state } = useDemo();
  const [menu, setMenu] = useState(false);
  const segments = pathname.split("/").filter(Boolean);
  const [route, id] = segments;
  if (pathname === "/display/queue") return <QueueDisplay />;
  let page;
  switch (route) {
    case undefined: case "dashboard": page = <Dashboard />; break;
    case "check-in": page = <CheckIn />; break;
    case "inspection": page = <InspectionPage key={id} id={id} />; break;
    case "service-selection": page = <ServiceSelection key={id} id={id} />; break;
    case "confirmation": page = <Confirmation key={id} id={id} />; break;
    case "queue": page = <QueuePage />; break;
    case "work-orders": page = <WorkOrderDetail key={id} id={id} />; break;
    case "cashier": page = <Cashier key={id} id={id} />; break;
    case "vehicles": page = id ? <VehicleDetail key={id} id={id} /> : <VehiclesPage />; break;
    case "customers": page = id ? <CustomerDetail key={id} id={id} /> : <CustomersPage />; break;
    case "transactions": page = id ? <WorkOrderDetail id={state.transactions.find(t => t.id === id)?.workOrderId ?? ""} /> : <TransactionsPage />; break;
    case "services": page = <ServicesPage />; break;
    case "reports": page = <Reports />; break;
    case "settings": page = <SettingsPage />; break;
    default: page = <EmptyState title="Halaman tidak ditemukan"><Link href="/" className="button primary">Kembali ke Dashboard</Link></EmptyState>;
  }
  const activeLabel = nav.find(n => n.href === `/${route ?? ""}`)?.label ?? ({ settings: "Pengaturan", inspection: "Inspeksi Kendaraan", "service-selection": "Pilihan Layanan", confirmation: "Konfirmasi", "work-orders": "Detail Pengerjaan", cashier: "Pembayaran" }[route ?? ""] || "Operasional");
  return <div className="app-shell">
    {menu && <button className="drawer-backdrop" aria-label="Tutup navigasi" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? "open" : ""}`}>
      <Link href="/" className="brand" onClick={() => setMenu(false)}><span className="brand-symbol"><Droplets size={24} /></span><span>Kalsara<span className="brand-subtitle">CAR WASH</span></span></Link>
      <button className="icon-button drawer-close" onClick={() => setMenu(false)} aria-label="Tutup navigasi"><X size={20} /></button>
      <div className="outlet-card"><div className="outlet-icon"><CarFront size={20} /></div><div><strong>Car Wash Demo</strong><small>Tangerang Selatan</small></div><ChevronDown size={15} /></div>
      <div className="nav-label">MENU UTAMA</div>
      <nav aria-label="Navigasi utama">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenu(false)} aria-current={(href === "/" ? !route || route === "dashboard" : pathname.startsWith(href)) ? "page" : undefined} className={`nav-item ${(href === "/" ? !route || route === "dashboard" : pathname.startsWith(href)) ? "active" : ""}`}><Icon size={19} /><span>{label}</span>{href === "/queue" && <small className="nav-count">{state.orders.filter(o => ["QUEUED", "WASHING", "QUALITY_CHECK", "READY"].includes(o.status)).length}</small>}</Link>)}</nav>
      <div className="nav-label secondary-label">LAINNYA</div>
      <Link className="nav-item" href="/display/queue" target="_blank"><Monitor size={19} /><span>Layar Antrean</span><ExternalLink size={13} /></Link>
      <Link className={`nav-item ${route === "settings" ? "active" : ""}`} href="/settings" onClick={() => setMenu(false)}><Settings size={19} /><span>Pengaturan</span></Link>
      <div className="sidebar-bottom"><div className="demo-info"><span className="demo-badge">DEMO</span><p>Prototype untuk validasi<br />alur operasional.</p></div><div className="operator"><span className="avatar">AD</span><div><strong>Admin Demo</strong><small>Kasir & Operasional</small></div><span className="online-dot" /></div></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="topbar-start"><button className="icon-button menu-toggle" aria-label="Buka navigasi" onClick={() => setMenu(true)}><Menu size={22} /></button><span>Operasional</span><span className="breadcrumb-slash">/</span><strong>{activeLabel}</strong></div><div className="topbar-end"><span className="date-chip"><CalendarDays size={15} />{fullDateLabel(demoNow())}</span><span className="topbar-divider" /><span className="live-label"><span className="online-dot" />Operasional aktif</span><span className="avatar small">AD</span></div></header>
      <main key={pathname} className="main-content">{page}</main>
      <footer className="app-footer"><span>Concept Prototype by <strong>Kalsara Digital Studio</strong></span><span><ClipboardList size={12} />Data ilustrasi · {fullDateLabel(demoNow())}</span></footer>
    </div>
  </div>;
}
