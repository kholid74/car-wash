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
  branchId: string; employeeId: string | null;
  inspection: Inspection; items: LineItem[]; discount: number; manualTotal: number | null;
  notes: string; bay: number | null; timeline: { label: string; at: string }[];
};
export type Transaction = { id: string; workOrderId: string; paidAt: string; method: PaymentMethod; amount: number; received: number };
export type Settings = { identity: Identity };
export type Branch = { id: string; name: string; address: string; phone: string; prefix: string; bays: number; opensAt: string; closesAt: string };
export type Employee = { id: string; branchId: string; name: string; role: string; active: boolean };
export type Reservation = {
  id: string; reference: string; branchId: string; createdAt: string; date: string; slot: string;
  service: Pick<Service, "id" | "name" | "price" | "duration">;
  customerName: string; phone: string; plate: string; brand: string; model: string; vehicleType: string; notes: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "CHECKED_IN"; workOrderId: string | null;
};
export type Membership = { customerId: string; tier: "Essential" | "Signature" | "Reserve"; points: number; history: { id: string; at: string; points: number; note: string }[] };
export type Attendance = { id: string; employeeId: string; date: string; status: "HADIR" | "IZIN" | "TIDAK_HADIR" };
export type CommissionRule = { serviceId: string; rate: number };
export type InventoryItem = { id: string; branchId: string; name: string; unit: string; quantity: number; minimum: number };
export type InventoryMovement = { id: string; itemId: string; delta: number; reason: string; at: string };
export type Expense = { id: string; branchId: string; category: string; description: string; amount: number; createdAt: string };
export type ShowcaseContent = { promotions: { id: string; title: string; code: string; discount: number; active: boolean }[]; feedback: { id: string; customer: string; rating: number; comment: string; status: "BARU" | "DITINJAU" | "DISEMBUNYIKAN" }[]; roles: { id: string; name: string; permissions: string[] }[]; paymentOptions: { name: string; active: boolean }[]; notificationTemplates: { id: string; title: string; channel: string; body: string }[]; websiteNotice: { text: string; visible: boolean } };
export type DemoState = { version: 4; reservations: Reservation[]; customers: Customer[]; vehicles: Vehicle[]; services: Service[]; orders: WorkOrder[]; transactions: Transaction[]; settings: Settings; nextQueue: number; branches: Branch[]; activeBranchId: string; employees: Employee[]; memberships: Membership[]; attendance: Attendance[]; commissionRules: CommissionRule[]; inventory: InventoryItem[]; inventoryMovements: InventoryMovement[]; expenses: Expense[]; showcase: ShowcaseContent };
export const vehicleTypes = ["City Car", "Sedan", "MPV", "SUV", "Pickup", "Van"];

export function currentBranch(state: DemoState, id = state.activeBranchId): Branch {
  const branch = state.branches.find(branch => branch.id === id);
  if (!branch) throw new Error("Cabang tidak ditemukan.");
  return branch;
}
export function selectBranch(state: DemoState, branchId: string): DemoState {
  // shortcut: one selected branch for all demo tabs; use per-display selection for separate physical outlets.
  currentBranch(state, branchId);
  return { ...state, activeBranchId: branchId };
}
export function branchOperations(state: DemoState) {
  const orders = state.orders.filter(order => order.branchId === state.activeBranchId);
  const ids = new Set(orders.map(order => order.id));
  return { orders, transactions: state.transactions.filter(transaction => ids.has(transaction.workOrderId)) };
}
export function validateBranch(branch: Branch) {
  if (!branch.name.trim() || !/^[A-Z]{1,3}$/.test(branch.prefix) || !Number.isInteger(branch.bays) || branch.bays < 1 || branch.bays > 12) throw new Error("Isi nama cabang, awalan A–Z (1–3 huruf), dan jumlah bay 1–12.");
  if (![branch.opensAt, branch.closesAt].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) || branch.opensAt >= branch.closesAt) throw new Error("Jam tutup harus setelah jam buka pada hari yang sama.");
}
export function saveBranch(state: DemoState, branch: Branch, identity: Identity): DemoState {
  currentBranch(state, branch.id);
  validateBranch(branch);
  if (state.branches.some(item => item.id !== branch.id && item.prefix === branch.prefix)) throw new Error("Awalan antrean cabang harus unik.");
  if (!["queue", "vehicle", "masked", "full"].includes(identity)) throw new Error("Pilihan identitas tidak valid.");
  if (state.orders.some(order => order.branchId === branch.id && order.status === "WASHING" && (order.bay ?? 0) > branch.bays)) throw new Error("Bay yang ingin dihapus masih digunakan. Selesaikan pencucian terlebih dahulu.");
  const bookings = state.reservations.filter(booking => booking.branchId === branch.id && booking.status !== "CANCELLED" && booking.date >= dayOf(demoNow()));
  const start = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  if (bookings.some(booking => start(booking.slot) < start(branch.opensAt) || start(booking.slot) + 60 > start(branch.closesAt) || (start(booking.slot) - start(branch.opensAt)) % 60 !== 0 || bookings.filter(other => other.date === booking.date && other.slot === booking.slot).length > branch.bays)) throw new Error("Pengaturan baru bertabrakan dengan reservasi. Jadwalkan ulang atau batalkan reservasi terlebih dahulu.");
  return { ...state, branches: state.branches.map(item => item.id === branch.id ? branch : item), settings: { ...state.settings, identity } };
}

