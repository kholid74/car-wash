import { DEMO_DAY, statuses, validateBranch, type Attendance, type Branch, type CommissionRule, type DemoState, type Employee, type Expense, type InventoryItem, type Membership, type Settings, type WorkOrder } from "./domain.ts";

type BusinessData = Pick<DemoState, "memberships" | "attendance" | "commissionRules" | "inventory" | "inventoryMovements" | "expenses" | "showcase">;
type PreviousState = Omit<DemoState, "version" | keyof BusinessData> & { version: 1 | 2 | 3 | 4; memberships?: Membership[]; attendance?: Attendance[]; commissionRules?: CommissionRule[]; inventory?: InventoryItem[]; inventoryMovements?: DemoState["inventoryMovements"]; expenses?: Expense[]; showcase?: DemoState["showcase"] };
export type LegacyWorkOrder = Omit<WorkOrder, "branchId" | "employeeId">;
export type LegacyDemoState = Omit<DemoState, "version" | "reservations" | "orders" | "settings" | "branches" | "activeBranchId" | "employees" | keyof BusinessData> & {
  version: 1;
  orders: LegacyWorkOrder[];
  settings: Settings & Omit<Branch, "id" | "opensAt" | "closesAt">;
};
type Version2State = Omit<DemoState, "version" | "reservations" | keyof BusinessData> & { version: 2 };
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown) => typeof value === "string";
const money = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;

function defaultBusinessData(branches: Branch[], employees: Employee[], customers: DemoState["customers"], services: DemoState["services"]): BusinessData {
  const memberships: Membership[] = customers.slice(0, 4).map((customer, index) => ({ customerId: customer.id, tier: (["Essential", "Signature", "Reserve", "Signature"] as const)[index], points: [450, 1250, 2800, 900][index], history: [{ id: `points-${index}`, at: `${DEMO_DAY}T09:00:00+07:00`, points: [450, 1250, 2800, 900][index], note: "Saldo awal demo" }] }));
  const attendance: Attendance[] = employees.map((employee, index) => ({ id: `attendance-${employee.id}`, employeeId: employee.id, date: DEMO_DAY, status: index === 1 ? "IZIN" : "HADIR" }));
  const commissionRules: CommissionRule[] = services.map(service => ({ serviceId: service.id, rate: 8 }));
  const inventory: InventoryItem[] = branches.flatMap(branch => [
    { id: `inventory-${branch.id}-shampoo`, branchId: branch.id, name: "Shampoo kendaraan", unit: "liter", quantity: branch.id === "main" ? 18 : 6, minimum: 8 },
    { id: `inventory-${branch.id}-microfiber`, branchId: branch.id, name: "Kain microfiber", unit: "pcs", quantity: branch.id === "main" ? 24 : 9, minimum: 10 },
    { id: `inventory-${branch.id}-wax`, branchId: branch.id, name: "Wax pelindung", unit: "botol", quantity: 7, minimum: 3 },
  ]);
  const expenses: Expense[] = branches.flatMap((branch, index) => [
    { id: `expense-${branch.id}-1`, branchId: branch.id, category: "Utilitas", description: "Listrik dan air", amount: 650000 + index * 50000, createdAt: `${DEMO_DAY}T08:30:00+07:00` },
    { id: `expense-${branch.id}-2`, branchId: branch.id, category: "Operasional", description: "Perlengkapan kebersihan", amount: 275000 + index * 25000, createdAt: `${DEMO_DAY}T10:15:00+07:00` },
  ]);
  const showcase: DemoState["showcase"] = {
    promotions: [{ id: "promo-detailing", title: "Perawatan detailing pilihan", code: "DETAIL10", discount: 10, active: true }, { id: "promo-visit", title: "Apresiasi kunjungan berkala", code: "KEMBALI5", discount: 5, active: false }],
    feedback: customers.slice(0, 3).map((customer, index) => ({ id: `feedback-${index + 1}`, customer: customer.name, rating: [5, 4, 5][index], comment: ["Proses perawatan terasa jelas.", "Saya mudah mengikuti perkembangan kendaraan.", "Tim membantu memilih layanan yang sesuai."][index], status: index === 1 ? "DITINJAU" : "BARU" })),
    roles: [{ id: "owner", name: "Pemilik", permissions: ["Lihat laporan", "Kelola staf", "Kelola katalog", "Kelola transaksi"] }, { id: "manager", name: "Manajer Cabang", permissions: ["Lihat laporan", "Kelola staf", "Kelola katalog"] }, { id: "frontdesk", name: "Front Desk", permissions: ["Kelola check-in", "Kelola booking"] }],
    paymentOptions: [{ name: "Tunai", active: true }, { name: "QRIS", active: true }, { name: "Transfer Bank", active: true }, { name: "E-Wallet", active: true }],
    notificationTemplates: [{ id: "booking-confirm", title: "Konfirmasi booking", channel: "WhatsApp · contoh", body: "Halo {{nama}}, jadwal {{tanggal}} pukul {{jam}} kami catat. Tim cabang akan membantu Anda." }, { id: "vehicle-ready", title: "Kendaraan siap diambil", channel: "WhatsApp · contoh", body: "Halo {{nama}}, kendaraan {{plat}} telah selesai diperiksa dan siap diambil." }],
    websiteNotice: { text: "Jadwalkan perawatan berikutnya bersama KL Autocare.", visible: false },
  };
  return { memberships, attendance, commissionRules, inventory, inventoryMovements: [], expenses, showcase };
}

