/**
 * Uji logika domain dan invariasi data contoh.
 * Jalankan dengan: npm test
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { seed } from "../src/lib/seed.ts";
import {
  advanceOrder, confirmOrder, createDraft, dayOf, DEMO_DAY, demoNow, elapsed, isActive, maskedPlate,
  normalizePlate, payOrder, recommend, rupiah, subtotal, total, validatePrice,
  type DemoState, type WorkOrder,
} from "../src/lib/domain.ts";

const vehicleOf = (state: DemoState, plate: string) => state.vehicles.find(v => normalizePlate(v.plate) === normalizePlate(plate))!;
const orderOf = (state: DemoState, id: string) => state.orders.find(o => o.id === id)!;
const todayOrders = (state: DemoState) => state.orders.filter(o => dayOf(o.createdAt) === DEMO_DAY && o.status !== "CANCELLED");

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
    .filter(o => o.status === "COMPLETED" && dayOf(o.createdAt) >= "2026-09-26" && dayOf(o.createdAt) <= DEMO_DAY)
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
  assert.match(trx.id, /^TRX-20261002-\d{4}$/);

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
