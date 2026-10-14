import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const key = "kalsara-car-wash-v1";
const legacy = JSON.parse(await readFile(new URL("./fixtures/demo-v1.json", import.meta.url), "utf8"));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
await page.emulateMedia({ reducedMotion: "reduce" });
page.setDefaultTimeout(15000);
const errors = [];
page.on("pageerror", error => errors.push(error.message));
await mkdir("test-results", { recursive: true });
const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
async function reset() {
  await page.getByRole("button", { name: "Reset Demo", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Ya, Reset Demo", exact: true }).click();
}
async function responsive(name) {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); document.querySelector(".queue-board")?.scrollTo(0, 0); });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} overflows at ${width}`);
    await page.screenshot({ path: `test-results/${name}-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

try {
  await page.goto(base);
  await page.evaluate(({ key, legacy }) => localStorage.setItem(key, JSON.stringify(legacy)), { key, legacy });
  await page.goto(`${base}/admin`);
  await page.getByLabel("Email", { exact: true }).fill("admin@klautocare.demo");
  await page.getByLabel("Kata sandi", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Ringkasan operasional" })).toBeVisible();
  const migrated = await saved();
  assert.equal(migrated.version, 4);
  assert.equal(migrated.nextQueue, 42);
  assert.deepEqual(migrated.transactions, legacy.transactions);
  assert.deepEqual(migrated.orders.map(({ branchId, employeeId, ...order }) => { assert.equal(branchId, "main"); assert.equal(employeeId, null); return order; }), legacy.orders);
  await page.goto(`${base}/admin/settings`);
  await expect(page.getByLabel("Nama usaha", { exact: true })).toHaveValue(legacy.settings.name);
  await reset();
  await expect(page.getByLabel("Nama usaha", { exact: true })).not.toHaveValue(legacy.settings.name);
  const initial = await saved();
  await page.getByLabel("Jumlah bay tersedia").fill("2");
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.locator(".error-message")).toContainText("masih digunakan");
  assert.equal((await saved()).branches[0].bays, 3);

  // Every operational view uses the selected branch, while customers remain shared.
  await page.getByLabel("Cabang aktif").selectOption("bsd");
  await expect(page.getByRole("heading", { name: "Ringkasan operasional" })).toBeVisible();
  await expect(page.locator(".metric-card").filter({ hasText: "Pendapatan Hari Ini" }).locator(":scope > strong")).toHaveText("Rp0");
  await page.goto(`${base}/admin/queue`);
  await expect(page.locator(".queue-card")).toHaveCount(0);
  await page.goto(`${base}/admin/settings`);
  await page.getByLabel("Jam tutup").fill("07:00");
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.locator(".error-message")).toContainText("Jam tutup");
  await page.getByLabel("Jam tutup").fill("18:00");
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.getByRole("status")).toContainText("Pengaturan berhasil");
  assert.equal((await saved()).branches.find(branch => branch.id === "bsd").closesAt, "18:00");
  await page.goto(`${base}/admin/check-in`);
  await page.getByRole("button", { name: "Kendaraan Baru", exact: true }).click();
  await page.getByLabel("Nomor Polisi *", { exact: true }).fill("B 4321 XYZ");
  await page.getByLabel("Model *", { exact: true }).fill("Avanza");
  await page.getByLabel("Merek", { exact: true }).fill("Toyota");
  await page.getByLabel("Jenis Kendaraan").selectOption("MPV");
  await page.getByLabel("Pemilik kendaraan").selectOption(initial.customers[0].id);
  await responsive("check-in");
  await page.getByRole("button", { name: "Simpan & Lanjut Inspeksi" }).click();
  await expect(page.getByRole("heading", { name: "Inspeksi Kondisi Kendaraan" })).toBeVisible();
  const registered = await saved();
  assert.equal(registered.customers.length, initial.customers.length);
  const vehicle = registered.vehicles.find(vehicle => vehicle.plate === "B 4321 XYZ");
  assert.equal(vehicle.customerId, initial.customers[0].id);
  const order = registered.orders.find(order => order.vehicleId === vehicle.id);
  assert.equal(order.branchId, "bsd");
  await page.locator('input[type="file"]').focus();
  await expect(page.locator('input[type="file"]')).toBeFocused();
  await page.getByLabel("Catatan inspeksi").fill("Goresan ringan di pintu kiri; pelanggan meminta detailing.");
  await responsive("inspection");
  await page.getByRole("button", { name: "Lihat Rekomendasi Layanan" }).click();
  await page.getByRole("checkbox", { name: "Pilih Premium Wash", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Pilih Detailing", exact: true }).check();
  await page.getByLabel("Diskon (Rp)").fill("10000");
  await page.getByRole("button", { name: "Lanjut Konfirmasi" }).click();
  await page.getByRole("radio", { name: "Ubah Harga Manual" }).check();
  await page.getByLabel("Total harga manual (Rp)").fill("275000");
  await page.getByRole("checkbox", { name: /telah menyetujui/ }).check();
  await page.getByRole("button", { name: "Konfirmasi & Masuk Antrean" }).click();
  await expect(page.locator(".queue-ticket strong")).toHaveText("B-012");
  await page.goto(`${base}/admin/queue`);
  const card = page.locator(".queue-card").filter({ hasText: "B-012" });
  await card.getByLabel("Petugas B-012").selectOption("staff-3");
  await card.getByRole("button", { name: "Mulai Cuci" }).click();
  await expect(page.getByRole("dialog").getByRole("radio")).toHaveCount(2);
  await page.getByRole("dialog").getByRole("radio", { name: /Bay 1/ }).check();
  await page.getByRole("dialog").getByRole("button", { name: "Mulai Cuci" }).click();
  await expect(page.locator(".column-detailing .queue-card")).toContainText("B-012");
  await expect(card.getByText(/Perkiraan siap/)).toBeVisible();
  await responsive("queue");

  const display = await context.newPage();
  await display.goto(`${base}/display/queue`);
  await expect(display.locator(".display-brand")).toContainText("BSD");
  await expect(display.getByText("B-012", { exact: true })).toBeVisible();
  assert.ok(!(await display.locator("body").innerText()).includes(initial.customers[0].phone));
  await card.getByRole("button", { name: "Kirim ke QC" }).click();
  await card.getByRole("button", { name: "Tandai Siap" }).click();
  await expect(display.locator(".display-ready-card")).toContainText("B-012");
  await page.goto(`${base}/admin/cashier`);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator(".cashier-overview")).toContainText("Rp275.000");
  await responsive("pos-list");
  await expect(page.locator("tbody tr")).toContainText("Rp275.000");
  await page.getByRole("link", { name: "Proses Pembayaran" }).click();
  await responsive("cashier");
  await page.getByLabel("Uang diterima (Rp)").fill("300000");
  await expect(page.getByText("Rp25.000", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Proses Pembayaran" }).click();
  await expect(page.getByRole("heading", { name: "Pembayaran Berhasil" })).toBeVisible();
  await page.getByRole("button", { name: "Lihat Receipt" }).click();
  await expect(page.getByRole("dialog")).toContainText("KL Autocare BSD");
  await expect(page.getByRole("dialog")).toContainText("Rp275.000");
  await page.keyboard.press("Escape");
  const paid = await saved();
  assert.equal(paid.transactions.filter(transaction => transaction.workOrderId === order.id).length, 1);
  assert.deepEqual(paid.orders.filter(order => order.branchId === "main"), initial.orders);
  await page.goto(`${base}/admin/transactions`);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto(`${base}/admin/work-orders`);
  await page.getByLabel("Filter status pesanan").selectOption("QUEUED");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByLabel("Filter status pesanan").selectOption("COMPLETED");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.goto(`${base}/admin`);
  await expect(page.locator(".metric-card").filter({ hasText: "Pendapatan Hari Ini" }).locator(":scope > strong")).toHaveText("Rp275.000");
  await page.getByLabel("Cabang aktif").selectOption("main");
  await expect(display.locator(".display-brand")).not.toContainText("BSD");
  await expect(display.getByText("B-012", { exact: true })).toHaveCount(0);
  await display.close();
  await page.goto(`${base}/admin/work-orders/${order.id}`);
  await expect(page.getByRole("button", { name: /Beralih ke/ })).toBeVisible();
  await page.getByRole("button", { name: /Beralih ke/ }).click();
  await expect(page.getByRole("heading", { name: "Detail pengerjaan B-012" })).toBeVisible();
  await responsive("work-order");

  // Corrupt data must survive refresh and cancelled reset; only explicit reset replaces it.
  const corrupt = "{original-broken-json";
  await page.evaluate(({ key, corrupt }) => localStorage.setItem(key, corrupt), { key, corrupt });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Data demo perlu diperiksa" })).toBeVisible();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), corrupt);
  await expect(page.getByRole("link", { name: "Unduh data asli" })).toHaveAttribute("href", `data:application/json;charset=utf-8,${encodeURIComponent(corrupt)}`);
  await page.getByRole("button", { name: "Reset Demo", exact: true }).click();
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(key => localStorage.getItem(key), key), corrupt);
  await reset();
  await expect(page.getByLabel("Cabang aktif")).toHaveValue("main");
  assert.equal((await saved()).nextQueue, 12);

  // Quota failures must leave legacy data intact and show save feedback.
  await page.evaluate(({ key, legacy }) => localStorage.setItem(key, JSON.stringify(legacy)), { key, legacy });
  await page.addInitScript(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException("Storage full", "QuotaExceededError"); return original.call(this, name, value); };
  }, key);
  await page.goto(`${base}/admin/settings`);
  await expect(page.locator(".storage-warning")).toContainText("pembaruan belum tersimpan");
  assert.deepEqual(await saved(), legacy);
  await page.getByLabel("Nama usaha", { exact: true }).fill("Tidak boleh tersimpan");
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.locator(".error-message")).toContainText("Data belum disimpan");
  assert.deepEqual(await saved(), legacy);
  assert.deepEqual(errors, []);
  console.log("Operations passed: v1 migration, existing owner, scoped branches/bays/staff, detailing, manual price/payment, receipt, live display, recovery, responsive layouts.");
} finally { await browser.close(); }