function operationalOrder(state: DemoState, id: string) {
  const order = state.orders.find(order => order.id === id);
  if (!order) throw new Error("Pesanan tidak ditemukan.");
  if (order.branchId !== state.activeBranchId) throw new Error(`Pilih cabang ${currentBranch(state, order.branchId).name} untuk melanjutkan pesanan.`);
  return order;
}
export function editDraft(state: DemoState, id: string, changes: Partial<Pick<WorkOrder, "inspection" | "items" | "discount" | "manualTotal" | "notes">>): DemoState {
  const order = operationalOrder(state, id);
  if (order.status !== "CHECKED_IN") throw new Error("Pesanan sudah dikonfirmasi. Harga dan inspeksi tidak dapat diubah.");
  return { ...state, orders: state.orders.map(item => item.id === id ? { ...item, ...changes } : item) };
}
export function assignEmployee(state: DemoState, id: string, employeeId: string | null): DemoState {
  const order = operationalOrder(state, id);
  if (!["QUEUED", "WASHING", "QUALITY_CHECK"].includes(order.status)) throw new Error("Penugasan hanya untuk pesanan yang menunggu atau sedang dikerjakan.");
  if (employeeId !== null && !state.employees.some(employee => employee.id === employeeId && employee.branchId === order.branchId && employee.active)) throw new Error("Pilih petugas aktif dari cabang pesanan.");
  return { ...state, orders: state.orders.map(item => item.id === id ? { ...item, employeeId } : item) };
}

export function registerVehicle(state: DemoState, input: Omit<Vehicle, "id" | "customerId"> & { customerId?: string; customerName?: string; phone?: string }) {
  const plate = input.plate.trim().toUpperCase().replace(/\s+/g, " ");
  if (!/^[A-Z]{1,3}\s?\d{1,4}\s?[A-Z]{0,3}$/.test(plate)) throw new Error("Masukkan nomor polisi yang valid, misalnya B 1234 ABC.");
  if (state.vehicles.some(vehicle => normalizePlate(vehicle.plate) === normalizePlate(plate))) throw new Error("Nomor polisi sudah terdaftar. Gunakan pencarian kendaraan.");
  if (!input.model.trim() || !vehicleTypes.includes(input.type)) throw new Error("Isi model dan jenis kendaraan yang valid.");
  const existing = input.customerId ? state.customers.find(customer => customer.id === input.customerId) : undefined;
  if (input.customerId && !existing) throw new Error("Pelanggan tidak ditemukan.");
  const name = input.customerName?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";
  if (!existing && !name) throw new Error("Nama pelanggan wajib diisi.");
  if (!existing && phone && !/^[+\d\s-]{8,20}$/.test(phone)) throw new Error("Nomor WhatsApp tidak valid.");
  const customer = existing ?? { id: crypto.randomUUID(), name, phone };
  const vehicle: Vehicle = { id: crypto.randomUUID(), plate, brand: input.brand.trim(), model: input.model.trim(), color: input.color.trim() || "Belum dicatat", type: input.type, customerId: customer.id };
  return { vehicle, state: { ...state, vehicles: [...state.vehicles, vehicle], customers: existing ? state.customers : [...state.customers, customer] } };
}

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
export const demoNow = () => `${new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 19)}+07:00`;
export const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const vehicleName = (v: Vehicle) => `${v.brand} ${v.model}`;
export const isActive = (o: WorkOrder) => o.status !== "COMPLETED" && o.status !== "CANCELLED";
export const subtotal = (o: WorkOrder) => o.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
export const total = (o: WorkOrder) => o.manualTotal ?? Math.max(0, subtotal(o) - o.discount);
export const emptyInspection = (): Inspection => ({ dirt: "Sedang", areas: [], notes: "", photos: [] });
export const maskedPlate = (plate: string) => plate.replace(/\d{1,2}(?=\D*$)/, "••");
export const elapsed = (createdAt: string) => Math.max(0, Math.floor((new Date(demoNow()).getTime() - new Date(createdAt).getTime()) / 60000));
export const queueStage = (order: WorkOrder) => order.status === "WASHING" && order.items.some(item => item.serviceId === "detailing") ? "DETAILING" : order.status;
export function orderEstimate(order: WorkOrder, services: Service[]) {
  // shortcut: catalog durations are showcase estimates; snapshot them when real scheduling is introduced.
  const durations = order.items.map(item => {
    const service = services.find(service => service.id === item.serviceId);
    return service ? service.duration * item.quantity : null;
  });
  if (!durations.length || durations.includes(null)) return null;
  const minutes = durations.reduce<number>((sum, duration) => sum + duration!, 0);
  const started = order.timeline.find(event => ["mulai dicuci", "sedang dicuci"].includes(event.label.toLowerCase()));
  return { minutes, readyAt: started ? new Date(Date.parse(started.at) + minutes * 60000).toISOString() : null };
}

