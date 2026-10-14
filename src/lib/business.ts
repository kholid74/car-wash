import { demoNow, validateBranch, type Branch, type DemoState, type Expense, type InventoryItem } from "./domain.ts";

export function changeMembershipPoints(state: DemoState, customerId: string, points: number, note: string): DemoState {
  if (!state.customers.some(customer => customer.id === customerId) || !Number.isSafeInteger(points) || points === 0 || !note.trim()) throw new Error("Pilih pelanggan, jumlah poin bulat, dan alasan perubahan.");
  const membership = state.memberships.find(item => item.customerId === customerId) ?? { customerId, tier: "Essential" as const, points: 0, history: [] };
  if (membership.points + points < 0) throw new Error("Poin tidak mencukupi untuk ditukarkan.");
  const entry = { id: crypto.randomUUID(), at: demoNow(), points, note: note.trim() };
  const next = { ...membership, points: membership.points + points, history: [entry, ...membership.history] };
  return { ...state, memberships: state.memberships.some(item => item.customerId === customerId) ? state.memberships.map(item => item.customerId === customerId ? next : item) : [...state.memberships, next] };
}

export function setAttendance(state: DemoState, employeeId: string, date: string, status: "HADIR" | "IZIN" | "TIDAK_HADIR"): DemoState {
  if (!state.employees.some(employee => employee.id === employeeId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Petugas atau tanggal absensi tidak valid.");
  const existing = state.attendance.find(item => item.employeeId === employeeId && item.date === date);
  const entry = { id: existing?.id ?? crypto.randomUUID(), employeeId, date, status };
  return { ...state, attendance: existing ? state.attendance.map(item => item.id === existing.id ? entry : item) : [...state.attendance, entry] };
}

export function setCommissionRate(state: DemoState, serviceId: string, rate: number): DemoState {
  if (!state.services.some(service => service.id === serviceId) || !Number.isSafeInteger(rate) || rate < 0 || rate > 100) throw new Error("Komisi harus berupa persentase bulat antara 0–100.");
  const existing = state.commissionRules.find(rule => rule.serviceId === serviceId);
  return { ...state, commissionRules: existing ? state.commissionRules.map(rule => rule.serviceId === serviceId ? { serviceId, rate } : rule) : [...state.commissionRules, { serviceId, rate }] };
}

export function createInventoryItem(state: DemoState, item: InventoryItem): DemoState {
  if (!state.branches.some(branch => branch.id === item.branchId) || !item.name.trim() || !item.unit.trim() || !Number.isSafeInteger(item.quantity) || item.quantity < 0 || !Number.isSafeInteger(item.minimum) || item.minimum < 0 || state.inventory.some(existing => existing.id === item.id)) throw new Error("Periksa nama, satuan, jumlah stok, dan cabang barang.");
  return { ...state, inventory: [...state.inventory, { ...item, name: item.name.trim(), unit: item.unit.trim() }] };
}

export function adjustInventory(state: DemoState, itemId: string, delta: number, reason: string): DemoState {
  const item = state.inventory.find(row => row.id === itemId);
  if (!item || !Number.isSafeInteger(delta) || delta === 0 || !reason.trim()) throw new Error("Pilih barang, jumlah perubahan bulat, dan alasan.");
  if (item.quantity + delta < 0) throw new Error("Stok tidak mencukupi untuk pemakaian tersebut.");
  return { ...state, inventory: state.inventory.map(row => row.id === itemId ? { ...row, quantity: row.quantity + delta } : row), inventoryMovements: [{ id: crypto.randomUUID(), itemId, delta, reason: reason.trim(), at: demoNow() }, ...state.inventoryMovements] };
}

export function createExpense(state: DemoState, expense: Expense): DemoState {
  if (!state.branches.some(branch => branch.id === expense.branchId) || !expense.category.trim() || !expense.description.trim() || !Number.isSafeInteger(expense.amount) || expense.amount < 1 || !Number.isFinite(Date.parse(expense.createdAt)) || state.expenses.some(item => item.id === expense.id)) throw new Error("Isi kategori, keterangan, tanggal, dan jumlah pengeluaran yang valid.");
  return { ...state, expenses: [{ ...expense, category: expense.category.trim(), description: expense.description.trim() }, ...state.expenses] };
}

export function addBranch(state: DemoState, branch: Branch): DemoState {
  validateBranch(branch);
  if (state.branches.some(item => item.id === branch.id || item.prefix.toUpperCase() === branch.prefix.toUpperCase())) throw new Error("ID dan awalan antrean cabang harus unik.");
  return { ...state, branches: [...state.branches, branch] };
}
