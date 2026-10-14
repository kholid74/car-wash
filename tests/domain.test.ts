/**
 * Uji logika domain dan invariasi data contoh.
 * Jalankan dengan: npm test
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { migrateDemoState } from "../src/lib/migration.ts";
import { availableSlots, createReservation, reservationCheckIn, updateReservation } from "../src/lib/booking.ts";
import { addBranch, adjustInventory, changeMembershipPoints, createExpense, createInventoryItem, setAttendance, setCommissionRate } from "../src/lib/business.ts";
import { seed } from "../src/lib/seed.ts";
import {
  advanceOrder, assignEmployee, branchOperations, confirmOrder, createDraft, currentBranch, dashboardSummary, dayAt, dayOf, DEMO_DAY, demoNow, editDraft, elapsed, isActive, maskedPlate, orderEstimate, queueStage, registerVehicle, saveBranch, selectBranch,
  normalizePlate, payOrder, recommend, rupiah, subtotal, total, validatePrice,
  type DemoState, type WorkOrder,
} from "../src/lib/domain.ts";

const vehicleOf = (state: DemoState, plate: string) => state.vehicles.find(v => normalizePlate(v.plate) === normalizePlate(plate))!;
const orderOf = (state: DemoState, id: string) => state.orders.find(o => o.id === id)!;
const todayOrders = (state: DemoState) => state.orders.filter(o => dayOf(o.createdAt) === DEMO_DAY && o.status !== "CANCELLED");

test("migrasi v1 mempertahankan seluruh riwayat, harga manual, foto dan pengaturan", () => {
  const legacy = JSON.parse(readFileSync(new URL("./fixtures/demo-v1.json", import.meta.url), "utf8"));
  const original = structuredClone(legacy);
  const state = migrateDemoState(legacy);
  assert.equal(state.version, 4);
  assert.equal(state.activeBranchId, "main");
  for (const key of ["customers", "vehicles", "services", "transactions", "nextQueue"] as const) assert.deepEqual(state[key], legacy[key]);
  assert.deepEqual(state.orders.map(({ branchId, employeeId, ...order }) => {
    assert.equal(branchId, "main"); assert.equal(employeeId, null); return order;
  }), legacy.orders);
  const { id, opensAt, closesAt, ...branch } = currentBranch(state);
  assert.deepEqual({ ...branch, identity: state.settings.identity }, legacy.settings);
  assert.equal(id, "main"); assert.equal(opensAt, "08:00"); assert.equal(closesAt, "17:00");
  assert.equal(state.orders.find(order => order.id === "hist-3")!.manualTotal, 290000);
  const oldBusiness = structuredClone(legacy); oldBusiness.settings.name = "Kalsara Car Wash Demo";
  assert.equal(migrateDemoState(oldBusiness).branches[0].name, "KL Autocare");
  assert.deepEqual(legacy, original);
  assert.deepEqual(migrateDemoState(state), state);
  const v2 = JSON.parse(readFileSync(new URL("./fixtures/demo-v2.json", import.meta.url), "utf8"));
  const upgraded = migrateDemoState(v2);
  assert.equal(upgraded.version, 4);
  assert.deepEqual(upgraded.reservations, []);
  assert.deepEqual(upgraded.orders, v2.orders);
  assert.throws(() => migrateDemoState({ ...legacy, version: "1" }), /Versi/);
  assert.throws(() => migrateDemoState({ ...legacy, orders: [{}] }), /orders/);
  assert.throws(() => migrateDemoState({ ...legacy, vehicles: [] }), /pesanan/);
});

test("migrasi v3 menambah data bisnis tanpa mengubah riwayat operasional", () => {
  const legacy = migrateDemoState(JSON.parse(readFileSync(new URL("./fixtures/demo-v2.json", import.meta.url), "utf8")));
  const v3 = structuredClone(legacy) as Record<string, unknown>; v3.version = 3;
  for (const key of ["memberships", "attendance", "commissionRules", "inventory", "inventoryMovements", "expenses", "showcase"]) delete v3[key];
  const upgraded = migrateDemoState(v3);
  assert.equal(upgraded.version, 4);
  assert.deepEqual(upgraded.orders, legacy.orders);
  assert.deepEqual(upgraded.transactions, legacy.transactions);
  assert.ok(upgraded.memberships.length > 0 && upgraded.inventory.length > 0 && upgraded.expenses.length > 0);
  assert.deepEqual(migrateDemoState(upgraded), upgraded);
  assert.throws(() => migrateDemoState({ ...upgraded, inventory: [{ ...upgraded.inventory[0], branchId: "missing" }] }), /inventori/);
  assert.throws(() => migrateDemoState({ ...upgraded, showcase: { ...upgraded.showcase, promotions: null as never } }), /showcase sekunder/);
});

test("modul bisnis menjaga poin, absensi, komisi, stok, pengeluaran dan awalan cabang", () => {
  let state = seed();
  const membership = state.memberships[0];
  state = changeMembershipPoints(state, membership.customerId, 100, "Kunjungan berkala");
  assert.equal(state.memberships[0].points, membership.points + 100);
  state = changeMembershipPoints(state, membership.customerId, -50, "Tukar manfaat");
  assert.equal(state.memberships[0].history[0].points, -50);
  assert.throws(() => changeMembershipPoints(state, membership.customerId, -99999, "Tukar"), /tidak mencukupi/);
  const employee = state.employees[0];
  state = setAttendance(state, employee.id, DEMO_DAY, "HADIR");
  state = setAttendance(state, employee.id, DEMO_DAY, "IZIN");
  assert.equal(state.attendance.filter(item => item.employeeId === employee.id && item.date === DEMO_DAY).length, 1);
  state = setCommissionRate(state, "basic", 12);
  assert.equal(state.commissionRules.find(rule => rule.serviceId === "basic")!.rate, 12);
  assert.throws(() => setCommissionRate(state, "basic", 101), /0–100/);
  const item = state.inventory.find(row => row.branchId === state.activeBranchId)!;
  state = createInventoryItem(state, { id: "inventory-test", branchId: state.activeBranchId, name: "Wheel cleaner", unit: "liter", quantity: 2, minimum: 1 });
  assert.equal(state.inventory.at(-1)!.name, "Wheel cleaner");
  state = adjustInventory(state, item.id, -1, "Pemakaian cuci");
  assert.equal(state.inventory.find(row => row.id === item.id)!.quantity, item.quantity - 1);
  assert.equal(state.inventoryMovements[0].delta, -1);
  assert.throws(() => adjustInventory(state, item.id, -999, "Pemakaian"), /Stok tidak mencukupi/);
  state = createExpense(state, { id: "expense-test", branchId: state.activeBranchId, category: "Utilitas", description: "Tagihan air", amount: 125000, createdAt: demoNow() });
  assert.equal(state.expenses[0].amount, 125000);
  assert.throws(() => createExpense(state, { ...state.expenses[0], id: "expense-invalid", amount: 0 }), /pengeluaran/);
  state = addBranch(state, { id: "branch-test", name: "KL Autocare Cikupa", address: "Jalan Contoh", phone: "081200000002", prefix: "C", bays: 2, opensAt: "08:00", closesAt: "17:00" });
  assert.equal(state.branches.at(-1)!.id, "branch-test");
  assert.throws(() => addBranch(state, { ...state.branches.at(-1)!, id: "branch-test-2" }), /unik/);
});

const bookingInput = (state: DemoState, plate: string, slot = "08:00") => ({
  branchId: "bsd", date: dayAt(-1), slot, serviceId: "premium", expectedPrice: state.services.find(service => service.id === "premium")!.price,
  customerName: "Dina Demo", phone: "081234567890", plate, brand: "Honda", model: "HR-V", vehicleType: "SUV", notes: "Periksa kaca depan",
});

test("booking menghormati jam lokal, jam cabang, kapasitas bay dan harga katalog", () => {
  const now = "2026-10-14T07:00:00+07:00"; const initial = selectBranch(seed(), "bsd");
  let state = initial;
  assert.deepEqual(availableSlots(state, "bsd", "2026-10-15", undefined, now).map(slot => slot.time), ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"]);
  assert.deepEqual(availableSlots(state, "bsd", "2026-10-14", undefined, now).map(slot => slot.time)[0], "08:00");
  assert.deepEqual(availableSlots(state, "bsd", "2026-10-14", undefined, "2026-10-14T09:30:00+07:00").map(slot => slot.time), ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"]);
  assert.deepEqual(availableSlots(state, "bsd", "2026-10-15", undefined, now).map(slot => slot.time).length, 9);
  assert.deepEqual(availableSlots(state, "bsd", "2026-11-14", undefined, now), []);
  assert.deepEqual(availableSlots(state, "bsd", "2026-02-30", undefined, now), []);
  const a = createReservation(state, bookingInput(state, "B 6000 XYZ"), now); state = a.state;
  const b = createReservation(state, bookingInput(state, "B 6001 XYZ"), now); state = b.state;
  assert.equal(availableSlots(state, "bsd", "2026-10-15", undefined, now).find(slot => slot.time === "08:00")!.remaining, 0);
  assert.throws(() => createReservation(state, bookingInput(state, "B 6002 XYZ"), now), /Slot sudah penuh/);
  assert.throws(() => createReservation(state, { ...bookingInput(state, "B 6002 XYZ"), expectedPrice: 1 }, now), /Harga layanan berubah/);
  assert.throws(() => createReservation(state, { ...bookingInput(state, "B 6002 XYZ"), slot: "07:00" }, now), /jadwal mendatang/);
  assert.throws(() => createReservation(state, { ...bookingInput(state, "B 6002 XYZ"), date: "2026-10-14", slot: "07:00" }, now), /jadwal mendatang/);
  assert.throws(() => createReservation(state, bookingInput(state, "B 6000 XYZ", "09:00"), now), /sudah memiliki reservasi/);
  state = updateReservation(state, a.booking.id, "confirm", undefined, now);
  assert.equal(state.reservations[0].status, "CONFIRMED");
  state = updateReservation(state, b.booking.id, "cancel", undefined, now);
  assert.equal(availableSlots(state, "bsd", "2026-10-15", undefined, now).find(slot => slot.time === "08:00")!.remaining, 1);
  assert.throws(() => updateReservation(state, a.booking.id, "reschedule", { date: "2026-10-15", slot: "18:00" }, now), /jadwal mendatang/);
  assert.throws(() => updateReservation(state, a.booking.id, "reschedule", { date: "2026-11-14", slot: "08:00" }, now), /jadwal mendatang/);
  const rescheduled = updateReservation(state, a.booking.id, "reschedule", { date: "2026-10-15", slot: "09:00" }, now);
  assert.equal(rescheduled.reservations[0].status, "CONFIRMED");
  assert.equal(rescheduled.reservations[0].slot, "09:00");
});

test("reservasi dapat dikonversi satu kali dan mewariskan kendaraan serta snapshot layanan", () => {
  const now = "2026-10-14T07:00:00+07:00"; let state = selectBranch(seed(), "bsd");
  const input = bookingInput(state, "B 6099 XYZ"); const created = createReservation(state, input, now);
  state = updateReservation(created.state, created.booking.id, "confirm", undefined, now);
  state = { ...state, services: state.services.map(service => service.id === input.serviceId ? { ...service, price: service.price + 10000 } : service) };
  assert.throws(() => reservationCheckIn(state, "missing"), /tidak ditemukan/);
  const result = reservationCheckIn(state, created.booking.id);
  assert.equal(result.order.branchId, "bsd");
  assert.deepEqual(result.order.items, [{ serviceId: "premium", name: created.booking.service.name, price: created.booking.service.price, quantity: 1 }]);
  assert.match(result.order.notes, new RegExp(created.booking.reference));
  assert.equal(result.state.customers.length, state.customers.length);
  assert.equal(result.state.nextQueue, state.nextQueue);
  assert.equal(result.state.vehicles.at(-1)!.customerId, result.state.customers.find(customer => customer.phone.replace(/\D/g, "") === input.phone.replace(/\D/g, ""))!.id);
  const checkedIn = result.state.reservations.find(booking => booking.id === created.booking.id)!;
  assert.equal(checkedIn.status, "CHECKED_IN");
  assert.equal(checkedIn.workOrderId, result.order.id);
  const repeated = reservationCheckIn(result.state, created.booking.id);
  assert.equal(repeated.order.id, result.order.id);
  assert.equal(repeated.state.orders.length, result.state.orders.length);
  assert.throws(() => updateReservation(result.state, created.booking.id, "cancel"), /sudah ditutup/);
  assert.throws(() => reservationCheckIn(selectBranch(result.state, "main"), created.booking.id), /Pilih cabang/);
});

test("kendaraan baru dapat memakai pelanggan lama tanpa menggandakan pelanggan", () => {
  const state = seed();
  const input = { plate: "B 4321 XYZ", brand: "Toyota", model: "Avanza", type: "MPV", color: "Silver", customerId: state.customers[0].id };
  const result = registerVehicle(state, input);
  assert.deepEqual(result.state.customers, state.customers);
  assert.equal(result.vehicle.customerId, input.customerId);
  assert.equal(result.state.vehicles.length, state.vehicles.length + 1);
  assert.throws(() => registerVehicle(result.state, { ...input, plate: "b4321xyz" }), /sudah terdaftar/);
  assert.throws(() => registerVehicle(state, { ...input, customerId: "missing" }), /Pelanggan/);
  assert.throws(() => registerVehicle(state, { ...input, model: "" }), /model/);
  assert.throws(() => registerVehicle(state, { ...input, plate: "invalid" }), /nomor polisi/);
});

test("bay, transaksi dan tindakan pesanan terisolasi per cabang", () => {
  let state = selectBranch(seed(), "bsd");
  assert.equal(dashboardSummary(state).revenue, 0);
  assert.equal(dashboardSummary(state).availableBays, 2);
  assert.deepEqual(branchOperations(state), { orders: [], transactions: [] });
  const mainQueued = state.orders.find(order => order.status === "QUEUED")!;
  assert.throws(() => advanceOrder(state, mainQueued.id, "WASHING", 1), /Pilih cabang/);
  assert.throws(() => createDraft(state, mainQueued.vehicleId), /Pilih cabang/);
  const draft = createDraft(state, vehicleOf(state, "B 1234 ABC").id);
  state = editDraft(draft.state, draft.order.id, { items: [{ serviceId: "basic", name: "Basic Wash", price: 60000, quantity: 1 }] });
  state = confirmOrder(state, draft.order.id);
  assert.equal(orderOf(state, draft.order.id).queue, "B-012");
  assert.throws(() => confirmOrder(state, draft.order.id), /sudah dikonfirmasi/);
  assert.throws(() => editDraft(state, draft.order.id, { manualTotal: 0 }), /sudah dikonfirmasi/);
  state = advanceOrder(state, draft.order.id, "WASHING", 1);
  assert.equal(dashboardSummary(state).availableBays, 1);
  assert.equal(state.orders.filter(order => order.bay === 1 && order.status === "WASHING").length, 2);
  assert.equal(dashboardSummary(selectBranch(state, "main")).availableBays, 1);
  assert.throws(() => selectBranch(state, "missing"), /tidak ditemukan/);
});

test("penugasan petugas aktif dan label detailing menjaga transisi domain", () => {
  let state = seed();
  const queued = state.orders.find(order => order.status === "QUEUED")!;
  assert.throws(() => assignEmployee(state, queued.id, "staff-3"), /petugas aktif/);
  assert.throws(() => assignEmployee(state, queued.id, ""), /petugas aktif/);
  const inactive = { ...state, employees: state.employees.map(employee => ({ ...employee, active: false })) };
  assert.throws(() => assignEmployee(inactive, queued.id, "staff-1"), /petugas aktif/);
  state = assignEmployee(state, queued.id, "staff-2");
  assert.equal(orderOf(state, queued.id).employeeId, "staff-2");
  state = { ...state, orders: state.orders.map(order => order.id === queued.id ? { ...order, items: [{ serviceId: "detailing", name: "Detailing", price: 300000, quantity: 1 }] } : order) };
  state = advanceOrder(state, queued.id, "WASHING", 2);
  assert.equal(queueStage(orderOf(state, queued.id)), "DETAILING");
  state = advanceOrder(state, queued.id, "QUALITY_CHECK");
  assert.equal(queueStage(orderOf(state, queued.id)), "QUALITY_CHECK");
  assert.equal(orderOf(assignEmployee(state, queued.id, null), queued.id).employeeId, null);
});

test("estimasi menggunakan durasi layanan dan label waktu lama maupun baru", () => {
  const state = seed();
  const base = { ...state.orders[0], items: [{ serviceId: "basic", name: "Basic", price: 60000, quantity: 2 }] };
  const duration = state.services.find(service => service.id === "basic")!.duration * 2;
  for (const label of ["Mulai dicuci", "Sedang Dicuci"]) {
    const estimate = orderEstimate({ ...base, timeline: [{ label, at: "2026-10-13T08:00:00+07:00" }] }, state.services)!;
    assert.equal(estimate.minutes, duration);
    assert.equal(Date.parse(estimate.readyAt!) - Date.parse("2026-10-13T08:00:00+07:00"), duration * 60000);
  }
  assert.equal(orderEstimate({ ...base, timeline: [] }, state.services)!.readyAt, null);
  assert.equal(orderEstimate(base, []), null);
});

test("pengaturan cabang menolak jam terbalik dan penghapusan bay terpakai", () => {
  const state = seed(); const main = currentBranch(state);
  assert.throws(() => saveBranch(state, { ...main, closesAt: "07:00" }, "masked"), /Jam tutup/);
  assert.throws(() => saveBranch(state, { ...main, bays: 2 }, "masked"), /masih digunakan/);
  const bsd = currentBranch(state, "bsd");
  const next = saveBranch(state, { ...bsd, bays: 1, closesAt: "18:00" }, "queue");
  assert.deepEqual(currentBranch(next), main);
  assert.equal(currentBranch(next, "bsd").bays, 1);
  assert.equal(next.settings.identity, "queue");
});

test("pembayaran memakai harga manual dan nomor tanggal berjalan tanpa bentrok", () => {
  let state = seed();
  const ready = state.orders.find(order => order.status === "READY")!;
  state = { ...state, orders: state.orders.map(order => order.id === ready.id ? { ...order, manualTotal: 123456 } : order) };
  const prefix = `TRX-${dayOf(demoNow()).replaceAll("-", "")}-`;
  state.transactions = state.transactions.map((transaction, index) => index === 0 ? { ...transaction, id: `${prefix}0099` } : transaction);
  const paid = payOrder(state, ready.id, "Tunai", 130000);
  const transaction = paid.transactions.at(-1)!;
  assert.equal(transaction.id, `${prefix}0100`);
  assert.equal(transaction.amount, 123456);
  assert.equal(transaction.received, 130000);
  const customerId = state.vehicles.find(vehicle => vehicle.id === ready.vehicleId)!.customerId;
  const beforePoints = state.memberships.find(item => item.customerId === customerId)?.points ?? 0;
  const afterMembership = paid.memberships.find(item => item.customerId === customerId)!;
  assert.equal(afterMembership.points, beforePoints + 12);
  assert.equal(afterMembership.history[0].id, transaction.id);
  assert.throws(() => payOrder(paid, ready.id, "QRIS", 123456), /siap diambil/);
  assert.throws(() => payOrder({ ...state, transactions: paid.transactions }, ready.id, "QRIS", 123456), /sudah dibayar/);
  assert.throws(() => payOrder(selectBranch(state, "bsd"), ready.id, "QRIS", 123456), /Pilih cabang/);
});

test("format mata uang dan penyamaran plat mengikuti gaya Indonesia", () => {
  assert.equal(rupiah(185000), "Rp185.000");
  assert.equal(rupiah(0), "Rp0");
  assert.equal(maskedPlate("B 1234 ABC"), "B 12•• ABC");
  assert.equal(maskedPlate("B 9988 KLM"), "B 99•• KLM");
});

test("data contoh konsisten dengan skenario demo", () => {
  const state = seed();
  const vehicle = vehicleOf(state, "B 1234 ABC");

  // B 1234 ABC punya 5 kunjungan selesai senilai Rp840.000 sebelum demo.
  const history = state.orders.filter(o => o.vehicleId === vehicle.id && o.status === "COMPLETED");
  const spend = history.reduce((sum, order) => {
    const trx = state.transactions.find(t => t.workOrderId === order.id)!;
    return sum + trx.amount;
  }, 0);
  assert.equal(history.length, 5);
  assert.equal(spend, 840000);

  // Antrean berikutnya harus A-012.
  assert.equal(state.nextQueue, 12);

  // Hari ini terisi A-001..A-011 sehingga angka di atasnya belum terpakai.
  const queues = todayOrders(state)
    .filter(o => o.status !== "CHECKED_IN")
    .map(o => o.queue)
    .sort();
  assert.deepEqual(queues, ["A-001", "A-002", "A-003", "A-004", "A-005", "A-006", "A-007", "A-008", "A-009", "A-010", "A-011"]);

  // Bay 2 harus kosong supaya langkah "Mulai Cuci → Bay 2" pada demo bisa dijalankan.
  assert.ok(!state.orders.some(o => o.status === "WASHING" && o.bay === 2), "Bay 2 harus tersedia untuk demo");
  assert.ok(state.orders.some(o => o.status === "WASHING" && o.bay === 1));
  assert.ok(state.orders.some(o => o.status === "WASHING" && o.bay === 3));
});

test("setiap pesanan menunjuk kendaraan dan pelanggan yang ada", () => {
  const state = seed();
  for (const order of state.orders) {
    const vehicle = state.vehicles.find(v => v.id === order.vehicleId);
    assert.ok(vehicle, `Kendaraan ${order.vehicleId} tidak ditemukan`);
    assert.ok(state.customers.some(c => c.id === vehicle.customerId), `Pelanggan kendaraan ${vehicle.plate} tidak ditemukan`);
  }
  // Timestamp harus valid dan bisa diformat.
  for (const order of state.orders) {
    assert.ok(Number.isFinite(new Date(order.createdAt).getTime()), `Tanggal tidak valid: ${order.createdAt}`);
    for (const event of order.timeline) {
      assert.ok(Number.isFinite(new Date(event.at).getTime()), `Agenda tidak valid: ${event.at}`);
    }
  }
});

test("setiap transaksi terhubung ke pesanan selesai dan nomornya unik", () => {
  const state = seed();
  const ids = new Set<string>();
  for (const trx of state.transactions) {
    const order = orderOf(state, trx.workOrderId);
    assert.equal(order.status, "COMPLETED");
    assert.ok(!ids.has(trx.id), `Nomor transaksi ganda: ${trx.id}`);
    ids.add(trx.id);
    assert.equal(trx.amount, total(order));
  }
  assert.ok(state.transactions.length > 0);
});

test("distribusi layanan tujuh hari terakhir wajar dan sesuai urutan contoh pada brief", () => {
  const state = seed();
  const sold = state.orders
    .filter(o => o.status === "COMPLETED" && dayOf(o.createdAt) >= dayAt(6) && dayOf(o.createdAt) <= DEMO_DAY)
    .flatMap(o => o.items);
  const count = sold.reduce((sum, item) => sum + item.quantity, 0);
  const share = (id: string) => sold.filter(i => i.serviceId === id).reduce((n, i) => n + i.quantity, 0) / count * 100;

  // Contoh pada brief: Premium 42%, Basic 31%, Interior 18%, Detailing 9%.
  // Data demo sengaja alami, jadi diuji sebagai rentang dan urutan—bukan angka mati.
  const [premium, basic, interior, detailing] = [share("premium"), share("basic"), share("interior"), share("detailing")];
  assert.ok(premium >= 40 && premium <= 45, `Premium ${premium.toFixed(1)}% di luar rentang wajar`);
  assert.ok(basic >= 27 && basic <= 34, `Basic ${basic.toFixed(1)}% di luar rentang wajar`);
  assert.ok(interior >= 14 && interior <= 21, `Interior ${interior.toFixed(1)}% di luar rentang wajar`);
  assert.ok(detailing >= 6 && detailing <= 12, `Detailing ${detailing.toFixed(1)}% di luar rentang wajar`);
  assert.ok(premium > basic && basic > interior && interior > detailing, "Urutan layanan terpopuler tidak sesuai contoh");
  assert.ok(Math.abs(premium + basic + interior + detailing - 100) < 1.5, "Total persentase harus mendekati 100%");
});

test("rekomendasi mengikuti tingkat kekotoran dan area perhatian", () => {
  const services = seed().services;
  const ringan = recommend({ dirt: "Ringan", areas: ["Body"], notes: "", photos: [] }, services);
  assert.deepEqual(ringan.map(i => i.serviceId), ["basic"]);

  const sedang = recommend({ dirt: "Sedang", areas: ["Body", "Kaca", "Interior", "Jok"], notes: "", photos: [] }, services);
  assert.deepEqual(sedang.map(i => i.serviceId), ["premium", "interior"]);
  assert.equal(sedang.reduce((sum, i) => sum + i.price, 0), 185000);

  const tanpaInterior = recommend({ dirt: "Berat", areas: ["Body", "Velg"], notes: "", photos: [] }, services);
  assert.deepEqual(tanpaInterior.map(i => i.serviceId), ["premium"]);
});

test("validasi harga menolak masukan yang tidak masuk akal", () => {
  const base: WorkOrder = { ...seed().orders[0], items: [], discount: 0, manualTotal: null };
  assert.throws(() => validatePrice(base), /minimal satu layanan/);
  assert.throws(() => validatePrice({ ...base, items: [{ serviceId: "basic", name: "Basic Wash", price: 60000, quantity: 0 }] }), /tidak valid/);
  assert.throws(() => validatePrice({ ...base, items: [{ serviceId: "basic", name: "Basic Wash", price: -1, quantity: 1 }] }), /tidak valid/);
  assert.throws(() => validatePrice({ ...base, items: [{ serviceId: "basic", name: "Basic Wash", price: 60000, quantity: 1 }], discount: 70000 }), /Diskon/);

  const valid: WorkOrder = { ...base, items: [{ serviceId: "premium", name: "Premium Wash", price: 120000, quantity: 1 }, { serviceId: "interior", name: "Interior Cleaning", price: 65000, quantity: 1 }] };
  assert.doesNotThrow(() => validatePrice(valid));
  assert.equal(total(valid), 185000);
  assert.equal(subtotal(valid), 185000);
});

test("alur lengkap check-in sampai pembayaran menghasilkan A-012", () => {
  const vehicle = vehicleOf(seed(), "B 1234 ABC");
  let state = seed();

  // Check-in membuat draft inspeksi.
  const draft = createDraft(state, vehicle.id);
  state = draft.state;
  assert.equal(draft.order.status, "CHECKED_IN");
  assert.equal(draft.order.queue, "");

  // Inspeksi: kekotoran sedang, area body/kaca/interior/jok.
  const inspection = { dirt: "Sedang" as const, areas: ["Body", "Kaca", "Interior", "Jok"], notes: "Noda cukup berat pada jok belakang.", photos: [] };
  const items = recommend(inspection, state.services);
  state = { ...state, orders: state.orders.map(o => o.id === draft.order.id ? { ...o, inspection, items } : o) };
  assert.equal(total(orderOf(state, draft.order.id)), 185000);

  // Konfirmasi → nomor antrean A-012.
  state = confirmOrder(state, draft.order.id);
  assert.equal(orderOf(state, draft.order.id).queue, "A-012");
  assert.equal(orderOf(state, draft.order.id).status, "QUEUED");
  assert.equal(state.nextQueue, 13);

  // Menunggu → dicuci di Bay 2.
  state = advanceOrder(state, draft.order.id, "WASHING", 2);
  assert.equal(orderOf(state, draft.order.id).bay, 2);
  state = advanceOrder(state, draft.order.id, "QUALITY_CHECK");
  state = advanceOrder(state, draft.order.id, "READY");
  assert.equal(orderOf(state, draft.order.id).status, "READY");

  // Pembayaran QRIS.
  state = payOrder(state, draft.order.id, "QRIS", 185000);
  const order = orderOf(state, draft.order.id);
  assert.equal(order.status, "COMPLETED");
  assert.ok(!isActive(order));

  const trx = state.transactions.find(t => t.workOrderId === order.id)!;
  assert.equal(trx.amount, 185000);
  assert.equal(trx.method, "QRIS");
  assert.match(trx.id, new RegExp(`^TRX-${dayOf(trx.paidAt).replaceAll("-", "")}-\\d{4}$`));

  // Riwayat kendaraan kini 6 kunjungan senilai Rp1.025.000.
  const completed = state.orders.filter(o => o.vehicleId === vehicle.id && o.status === "COMPLETED");
  assert.equal(completed.length, 6);
  const spend = completed.reduce((sum, o) => sum + state.transactions.find(t => t.workOrderId === o.id)!.amount, 0);
  assert.equal(spend, 1025000);
});

test("transisi status yang tidak sah ditolak", () => {
  const state = seed();
  const queued = state.orders.find(o => o.status === "QUEUED")!;

  // Melompati tahapan tidak diperbolehkan.
  assert.throws(() => advanceOrder(state, queued.id, "READY"), /tidak valid/);
  // Memulai pencucian tanpa bay ditolak.
  assert.throws(() => advanceOrder(state, queued.id, "WASHING"), /bay/i);
  // Bay di luar jumlah yang tersedia ditolak.
  assert.throws(() => advanceOrder(state, queued.id, "WASHING", 9), /bay/i);
  // Bay yang sedang terpakai ditolak.
  assert.throws(() => advanceOrder(state, queued.id, "WASHING", 1), /sedang digunakan/i);
  // Membatalkan pesanan yang sudah selesai ditolak.
  const completed = state.orders.find(o => o.status === "COMPLETED")!;
  assert.throws(() => advanceOrder(state, completed.id, "CANCELLED"), /tidak valid/);
});

test("pembayaran hanya untuk kendaraan siap diambil", () => {
  const state = seed();
  const washing = state.orders.find(o => o.status === "WASHING")!;
  assert.throws(() => payOrder(state, washing.id, "Tunai", 999999), /siap diambil/i);

  const ready = state.orders.find(o => o.status === "READY")!;
  const amount = total(ready);
  assert.throws(() => payOrder(state, ready.id, "Tunai", amount - 1), /kurang dari total/i);
  assert.throws(() => payOrder(state, ready.id, "Bitcoin" as never, amount), /tidak valid/i);
  assert.equal(payOrder(state, ready.id, "Tunai", amount + 5000).orders.find(o => o.id === ready.id)!.status, "COMPLETED");
});

test("konfirmasi ganda dan kendaraan asing ditolak", () => {
  const state = seed();
  const checkedIn = createDraft(state, vehicleOf(state, "B 1234 ABC").id);
  assert.throws(() => confirmOrder(checkedIn.state, "tidak-ada"), /tidak ditemukan/);
  assert.throws(() => createDraft(state, "kendaraan-asing"), /tidak ditemukan/);

  // Check-in ulang kendaraan yang sama mengembalikan pesanan aktif, bukan duplikat.
  const again = createDraft(checkedIn.state, vehicleOf(state, "B 1234 ABC").id);
  assert.equal(again.order.id, checkedIn.order.id);
  assert.equal(again.state.orders.length, checkedIn.state.orders.length);
});

test("waktu berlalu tidak pernah negatif", () => {
  assert.ok(elapsed(`${DEMO_DAY}T00:00:00+07:00`) >= 0);
  assert.equal(elapsed("2030-01-01T00:00:00+07:00"), 0);
});

test("dashboard mencakup pekerjaan lintas hari dan memakai waktu cuci hingga siap", () => {
  const state = seed();
  const order = state.orders.find(order => order.status === "WASHING")!;
  state.orders = [
    { ...order, createdAt: "2026-10-11T23:00:00+07:00", status: "WASHING", bay: 1 },
    { ...order, id: "finished", status: "READY", bay: 2, timeline: [{ label: "Sedang Dicuci", at: "2026-10-12T08:00:00+07:00" }, { label: "Siap Diambil", at: "2026-10-12T08:45:00+07:00" }] },
    { ...order, id: "older-label", status: "COMPLETED", bay: 2, timeline: [{ label: "Mulai dicuci", at: "2026-10-12T09:00:00+07:00" }, { label: "Siap diambil", at: "2026-10-12T09:15:00+07:00" }] },
  ];
  state.transactions = [{ id: "paid", workOrderId: "older-label", paidAt: "2026-10-12T09:20:00+07:00", method: "QRIS", amount: 120000, received: 120000 }];
  const summary = dashboardSummary(state, "2026-10-12");
  assert.equal(summary.active.length, 2);
  assert.equal(summary.availableBays, 2);
  assert.equal(summary.completed, 2);
  assert.equal(summary.averageMinutes, 30);
  assert.equal(summary.revenue, 120000);
  const empty = dashboardSummary({ ...state, orders: [], transactions: [] }, "2026-10-12");
  assert.equal(empty.averageMinutes, null);
  assert.equal(empty.revenue, 0);
  assert.equal(empty.availableBays, 3);
});

test("antrean hari ini selalu berada di masa lalu dengan waktu tunggu wajar", () => {
  const state = seed();
  const active = state.orders.filter(o => dayOf(o.createdAt) === DEMO_DAY && isActive(o));
  assert.ok(active.length > 0, "Harus ada kendaraan aktif hari ini");

  const waits = active.map(o => elapsed(o.createdAt));
  // Demo dibuka kapan pun, jadi tidak boleh ada kendaraan "menunggu" berjam-jam.
  assert.ok(Math.max(...waits) <= 3 * 60, `Waktu tunggu terpanjang tidak wajar: ${Math.max(...waits)} menit`);
  for (const order of active) {
    assert.ok(new Date(order.createdAt).getTime() <= new Date(demoNow()).getTime(), `Pesanan ${order.queue} berada di masa depan`);
    assert.equal(dayOf(order.createdAt), DEMO_DAY, `Pesanan ${order.queue} tidak berada pada tanggal demo`);
  }
});
