"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CarFront, Check, CircleCheck, Clock3, Droplets, Search, ShieldCheck, X, XCircle, type LucideIcon } from "lucide-react";
import { statuses, type Status, type Vehicle, vehicleName } from "@/lib/domain";

const statusIcons: Record<Status, LucideIcon> = { CHECKED_IN: CarFront, QUEUED: Clock3, WASHING: Droplets, QUALITY_CHECK: ShieldCheck, READY: CircleCheck, COMPLETED: Check, CANCELLED: XCircle };
export function StatusBadge({ status }: { status: Status }) { const Icon = statusIcons[status]; return <span className={`status status-${status.toLowerCase()}`}><Icon size={13} />{statuses[status]}</span>; }
export function PageHeading({ title, subtitle, action, back }: { title: string; subtitle?: string; action?: ReactNode; back?: string }) {
  return <div className="page-heading"><div>{back && <Link className="back-link" href={back}><ArrowLeft size={14} />Kembali</Link>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>;
}
export function Panel({ title, subtitle, action, children, className = "" }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{title && <div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>}{children}</section>;
}
export function EmptyState({ title, description, children }: { title: string; description?: string; children?: ReactNode }) { return <div className="empty-state"><CarFront size={28} /><h3>{title}</h3>{description && <p>{description}</p>}{children}</div>; }
export function SearchBox({ value, onChange, placeholder = "Cari kendaraan..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="search-box"><Search size={17} /><span className="sr-only">{placeholder}</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></label>; }
export function VehicleIdentity({ vehicle, customer, compact = false }: { vehicle: Vehicle; customer?: string; compact?: boolean }) { return <div className={`vehicle-identity ${compact ? "compact" : ""}`}><div className="vehicle-icon"><CarFront size={compact ? 21 : 30} /></div><div><strong className="plate">{vehicle.plate}</strong><p>{vehicleName(vehicle)}{!compact && ` · ${vehicle.color}`}</p>{customer && <small>{customer}</small>}</div></div>; }
export function MetricCard({ label, value, icon: Icon, hint, tone = "blue" }: { label: string; value: ReactNode; icon: LucideIcon; hint?: string; tone?: string }) { return <div className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={18} /></span></div><strong>{value}</strong>{hint && <small>{hint}</small>}</div>; }
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog className={`modal ${wide ? "wide" : ""}`} ref={ref} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className="modal-inner"><div className="modal-heading"><h2>{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup dialog"><X size={20} /></button></div>{children}</div></dialog>;
}
export function ConfirmDialog({ title, message, onConfirm, onClose, label = "Ya, lanjutkan" }: { title: string; message: string; onConfirm: () => void; onClose: () => void; label?: string }) { return <Modal title={title} onClose={onClose}><p className="muted">{message}</p><div className="form-actions"><button className="button secondary" onClick={onClose}>Kembali</button><button className="button danger" onClick={onConfirm}>{label}</button></div></Modal>; }
export function Stepper({ step }: { step: number }) { return <ol className="stepper">{["Kendaraan", "Inspeksi", "Layanan", "Konfirmasi"].map((label, i) => <li key={label} className={i === step ? "current" : i < step ? "done" : ""}><span>{i < step ? <Check size={14} /> : i + 1}</span>{label}{i < 3 && <ArrowRight size={14} className="step-arrow" />}</li>)}</ol>; }
export function ErrorMessage({ message }: { message: string }) { return message ? <div className="error-message" role="alert">{message}</div> : null; }
export const errorText = (error: unknown) => error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.";