export function migrateDemoState(value: unknown): DemoState {
  if (!record(value) || ![1, 2, 3, 4].includes(value.version as number)) throw new Error("Versi data demo tidak didukung.");
  for (const key of ["customers", "vehicles", "services", "orders", "transactions"]) {
    const rows = value[key];
    if (!Array.isArray(rows) || !rows.every(row => record(row) && text(row.id))) throw new Error(`Data ${key} tidak valid.`);
  }
  if (!record(value.settings) || !["queue", "vehicle", "masked", "full"].includes(String(value.settings.identity)) || !Number.isSafeInteger(value.nextQueue) || Number(value.nextQueue) < 1) throw new Error("Pengaturan data demo tidak valid.");
  const saved = value as unknown as LegacyDemoState | Version2State | PreviousState;
  if (saved.customers.some(customer => !text(customer.name) || !text(customer.phone)) || saved.vehicles.some(vehicle => ![vehicle.plate, vehicle.brand, vehicle.model, vehicle.color, vehicle.type].every(text) || !saved.customers.some(customer => customer.id === vehicle.customerId))) throw new Error("Data kendaraan atau pelanggan tidak valid.");
  if (saved.services.some(service => !text(service.name) || !text(service.description) || !money(service.price) || !Number.isSafeInteger(service.duration) || service.duration < 1 || typeof service.active !== "boolean")) throw new Error("Data layanan tidak valid.");
  for (const order of saved.orders) {
    if (!saved.vehicles.some(vehicle => vehicle.id === order.vehicleId) || !Object.hasOwn(statuses, order.status) || !text(order.queue) || !Number.isFinite(Date.parse(order.createdAt)) || !text(order.notes)) throw new Error("Data pesanan tidak valid.");
    if (!record(order.inspection) || !["Ringan", "Sedang", "Berat"].includes(order.inspection.dirt) || !Array.isArray(order.inspection.areas) || !order.inspection.areas.every(text) || !Array.isArray(order.inspection.photos) || !order.inspection.photos.every(text) || !text(order.inspection.notes)) throw new Error("Data inspeksi tidak valid.");
    if (!Array.isArray(order.items) || !order.items.every(item => record(item) && text(item.serviceId) && text(item.name) && money(item.price) && Number.isSafeInteger(item.quantity) && item.quantity > 0) || !money(order.discount) || (order.manualTotal !== null && !money(order.manualTotal))) throw new Error("Data harga pesanan tidak valid.");
    if (!Array.isArray(order.timeline) || !order.timeline.every(event => record(event) && text(event.label) && Number.isFinite(Date.parse(event.at))) || (order.bay !== null && (!Number.isInteger(order.bay) || order.bay < 1))) throw new Error("Data tahapan pesanan tidak valid.");
  }
  if (saved.transactions.some(transaction => !saved.orders.some(order => order.id === transaction.workOrderId) || !Number.isFinite(Date.parse(transaction.paidAt)) || !text(transaction.method) || !money(transaction.amount) || !money(transaction.received))) throw new Error("Data transaksi tidak valid.");

  let state: Omit<DemoState, "version" | keyof BusinessData> & { version: 1 | 2 | 3 | 4 };
  if (saved.version === 1) {
    const { name, address, phone, prefix, bays, identity } = (saved as LegacyDemoState).settings;
    if (![name, address, phone, prefix].every(text)) throw new Error("Informasi cabang lama tidak valid.");
    const branches: Branch[] = [
      { id: "main", name, address, phone, prefix, bays, opensAt: "08:00", closesAt: "17:00" },
      { id: "bsd", name: "KL Autocare BSD", address: "Jl. Contoh BSD No. 8, Tangerang Selatan", phone: "0812-0000-0001", prefix: "B", bays: 2, opensAt: "08:00", closesAt: "17:00" },
    ];
    state = { ...saved, version: 3, reservations: [], settings: { identity }, branches, activeBranchId: "main", orders: saved.orders.map(order => ({ ...order, branchId: "main", employeeId: null })), employees: [
      { id: "staff-1", branchId: "main", name: "Raka Pratama", role: "Wash specialist", active: true },
      { id: "staff-2", branchId: "main", name: "Dewi Laras", role: "Detailing & QC", active: true },
      { id: "staff-3", branchId: "bsd", name: "Fajar Saputra", role: "Wash specialist", active: true },
    ] };
  } else { state = saved.version === 2 ? { ...saved, version: 3, reservations: [] } : saved; }
  const existingBusinessData = state.version === 4 ? value as unknown as Partial<BusinessData> : {};
  state = { ...state, version: 4, ...defaultBusinessData(state.branches, state.employees, state.customers, state.services), ...existingBusinessData };
  const previousShowcase = (state as typeof state & Pick<DemoState, "showcase">).showcase;
  state = { ...state, branches: state.branches.map(branch => ({ ...branch, name: branch.name.replace(/\bVELOCE\b/gi, "KL Autocare").replace("Kalsara Car Wash Demo", "KL Autocare").replace(" · Demo", "") })), showcase: { ...previousShowcase, websiteNotice: { ...previousShowcase.websiteNotice, text: previousShowcase.websiteNotice.text.replace(/\bVELOCE\b/gi, "KL Autocare") } } } as typeof state;
  if (!Array.isArray(state.branches) || !state.branches.length || !state.branches.every(branch => record(branch) && text(branch.id) && text(branch.name) && text(branch.address) && text(branch.phone)) || !state.branches.some(branch => branch.id === state.activeBranchId)) throw new Error("Data cabang tidak valid.");
  state.branches.forEach(validateBranch);
  if (!Array.isArray(state.employees) || !state.employees.every(employee => record(employee) && text(employee.id) && text(employee.name) && text(employee.role) && typeof employee.active === "boolean" && state.branches.some(branch => branch.id === employee.branchId))) throw new Error("Data petugas tidak valid.");
  if (state.orders.some(order => !state.branches.some(branch => branch.id === order.branchId) || (order.employeeId !== null && !state.employees.some(employee => employee.id === order.employeeId && employee.branchId === order.branchId)))) throw new Error("Cabang atau petugas pesanan tidak valid.");
  const reservations = state.reservations;
  if (!Array.isArray(reservations) || !reservations.every(booking => record(booking) && [booking.id, booking.reference, booking.customerName, booking.phone, booking.plate, booking.brand, booking.model, booking.vehicleType, booking.notes].every(text) && state.branches.some(branch => branch.id === booking.branchId) && /^\d{4}-\d{2}-\d{2}$/.test(booking.date) && new Date(`${booking.date}T00:00:00Z`).toISOString().slice(0, 10) === booking.date && /^([01]\d|2[0-3]):00$/.test(booking.slot) && Number.isFinite(Date.parse(booking.createdAt)) && ["PENDING", "CONFIRMED", "CANCELLED", "CHECKED_IN"].includes(booking.status) && record(booking.service) && text(booking.service.id) && text(booking.service.name) && money(booking.service.price) && Number.isSafeInteger(booking.service.duration) && booking.service.duration > 0 && (booking.status === "CHECKED_IN" ? state.orders.some(order => order.id === booking.workOrderId && order.branchId === booking.branchId) : booking.workOrderId === null))) throw new Error("Data reservasi tidak valid.");
  if (new Set(reservations.map(booking => booking.id)).size !== reservations.length || new Set(reservations.map(booking => booking.reference)).size !== reservations.length) throw new Error("Referensi reservasi ganda.");
  const business = state as typeof state & BusinessData;
  if (!Array.isArray(business.memberships) || !business.memberships.every(item => record(item) && state.customers.some(customer => customer.id === item.customerId) && ["Essential", "Signature", "Reserve"].includes(item.tier) && Number.isSafeInteger(item.points) && item.points >= 0 && Array.isArray(item.history) && item.history.every(row => record(row) && text(row.id) && Number.isSafeInteger(row.points) && text(row.note) && Number.isFinite(Date.parse(row.at))))) throw new Error("Data membership tidak valid.");
  if (new Set(business.memberships.map(item => item.customerId)).size !== business.memberships.length) throw new Error("Membership pelanggan ganda.");
  if (!Array.isArray(business.attendance) || !business.attendance.every(item => record(item) && text(item.id) && state.employees.some(employee => employee.id === item.employeeId) && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && ["HADIR", "IZIN", "TIDAK_HADIR"].includes(item.status)) || new Set(business.attendance.map(item => `${item.employeeId}:${item.date}`)).size !== business.attendance.length) throw new Error("Data absensi tidak valid.");
  if (!Array.isArray(business.commissionRules) || !business.commissionRules.every(item => record(item) && state.services.some(service => service.id === item.serviceId) && Number.isSafeInteger(item.rate) && item.rate >= 0 && item.rate <= 100) || new Set(business.commissionRules.map(item => item.serviceId)).size !== business.commissionRules.length) throw new Error("Aturan komisi tidak valid.");
  if (!Array.isArray(business.inventory) || !business.inventory.every(item => record(item) && text(item.id) && state.branches.some(branch => branch.id === item.branchId) && text(item.name) && text(item.unit) && Number.isSafeInteger(item.quantity) && item.quantity >= 0 && Number.isSafeInteger(item.minimum) && item.minimum >= 0) || new Set(business.inventory.map(item => item.id)).size !== business.inventory.length) throw new Error("Data inventori tidak valid.");
  if (!Array.isArray(business.inventoryMovements) || !business.inventoryMovements.every(item => record(item) && text(item.id) && business.inventory.some(inventory => inventory.id === item.itemId) && Number.isSafeInteger(item.delta) && item.delta !== 0 && text(item.reason) && Number.isFinite(Date.parse(item.at)))) throw new Error("Riwayat inventori tidak valid.");
  if (!Array.isArray(business.expenses) || !business.expenses.every(item => record(item) && text(item.id) && state.branches.some(branch => branch.id === item.branchId) && text(item.category) && text(item.description) && money(item.amount) && item.amount > 0 && Number.isFinite(Date.parse(item.createdAt))) || new Set(business.expenses.map(item => item.id)).size !== business.expenses.length) throw new Error("Data pengeluaran tidak valid.");
  const showcase = business.showcase;
  if (!record(showcase) || !Array.isArray(showcase.promotions) || !showcase.promotions.every(item => record(item) && text(item.id) && text(item.title) && text(item.code) && Number.isSafeInteger(item.discount) && item.discount >= 0 && item.discount <= 100 && typeof item.active === "boolean") || !Array.isArray(showcase.feedback) || !showcase.feedback.every(item => record(item) && text(item.id) && text(item.customer) && Number.isSafeInteger(item.rating) && item.rating >= 1 && item.rating <= 5 && text(item.comment) && ["BARU", "DITINJAU", "DISEMBUNYIKAN"].includes(item.status)) || !Array.isArray(showcase.roles) || !showcase.roles.every(item => record(item) && text(item.id) && text(item.name) && Array.isArray(item.permissions) && item.permissions.every(text)) || !Array.isArray(showcase.paymentOptions) || !showcase.paymentOptions.every(item => record(item) && text(item.name) && typeof item.active === "boolean") || !Array.isArray(showcase.notificationTemplates) || !showcase.notificationTemplates.every(item => record(item) && text(item.id) && text(item.title) && text(item.channel) && text(item.body)) || !record(showcase.websiteNotice) || !text(showcase.websiteNotice.text) || typeof showcase.websiteNotice.visible !== "boolean") throw new Error("Data showcase sekunder tidak valid.");
  return state as DemoState;
}
