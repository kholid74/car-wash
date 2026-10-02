"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowRight, Banknote, CarFront, CheckCheck, Clock3, Droplets, Monitor, Plus, ReceiptText, ShieldCheck, TrendingUp } from "lucide-react";
import { useDemo } from "@/lib/store";
import { dateLabel, dayAt, dayOf, DEMO_DAY, monthLabel, rupiah, shortMonth, timeLabel, vehicleName, type DemoState, type Status, type WorkOrder } from "@/lib/domain";

/** Urutan tahapan pada dashboard: yang sedang dikerjakan lebih dulu, lalu yang menunggu giliran. */
const stageRank = (status: Status) => ["WASHING", "QUALITY_CHECK", "READY", "QUEUED"].indexOf(status);
import { EmptyState, MetricCard, PageHeading, Panel, StatusBadge, VehicleIdentity } from "./ui";

export function TransactionTable({ state, orders, compact = false }: { state: DemoState; orders: WorkOrder[]; compact?: boolean }) {
  if (!orders.length) return <EmptyState title="Belum ada transaksi" description="Transaksi akan muncul setelah layanan dikonfirmasi." />;
  return <div className="table-scroll"><table><thead><tr><th>{compact ? "Kendaraan" : "Transaksi / Tanggal"}</th>{!compact && <th>Kendaraan / Pelanggan</th>}<th>Layanan</th><th>Pembayaran</th><th>Total</th><th>Status</th><th><span className="sr-only">Detail</span></th></tr></thead><tbody>{orders.map(o => {
    const v = state.vehicles.find(v => v.id === o.vehicleId)!;
    const c = state.customers.find(c => c.id === v.customerId)!;
    const t = state.transactions.find(t => t.workOrderId === o.id);
    return <tr key={o.id}><td>{compact ? <VehicleIdentity compact vehicle={v} /> : <><Link className="table-link" href={`/work-orders/${o.id}`}>{t?.id ?? o.queue}</Link><small>{dateLabel(t?.paidAt ?? o.createdAt)} · {timeLabel(t?.paidAt ?? o.createdAt)}</small></>}</td>{!compact && <td><strong>{v.plate}</strong><small>{vehicleName(v)} · {c.name}</small></td>}<td>{o.items.map(i => i.name).join(" + ")}</td><td><span className="payment-tag">{t?.method ?? "Belum dibayar"}</span></td><td className="money">{rupiah(t?.amount ?? (o.manualTotal ?? o.items.reduce((sum, i) => sum + i.price * i.quantity, 0) - o.discount))}</td><td><StatusBadge status={o.status} /></td><td><Link href={`/work-orders/${o.id}`} className="icon-button" aria-label={`Detail ${v.plate}`}><ArrowRight size={17} /></Link></td></tr>;
  })}</tbody></table></div>;
}

export function Dashboard() {
  const { state } = useDemo();
  const today = state.orders.filter(o => dayOf(o.createdAt) === DEMO_DAY && o.status !== "CHECKED_IN" && o.status !== "CANCELLED");
  const paid = state.transactions.filter(t => dayOf(t.paidAt) === DEMO_DAY);
  const active = today.filter(o => o.status !== "COMPLETED");
  return <>
    <PageHeading title="Selamat datang 👋" subtitle="Pantau operasional car wash hari ini." action={<Link className="button primary" href="/check-in"><Plus size={18} />Check-in Kendaraan</Link>} />
    <div className="section-eyebrow"><span>RINGKASAN HARI INI</span><span><span className="online-dot" />Diperbarui otomatis</span></div>
    <div className="metrics-grid"><MetricCard label="Kendaraan Hari Ini" value={today.length} icon={CarFront} hint="Kendaraan masuk hari ini" /><MetricCard label="Menunggu" value={today.filter(o => o.status === "QUEUED").length} icon={Clock3} tone="amber" hint="Dalam antrean pencucian" /><MetricCard label="Sedang Dicuci" value={today.filter(o => o.status === "WASHING").length} icon={Droplets} hint={`${state.settings.bays} bay pencucian tersedia`} /><MetricCard label="Selesai" value={today.filter(o => ["READY", "COMPLETED"].includes(o.status)).length} icon={CheckCheck} tone="green" hint="Siap diambil & sudah dibayar" /><MetricCard label="Pendapatan Hari Ini" value={rupiah(paid.reduce((sum, t) => sum + t.amount, 0))} icon={Banknote} tone="green" hint={`${paid.length} transaksi lunas`} /></div>
    <div className="dashboard-columns"><Panel title="Antrean operasional" subtitle="Pantau setiap tahap perjalanan kendaraan." action={<Link className="text-link" href="/queue">Lihat semua <ArrowRight size={15} /></Link>}>
      <div className="queue-summary"><span><i className="dot amber-bg" />Menunggu <b>{active.filter(o => o.status === "QUEUED").length}</b></span><span><i className="dot blue-bg" />Dicuci <b>{active.filter(o => o.status === "WASHING").length}</b></span><span><i className="dot purple-bg" />Pemeriksaan <b>{active.filter(o => o.status === "QUALITY_CHECK").length}</b></span><span><i className="dot green-bg" />Siap diambil <b>{active.filter(o => o.status === "READY").length}</b></span></div>
      {!active.length ? <EmptyState title="Antrean masih kosong" /> : <div className="dashboard-queue">{[...active].sort((a, b) => stageRank(a.status) - stageRank(b.status) || a.createdAt.localeCompare(b.createdAt)).slice(0, 5).map(o => { const v = state.vehicles.find(v => v.id === o.vehicleId)!; return <Link className="dashboard-queue-row" key={o.id} href={`/work-orders/${o.id}`}><span className="queue-number">{o.queue}</span><VehicleIdentity compact vehicle={v} /><div className="queue-service">{o.items.map(i => i.name).join(" + ")}<small>{timeLabel(o.createdAt)}{o.bay ? ` · Bay ${o.bay}` : " · Menunggu bay"}</small></div><StatusBadge status={o.status} /><ArrowRight size={16} className="muted" /></Link>; })}</div>}
      <div className="panel-bottom"><ShieldCheck size={15} /><span>Setiap kendaraan melalui inspeksi dan pemeriksaan kualitas.</span></div>
    </Panel><div className="dashboard-side"><Panel title="Status bay" action={<span className="small-muted">{state.settings.bays} bay</span>}><div className="bay-list">{Array.from({ length: state.settings.bays }, (_, i) => { const o = active.find(o => o.status === "WASHING" && o.bay === i + 1); const v = state.vehicles.find(v => v.id === o?.vehicleId); return <div className="bay-row" key={i}><div className={`bay-icon ${o ? "occupied" : ""}`}><CarFront size={23} /></div><div><strong>Bay {i + 1}</strong><small>{v ? `${v.plate} · ${v.model}` : "Siap untuk kendaraan berikutnya"}</small></div><span className={`dot ${o ? "blue-bg" : "green-bg"}`} /></div>; })}</div></Panel>
      <div className="display-promo"><div className="display-promo-icon"><Monitor size={23} /></div><h3>Antrean lebih transparan.</h3><p>Tampilkan status kendaraan secara langsung di ruang tunggu pelanggan.</p><Link href="/display/queue" target="_blank">Buka Layar Antrean <ArrowRight size={16} /></Link></div></div></div>
    <Panel title="Transaksi terbaru" subtitle="Pembayaran yang telah diselesaikan hari ini." action={<Link href="/transactions" className="text-link">Semua transaksi <ArrowRight size={15} /></Link>}><TransactionTable state={state} compact orders={today.filter(o => o.status === "COMPLETED").reverse().slice(0, 4)} /></Panel>
    <div className="dashboard-note"><span><ArrowDownLeft size={15} />Dari kendaraan datang, sampai siap kembali di jalan.</span><span>Semua proses dalam satu tempat.</span></div>
  </>;
}

