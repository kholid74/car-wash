export type Status = "CHECKED_IN" | "QUEUED" | "WASHING" | "QUALITY_CHECK" | "READY" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "Tunai" | "QRIS" | "Transfer Bank" | "E-Wallet";
export type Identity = "queue" | "vehicle" | "masked" | "full";
export type Customer = { id: string; name: string; phone: string };
export type Vehicle = { id: string; plate: string; brand: string; model: string; color: string; type: string; customerId: string };
export type Service = { id: string; name: string; price: number; description: string; duration: number; active: boolean };
export type Inspection = { dirt: "Ringan" | "Sedang" | "Berat"; areas: string[]; notes: string; photos: string[] };
export type LineItem = { serviceId: string; name: string; price: number; quantity: number };
export type WorkOrder = {
  id: string; vehicleId: string; queue: string; status: Status; createdAt: string;
  inspection: Inspection; items: LineItem[]; discount: number; manualTotal: number | null;
  notes: string; bay: number | null; timeline: { label: string; at: string }[];
};
export type Transaction = { id: string; workOrderId: string; paidAt: string; method: PaymentMethod; amount: number; received: number };
export type Settings = { name: string; address: string; phone: string; prefix: string; bays: number; identity: Identity };
export type DemoState = { version: 1; customers: Customer[]; vehicles: Vehicle[]; services: Service[]; orders: WorkOrder[]; transactions: Transaction[]; settings: Settings; nextQueue: number };

/**
 * Tanggal demo mengikuti tanggal berjalan di zona Asia/Jakarta.
 *
 * Prototype ini akan diperlihatkan berulang kali, jadi data "hari ini" tidak boleh
 * terpaku pada satu tanggal: dashboard harus tetap terisi dan waktu tunggu antrean
 * tetap masuk akal kapan pun demo dibuka.
 */
export const DEMO_DAY = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
/** Geser tanggal demo sejumlah hari ke belakang, tetap dalam format YYYY-MM-DD. */
export const demoDayBefore = (days: number) => new Date(new Date(`${DEMO_DAY}T00:00:00+07:00`).getTime() - days * 86400000 + 7 * 3600000).toISOString().slice(0, 10);
/** Menit sejak tengah malam waktu Jakarta. */
export const jakartaMinutes = () => { const now = new Date(Date.now() + 7 * 3600000); return now.getUTCHours() * 60 + now.getUTCMinutes(); };
/** Ubah menit sejak tengah malam menjadi stempel waktu ISO pada tanggal demo. */
export const minuteOfDay = (minutes: number) => `${DEMO_DAY}T${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00+07:00`;
/** Tanggal ISO sejumlah hari ke belakang (0 = hari ini). */
export const dayAt = (daysAgo: number) => demoDayBefore(daysAgo);
/** Tanggal lengkap berbahasa Indonesia, misalnya "Jumat, 2 Oktober 2026". */
export const fullDateLabel = (value: string) => new Date(value).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
/** Nama bulan dan tahun, misalnya "Oktober 2026". */
export const monthLabel = (value: string) => new Date(value).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
/** Singkatan bulan, misalnya "Okt". */
export const shortMonth = (value: string) => new Date(`${value}T12:00:00+07:00`).toLocaleDateString("id-ID", { month: "short", timeZone: "Asia/Jakarta" });
export const statuses: Record<Status, string> = { CHECKED_IN: "Inspeksi", QUEUED: "Menunggu", WASHING: "Sedang Dicuci", QUALITY_CHECK: "Pemeriksaan Kualitas", READY: "Siap Diambil", COMPLETED: "Selesai", CANCELLED: "Dibatalkan" };
export const queueStatuses: Status[] = ["QUEUED", "WASHING", "QUALITY_CHECK", "READY"];
export const paymentMethods: PaymentMethod[] = ["Tunai", "QRIS", "Transfer Bank", "E-Wallet"];
export const rupiah = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;
export const dateLabel = (value: string) => new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
export const timeLabel = (value: string) => new Date(value).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).replace(".", ":");
export const dayOf = (value: string) => new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 10);
export const demoNow = () => `${DEMO_DAY}T${new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour12: false })}+07:00`;
export const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const vehicleName = (v: Vehicle) => `${v.brand} ${v.model}`;
export const isActive = (o: WorkOrder) => o.status !== "COMPLETED" && o.status !== "CANCELLED";
export const subtotal = (o: WorkOrder) => o.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
export const total = (o: WorkOrder) => o.manualTotal ?? Math.max(0, subtotal(o) - o.discount);
export const emptyInspection = (): Inspection => ({ dirt: "Sedang", areas: [], notes: "", photos: [] });
export const maskedPlate = (plate: string) => plate.replace(/\d{1,2}(?=\D*$)/, "••");
export const elapsed = (createdAt: string) => Math.max(0, Math.floor((new Date(demoNow()).getTime() - new Date(createdAt).getTime()) / 60000));

