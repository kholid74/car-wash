"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BadgePercent, BarChart3, Bell, Building2, CalendarDays, CarFront, ClipboardList, CreditCard, ExternalLink, Globe, LayoutDashboard, ListOrdered, LogOut, Menu, MessageSquare, Monitor, Package, Plus, ReceiptText, Settings, Shield, ShieldCheck, SlidersHorizontal, Tag, Users, Wallet, X } from "@/components/icon";
import { DemoProvider, useDemo } from "@/lib/store";
import { branchOperations, demoNow, fullDateLabel, selectBranch } from "@/lib/domain";
import { Dashboard, Reports } from "./dashboard";
import { ReservationsPage } from "./reservations";
import { CheckIn, InspectionPage, ServiceSelection, Confirmation } from "./check-in";
import { QueuePage, WorkOrderDetail, WorkOrderList, Cashier } from "./operations";
import { VehiclesPage, VehicleDetail, CustomersPage, CustomerDetail, TransactionsPage, ServicesPage, SettingsPage } from "./records";
import { EmptyState, errorText } from "./ui";
import { BrandLogo } from "./brand";
import { DemoAccess, logoutDemo } from "./demo-access";
import { BranchesPage, CommissionsPage, EmployeesPage, ExpensesPage, InventoryPage, MembershipPage, SecondaryModulesPage } from "./business";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "OVERVIEW & OPERASIONAL" },
  { href: "/admin/cashier", label: "POS / Kasir", icon: Wallet, group: "OVERVIEW & OPERASIONAL" },
  { href: "/admin/reservations", label: "Booking", icon: CalendarDays, group: "OVERVIEW & OPERASIONAL" },
  { href: "/admin/check-in", label: "Check-in", icon: Plus, group: "OVERVIEW & OPERASIONAL" },
  { href: "/admin/queue", label: "Antrian", icon: ListOrdered, group: "OVERVIEW & OPERASIONAL" },
  { href: "/admin/work-orders", label: "Work Orders", icon: ClipboardList, group: "OVERVIEW & OPERASIONAL" },
  { href: "/admin/quality-control", label: "Quality Control", icon: ShieldCheck, group: "OVERVIEW & OPERASIONAL" },
  { href: "/admin/transactions", label: "Transaksi", icon: ReceiptText, group: "OVERVIEW & OPERASIONAL" },
  { href: "/admin/customers", label: "Pelanggan", icon: Users, group: "PELANGGAN & LAYANAN" },
  { href: "/admin/membership", label: "Membership", icon: Users, group: "PELANGGAN & LAYANAN" },
  { href: "/admin/vehicles", label: "Kendaraan", icon: CarFront, group: "PELANGGAN & LAYANAN" },
  { href: "/admin/services", label: "Layanan & Harga", icon: SlidersHorizontal, group: "PELANGGAN & LAYANAN" },
  { href: "/admin/feedback", label: "Umpan Balik", icon: MessageSquare, group: "PELANGGAN & LAYANAN" },
  { href: "/admin/reports", label: "Laporan", icon: BarChart3, group: "MANAJEMEN" },
  { href: "/admin/employees", label: "Karyawan", icon: Users, group: "MANAJEMEN" },
  { href: "/admin/commissions", label: "Komisi", icon: BadgePercent, group: "MANAJEMEN" },
  { href: "/admin/inventory", label: "Inventori", icon: Package, group: "MANAJEMEN" },
  { href: "/admin/expenses", label: "Pengeluaran", icon: Wallet, group: "MANAJEMEN" },
  { href: "/admin/branches", label: "Cabang", icon: Building2, group: "MANAJEMEN" },
  { href: "/admin/promotions", label: "Promosi & Voucher", icon: Tag, group: "MANAJEMEN" },
  { href: "/admin/roles", label: "Peran & Hak Akses", icon: Shield, group: "ADMINISTRASI" },
  { href: "/admin/payments", label: "Pengaturan Pembayaran", icon: CreditCard, group: "ADMINISTRASI" },
  { href: "/admin/notifications", label: "Notifikasi", icon: Bell, group: "ADMINISTRASI" },
  { href: "/admin/website", label: "Pengelolaan Website", icon: Globe, group: "ADMINISTRASI" },
  { href: "/admin/settings", label: "Pengaturan", icon: Settings, group: "MANAJEMEN" },
];
export default function Application() { return <DemoAccess><DemoProvider><AppRouter /></DemoProvider></DemoAccess>; }
function AppRouter() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, update, notify } = useDemo();
  const operations = branchOperations(state);
  const [menu, setMenu] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const trigger = menuToggle.current;
    const frame = requestAnimationFrame(() => sidebar.current?.querySelector<HTMLAnchorElement>("a")?.focus());
    return () => { cancelAnimationFrame(frame); requestAnimationFrame(() => trigger?.focus()); };
  }, [menu]);
  const segments = pathname.split("/").filter(Boolean).slice(1);
  const [route, id] = segments;
  let page;
  switch (route) {
    case undefined: case "dashboard": page = <Dashboard />; break;
    case "check-in": page = <CheckIn />; break;
    case "inspection": page = <InspectionPage key={id} id={id} />; break;
    case "service-selection": page = <ServiceSelection key={id} id={id} />; break;
    case "confirmation": page = <Confirmation key={id} id={id} />; break;
    case "queue": page = <QueuePage />; break;
    case "reservations": page = <ReservationsPage />; break;
    case "work-orders": page = id ? <WorkOrderDetail key={id} id={id} /> : <WorkOrderList mode="orders" />; break;
    case "cashier": page = id ? <Cashier key={id} id={id} /> : <WorkOrderList mode="cashier" />; break;
    case "quality-control": page = <WorkOrderList mode="quality" />; break;
    case "vehicles": page = id ? <VehicleDetail key={id} id={id} /> : <VehiclesPage />; break;
    case "customers": page = id ? <CustomerDetail key={id} id={id} /> : <CustomersPage />; break;
    case "transactions": page = id ? <WorkOrderDetail id={state.transactions.find(t => t.id === id)?.workOrderId ?? ""} /> : <TransactionsPage />; break;
    case "services": page = <ServicesPage />; break;
    case "reports": page = <Reports />; break;
    case "membership": page = <MembershipPage />; break;
    case "employees": page = <EmployeesPage />; break;
    case "commissions": page = <CommissionsPage />; break;
    case "inventory": page = <InventoryPage />; break;
    case "expenses": page = <ExpensesPage />; break;
    case "branches": page = <BranchesPage />; break;
    case "promotions": page = <SecondaryModulesPage module="promotions" />; break;
    case "feedback": page = <SecondaryModulesPage module="feedback" />; break;
    case "roles": page = <SecondaryModulesPage module="roles" />; break;
    case "payments": page = <SecondaryModulesPage module="payments" />; break;
    case "notifications": page = <SecondaryModulesPage module="notifications" />; break;
    case "website": page = <SecondaryModulesPage module="website" />; break;
    case "settings": page = <SettingsPage />; break;
    default: page = <EmptyState title="Halaman tidak ditemukan"><Link href="/admin" className="button primary">Kembali ke Dashboard</Link></EmptyState>;
  }
  const activeHref = route && route !== "dashboard" ? `/admin/${route}` : "/admin";
  const activeLabel = nav.find(n => n.href === activeHref)?.label ?? ({ inspection: "Inspeksi Kendaraan", "service-selection": "Pilihan Layanan", confirmation: "Konfirmasi" }[route ?? ""] || "Operasional");
  return <div className="app-shell">
    <a className="skip-link" href="#admin-content">Lewati ke konten</a>
    {menu && <button className="drawer-backdrop" aria-label="Tutup navigasi" onClick={() => setMenu(false)} />}
    <aside ref={sidebar} id="admin-navigation" className={`sidebar ${menu ? "open" : ""}`} onKeyDown={e => { if (e.key === "Escape") setMenu(false); }}>
      <Link href="/admin" className="brand" onClick={() => setMenu(false)}><BrandLogo compact /></Link>
      <button className="icon-button drawer-close" onClick={() => setMenu(false)} aria-label="Tutup navigasi"><X size={20} /></button>
      <div className="outlet-card"><div className="outlet-icon"><CarFront size={20} /></div><label className="branch-selector">Cabang aktif<select aria-label="Cabang aktif" value={state.activeBranchId} onChange={event => { try { update(s => selectBranch(s, event.target.value)); router.push("/admin"); setMenu(false); } catch (error) { notify(errorText(error)); } }}>{state.branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label></div>
      <nav aria-label="Navigasi utama">{[...new Set(nav.map(item => item.group))].map(group => <div className="nav-group" key={group}><div className="nav-label">{group}</div>{nav.filter(item => item.group === group).map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenu(false)} aria-current={activeHref === href ? "page" : undefined} className={`nav-item ${activeHref === href ? "active" : ""}`}><Icon size={18} fill={activeHref === href} /><span>{label}</span>{href === "/admin/queue" && <small className="nav-count">{operations.orders.filter(o => ["QUEUED", "WASHING", "QUALITY_CHECK", "READY"].includes(o.status)).length}</small>}{href === "/admin/reservations" && <small className="nav-count">{state.reservations.filter(booking => booking.branchId === state.activeBranchId && booking.status === "PENDING").length}</small>}</Link>)}</div>)}</nav>
      <div className="nav-label secondary-label">LAINNYA</div>
      <Link className="nav-item" href="/display/queue" target="_blank"><Monitor size={19} /><span>Layar Antrean</span><ExternalLink size={13} /></Link>
      <Link className="nav-item" href="/" target="_blank"><ExternalLink size={19} /><span>Website publik</span></Link>
      <div className="sidebar-bottom"><div className="operator"><span className="avatar">AD</span><div><strong>Admin Demo</strong><small>Sesi showcase</small></div><button className="icon-button" aria-label="Keluar dari demo" onClick={() => { try { logoutDemo(); } catch { notify("Sesi belum dapat dihapus. Coba keluar kembali."); } }}><LogOut size={17} /></button></div></div>
    </aside>
    <div className="main-shell" inert={menu}><header className="topbar"><div className="topbar-start"><button ref={menuToggle} className="icon-button menu-toggle" aria-label="Buka navigasi" aria-expanded={menu} aria-controls="admin-navigation" onClick={() => setMenu(true)}><Menu size={22} /></button><span>Operasional</span><span className="breadcrumb-slash">/</span><strong>{activeLabel}</strong></div><div className="topbar-end"><span className="date-chip"><CalendarDays size={15} />{fullDateLabel(demoNow())}</span><span className="demo-badge">DEMO</span></div></header>
      <main id="admin-content" tabIndex={-1} key={`${pathname}:${state.activeBranchId}`} className="main-content">{page}</main>
      <footer className="app-footer"><span>Digital Experience by <strong>Kalsara</strong></span><span><ClipboardList size={12} />Data ilustrasi · {fullDateLabel(demoNow())}</span></footer>
    </div>
  </div>;
}