export function Reports() {
  const { state } = useDemo();
  const today = state.transactions.filter(t => dayOf(t.paidAt) === DEMO_DAY);
  const month = state.transactions.filter(t => dayOf(t.paidAt).startsWith(DEMO_DAY.slice(0, 7)));
  const revenue = today.reduce((s, t) => s + t.amount, 0);
  const days = Array.from({ length: 7 }, (_, i) => dayAt(6 - i));
  const values = days.map(day => ({ day, income: state.transactions.filter(t => dayOf(t.paidAt) === day).reduce((s, t) => s + t.amount, 0), count: state.orders.filter(o => dayOf(o.createdAt) === day && !["CHECKED_IN", "CANCELLED"].includes(o.status)).length }));
  const sold = state.orders.filter(o => o.status === "COMPLETED" && dayOf(o.createdAt) >= days[0]).flatMap(o => o.items);
  const count = sold.reduce((s, i) => s + i.quantity, 0);
  return <><PageHeading title="Laporan operasional" subtitle="Ringkasan usaha, untuk keputusan yang lebih terarah." action={<span className="date-filter"><CalendarIcon />{dateLabel(`${dayAt(6)}T12:00:00+07:00`)} – {dateLabel(`${DEMO_DAY}T12:00:00+07:00`)}</span>} /><div className="metrics-grid four"><MetricCard label="Pendapatan Hari Ini" value={rupiah(revenue)} icon={Banknote} hint={`${today.length} pembayaran selesai`} /><MetricCard label="Pendapatan Bulan Ini" value={rupiah(month.reduce((s, t) => s + t.amount, 0))} icon={TrendingUp} hint={monthLabel(`${DEMO_DAY}T12:00:00+07:00`)} /><MetricCard label="Kendaraan Hari Ini" value={values[6].count} icon={CarFront} hint="Termasuk kendaraan dalam proses" /><MetricCard label="Rata-rata Transaksi" value={rupiah(today.length ? revenue / today.length : 0)} icon={ReceiptText} hint="Transaksi lunas hari ini" /></div><div className="two-columns">{(["income", "count"] as const).map(kind => <Panel key={kind} title={kind === "income" ? "Pendapatan 7 hari terakhir" : "Kendaraan 7 hari terakhir"} subtitle={kind === "income" ? "Berdasarkan pembayaran yang telah selesai." : "Berdasarkan tanggal kendaraan masuk."}><div className="bar-chart">{values.map(v => <div className="bar-column" key={v.day}><span>{kind === "income" ? rupiah(v.income) : v.count}</span><div className="bar-track"><div className={`bar ${kind}`} style={{ height: `${Math.max(2, v[kind] / Math.max(1, ...values.map(v => v[kind])) * 100)}%` }} /></div><small>{v.day.slice(-2)} {shortMonth(v.day)}</small></div>)}</div></Panel>)}</div><Panel title="Layanan paling diminati" subtitle="Distribusi layanan terjual dalam 7 hari terakhir."><div className="popular-services">{[...state.services].map(s => ({ service: s, qty: sold.filter(i => i.serviceId === s.id).reduce((n, i) => n + i.quantity, 0) })).sort((a, b) => b.qty - a.qty).map(({ service, qty }) => { const percent = count ? Math.round(qty / count * 100) : 0; return <div key={service.id}><div><strong>{service.name}</strong><span>{qty} layanan · {percent}%</span></div><div className="progress-track"><div style={{ width: `${percent}%` }} /></div></div>; })}</div></Panel></>;
}
function CalendarIcon() { return <Clock3 size={16} />; }