export function dashboardSummary(state: DemoState, day = DEMO_DAY) {
  const operations = branchOperations(state);
  const active = operations.orders.filter(o => queueStatuses.includes(o.status));
  const paid = operations.transactions.filter(t => dayOf(t.paidAt) === day);
  const finished = operations.orders.filter(o => ["READY", "COMPLETED"].includes(o.status)).map(order => {
    const started = order.timeline.find(event => ["mulai dicuci", "sedang dicuci"].includes(event.label.toLowerCase()));
    const ready = order.timeline.find(event => event.label.toLowerCase() === "siap diambil");
    return { started, ready };
  }).filter(({ ready }) => ready && dayOf(ready.at) === day);
  const durations = finished.flatMap(({ started, ready }) => {
    const minutes = started && ready ? (Date.parse(ready.at) - Date.parse(started.at)) / 60000 : NaN;
    return Number.isFinite(minutes) && minutes >= 0 ? [minutes] : [];
  });
  return {
    active, paid,
    revenue: paid.reduce((sum, payment) => sum + payment.amount, 0),
    completed: finished.length,
    queued: active.filter(order => order.status === "QUEUED").length,
    availableBays: Math.max(0, currentBranch(state).bays - new Set(active.filter(order => order.status === "WASHING" && order.bay !== null).map(order => order.bay)).size),
    averageMinutes: durations.length ? Math.round(durations.reduce((sum, minutes) => sum + minutes, 0) / durations.length) : null,
  };
}

export function recommend(inspection: Inspection, services: Service[]): LineItem[] {
  // ponytail: aturan demo sederhana; ganti setelah rekomendasi operasional disepakati klien.
  const ids = [inspection.dirt === "Ringan" ? "basic" : "premium"];
  if (inspection.areas.some(a => ["Interior", "Jok", "Karpet", "Plafon", "Bau interior"].includes(a))) ids.push("interior");
  return services.filter(s => s.active && ids.includes(s.id)).map(s => ({ serviceId: s.id, name: s.name, price: s.price, quantity: 1 }));
}

export function createDraft(state: DemoState, vehicleId: string): { state: DemoState; order: WorkOrder } {
  const branch = currentBranch(state);
  if (!state.vehicles.some(v => v.id === vehicleId)) throw new Error("Kendaraan tidak ditemukan.");
  const existing = state.orders.find(o => o.vehicleId === vehicleId && isActive(o));
  if (existing) { operationalOrder(state, existing.id); return { state, order: existing }; }
  const at = demoNow();
  const order: WorkOrder = { id: crypto.randomUUID(), vehicleId, branchId: branch.id, employeeId: null, queue: "", status: "CHECKED_IN", createdAt: at, inspection: emptyInspection(), items: [], discount: 0, manualTotal: null, notes: "", bay: null, timeline: [{ label: "Check-in kendaraan", at }] };
  return { state: { ...state, orders: [...state.orders, order] }, order };
}