export function recommend(inspection: Inspection, services: Service[]): LineItem[] {
  // ponytail: aturan demo sederhana; ganti setelah rekomendasi operasional disepakati klien.
  const ids = [inspection.dirt === "Ringan" ? "basic" : "premium"];
  if (inspection.areas.some(a => ["Interior", "Jok", "Karpet", "Plafon", "Bau interior"].includes(a))) ids.push("interior");
  return services.filter(s => s.active && ids.includes(s.id)).map(s => ({ serviceId: s.id, name: s.name, price: s.price, quantity: 1 }));
}

export function createDraft(state: DemoState, vehicleId: string): { state: DemoState; order: WorkOrder } {
  if (!state.vehicles.some(v => v.id === vehicleId)) throw new Error("Kendaraan tidak ditemukan.");
  const existing = state.orders.find(o => o.vehicleId === vehicleId && isActive(o));
  if (existing) return { state, order: existing };
  const at = demoNow();
  const order: WorkOrder = { id: crypto.randomUUID(), vehicleId, queue: "", status: "CHECKED_IN", createdAt: at, inspection: emptyInspection(), items: [], discount: 0, manualTotal: null, notes: "", bay: null, timeline: [{ label: "Check-in kendaraan", at }] };
  return { state: { ...state, orders: [...state.orders, order] }, order };
}

export function validatePrice(order: WorkOrder) {
  if (!order.items.length) throw new Error("Pilih minimal satu layanan.");
  if (order.items.some(i => !Number.isSafeInteger(i.quantity) || i.quantity < 1 || i.quantity > 99 || !Number.isSafeInteger(i.price) || i.price < 0)) throw new Error("Harga atau jumlah layanan tidak valid.");
  if (!Number.isSafeInteger(order.discount) || order.discount < 0 || order.discount > subtotal(order)) throw new Error("Diskon tidak boleh melebihi subtotal.");
  if (!Number.isSafeInteger(total(order)) || total(order) < 0) throw new Error("Total harga tidak valid.");
}

export function confirmOrder(state: DemoState, id: string): DemoState {
  const order = state.orders.find(o => o.id === id);
  if (!order || order.status !== "CHECKED_IN") throw new Error("Pesanan sudah dikonfirmasi atau tidak ditemukan.");
  validatePrice(order);
  const queue = `${state.settings.prefix}-${String(state.nextQueue).padStart(3, "0")}`;
  return { ...state, nextQueue: state.nextQueue + 1, orders: state.orders.map(o => o.id === id ? { ...o, queue, status: "QUEUED", timeline: [...o.timeline, { label: "Masuk antrean", at: demoNow() }] } : o) };
}

export function advanceOrder(state: DemoState, id: string, status: Status, bay?: number): DemoState {
  const order = state.orders.find(o => o.id === id);
  if (!order) throw new Error("Pesanan tidak ditemukan.");
  const next: Partial<Record<Status, Status>> = { QUEUED: "WASHING", WASHING: "QUALITY_CHECK", QUALITY_CHECK: "READY" };
  if (status === "CANCELLED" ? !isActive(order) : next[order.status] !== status) throw new Error("Perubahan status tidak valid.");
  if (status === "WASHING") {
    if (!bay || bay < 1 || bay > state.settings.bays) throw new Error("Pilih bay yang tersedia.");
    if (state.orders.some(o => o.status === "WASHING" && o.bay === bay)) throw new Error(`Bay ${bay} sedang digunakan. Pilih bay lain.`);
  }
  return { ...state, orders: state.orders.map(o => o.id === id ? { ...o, status, bay: status === "WASHING" ? bay! : o.bay, timeline: [...o.timeline, { label: statuses[status], at: demoNow() }] } : o) };
}

export function payOrder(state: DemoState, id: string, method: PaymentMethod, received: number): DemoState {
  const order = state.orders.find(o => o.id === id);
  if (!order || order.status !== "READY") throw new Error("Kendaraan harus siap diambil sebelum pembayaran.");
  validatePrice(order);
  if (!paymentMethods.includes(method)) throw new Error("Metode pembayaran tidak valid.");
  const amount = total(order);
  if (!Number.isSafeInteger(received) || received < amount) throw new Error("Nominal pembayaran kurang dari total.");
  const at = demoNow();
  const transaction: Transaction = { id: `TRX-20261002-${String(state.transactions.filter(t => dayOf(t.paidAt) === DEMO_DAY).length + 1).padStart(4, "0")}`, workOrderId: id, paidAt: at, method, amount, received: method === "Tunai" ? received : amount };
  return { ...state, transactions: [...state.transactions, transaction], orders: state.orders.map(o => o.id === id ? { ...o, status: "COMPLETED", timeline: [...o.timeline, { label: "Pembayaran selesai", at }] } : o) };
}