export function validatePrice(order: WorkOrder) {
  if (!order.items.length) throw new Error("Pilih minimal satu layanan.");
  if (order.items.some(i => !Number.isSafeInteger(i.quantity) || i.quantity < 1 || i.quantity > 99 || !Number.isSafeInteger(i.price) || i.price < 0)) throw new Error("Harga atau jumlah layanan tidak valid.");
  if (!Number.isSafeInteger(order.discount) || order.discount < 0 || order.discount > subtotal(order)) throw new Error("Diskon tidak boleh melebihi subtotal.");
  if (!Number.isSafeInteger(total(order)) || total(order) < 0) throw new Error("Total harga tidak valid.");
}

export function confirmOrder(state: DemoState, id: string): DemoState {
  const order = operationalOrder(state, id);
  if (order.status !== "CHECKED_IN") throw new Error("Pesanan sudah dikonfirmasi.");
  validatePrice(order);
  const queue = `${currentBranch(state, order.branchId).prefix}-${String(state.nextQueue).padStart(3, "0")}`;
  return { ...state, nextQueue: state.nextQueue + 1, orders: state.orders.map(o => o.id === id ? { ...o, queue, status: "QUEUED", timeline: [...o.timeline, { label: "Masuk antrean", at: demoNow() }] } : o) };
}

export function advanceOrder(state: DemoState, id: string, status: Status, bay?: number): DemoState {
  const order = operationalOrder(state, id);
  const next: Partial<Record<Status, Status>> = { QUEUED: "WASHING", WASHING: "QUALITY_CHECK", QUALITY_CHECK: "READY" };
  if (status === "CANCELLED" ? !isActive(order) : next[order.status] !== status) throw new Error("Perubahan status tidak valid.");
  if (status === "WASHING") {
    if (!bay || !Number.isInteger(bay) || bay < 1 || bay > currentBranch(state, order.branchId).bays) throw new Error("Pilih bay yang tersedia.");
    if (state.orders.some(o => o.branchId === order.branchId && o.status === "WASHING" && o.bay === bay)) throw new Error(`Bay ${bay} sedang digunakan. Pilih bay lain.`);
  }
  return { ...state, orders: state.orders.map(o => o.id === id ? { ...o, status, bay: status === "WASHING" ? bay! : o.bay, timeline: [...o.timeline, { label: statuses[status], at: demoNow() }] } : o) };
}

export function payOrder(state: DemoState, id: string, method: PaymentMethod, received: number): DemoState {
  const order = operationalOrder(state, id);
  if (order.status !== "READY") throw new Error("Kendaraan harus siap diambil sebelum pembayaran.");
  validatePrice(order);
  if (!paymentMethods.includes(method)) throw new Error("Metode pembayaran tidak valid.");
  const amount = total(order);
  if (!Number.isSafeInteger(received) || received < amount) throw new Error("Nominal pembayaran kurang dari total.");
  const at = demoNow();
  if (state.transactions.some(transaction => transaction.workOrderId === id)) throw new Error("Pesanan sudah dibayar.");
  const prefix = `TRX-${dayOf(at).replaceAll("-", "")}-`;
  const sequence = state.transactions.reduce((maximum, transaction) => {
    const suffix = transaction.id.startsWith(prefix) ? transaction.id.slice(prefix.length) : "";
    return /^\d+$/.test(suffix) ? Math.max(maximum, Number(suffix)) : maximum;
  }, 0) + 1;
  const transaction: Transaction = { id: `${prefix}${String(sequence).padStart(4, "0")}`, workOrderId: id, paidAt: at, method, amount, received: method === "Tunai" ? received : amount };
  const customerId = state.vehicles.find(vehicle => vehicle.id === order.vehicleId)?.customerId;
  const points = Math.floor(amount / 10000);
  const membership = customerId && state.memberships.find(item => item.customerId === customerId);
  const memberships = customerId && points > 0 ? membership
    ? state.memberships.map(item => item.customerId === customerId ? { ...item, points: item.points + points, history: [{ id: transaction.id, at, points, note: `Transaksi ${transaction.id}` }, ...item.history] } : item)
    : [...state.memberships, { customerId, tier: "Essential" as const, points, history: [{ id: transaction.id, at, points, note: `Transaksi ${transaction.id}` }] }]
    : state.memberships;
  return { ...state, memberships, transactions: [...state.transactions, transaction], orders: state.orders.map(o => o.id === id ? { ...o, status: "COMPLETED", timeline: [...o.timeline, { label: "Pembayaran selesai", at }] } : o) };
}
