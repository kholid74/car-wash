import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const key = "kalsara-car-wash-v1";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(15000);
await page.emulateMedia({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if (message.type() === "error" && !/favicon/.test(message.text())) errors.push(message.text()); });
const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);

try {
  await page.goto(`${base}/admin`);
  await page.getByLabel("Email", { exact: true }).fill("admin@klautocare.demo");
  await page.getByLabel("Kata sandi", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Ringkasan operasional" })).toBeVisible();

  await page.goto(`${base}/admin/membership`);
  await page.getByRole("button", { name: "Catat poin" }).first().click();
  await page.getByLabel("Jumlah poin", { exact: true }).fill("75");
  await page.getByLabel("Catatan", { exact: true }).fill("Kunjungan demo");
  await page.getByRole("button", { name: "Simpan poin" }).click();
  assert.equal((await state()).memberships[0].points, 525);
  await expect(page.getByRole("status")).toContainText("ditambahkan");

  await page.goto(`${base}/admin/employees`);
  await page.getByRole("button", { name: "Tambah petugas" }).click();
  await page.getByLabel("Nama", { exact: true }).fill("Dina Demo");
  await page.getByLabel("Jabatan", { exact: true }).fill("Wash specialist");
  await page.getByRole("button", { name: "Simpan petugas" }).click();
  const employee = (await state()).employees.find(item => item.name === "Dina Demo");
  assert.ok(employee);
  await page.getByLabel("Kehadiran Dina Demo").selectOption("HADIR");
  assert.equal((await state()).attendance.find(item => item.employeeId === employee.id).status, "HADIR");

  await page.goto(`${base}/admin/commissions`);
  await page.getByLabel("Persentase komisi Basic Wash").fill("15");
  await page.locator("tbody tr").filter({ hasText: "Basic Wash" }).getByRole("button", { name: "Simpan" }).click();
  assert.equal((await state()).commissionRules.find(item => item.serviceId === "basic").rate, 15);
  await expect(page.getByRole("heading", { name: "Estimasi penghasilan" })).toBeVisible();

  await page.goto(`${base}/admin/inventory`);
  await page.getByRole("button", { name: "Tambah barang" }).click();
  await page.getByLabel("Nama barang").fill("Pembersih kaca");
  await page.getByLabel("Satuan").fill("liter");
  await page.getByLabel("Stok awal").fill("5");
  await page.getByLabel("Batas minimum").fill("2");
  await page.getByRole("button", { name: "Simpan" }).click();
  let inventory = (await state()).inventory.find(item => item.name === "Pembersih kaca");
  assert.equal(inventory.quantity, 5);
  await page.getByRole("button", { name: "Catat stok" }).last().click();
  await page.getByLabel("Jumlah", { exact: true }).fill("2");
  await page.getByLabel("Catatan", { exact: true }).fill("Pemakaian hari ini");
  await page.getByRole("button", { name: "Simpan" }).click();
  inventory = (await state()).inventory.find(item => item.name === "Pembersih kaca");
  assert.equal(inventory.quantity, 3);
  assert.equal((await state()).inventoryMovements[0].delta, -2);

  await page.goto(`${base}/admin/expenses`);
  await page.getByRole("button", { name: "Catat pengeluaran" }).click();
  await page.getByLabel("Keterangan").fill("Servis pompa demo");
  await page.getByLabel("Jumlah (Rp)").fill("175000");
  await page.getByRole("button", { name: "Simpan" }).click();
  assert.ok((await state()).expenses.some(item => item.description === "Servis pompa demo" && item.amount === 175000));
  await expect(page.getByText("Servis pompa demo")).toBeVisible();

  await page.goto(`${base}/admin/branches`);
  await page.getByRole("button", { name: "Tambah cabang" }).click();
  await page.getByLabel("Nama cabang").fill("KL Autocare Cikupa");
  await page.getByLabel("Awalan antrean").fill("C");
  await page.getByLabel("Alamat").fill("Jl. Raya Cikupa");
  await page.getByLabel("Telepon").fill("081200000003");
  await page.getByLabel("Jumlah bay").fill("2");
  await page.getByLabel("Jam buka").fill("08:00");
  await page.getByLabel("Jam tutup").fill("17:00");
  await page.getByRole("button", { name: "Simpan cabang" }).click();
  const branch = (await state()).branches.find(item => item.name === "KL Autocare Cikupa");
  assert.equal(branch.prefix, "C");
  await page.locator(".branch-admin-grid .panel").filter({ hasText: "KL Autocare Cikupa" }).getByRole("button", { name: "Jadikan aktif" }).click();
  await expect(page.getByLabel("Cabang aktif")).toContainText("KL Autocare Cikupa");
  assert.equal((await state()).activeBranchId, branch.id);

  await page.goto(`${base}/admin/reports`);
  await expect(page.getByRole("heading", { name: "Pelanggan & membership" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Produktivitas petugas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pengeluaran operasional" })).toBeVisible();
  await page.goto(`${base}/admin/promotions`);
  await page.getByRole("button", { name: "Nonaktifkan" }).click();
  await page.getByRole("button", { name: "Pratinjau voucher" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("DETAIL10");
  await page.getByRole("button", { name: "Tutup pratinjau" }).click();
  assert.equal((await state()).showcase.promotions[0].active, false);
  await page.goto(`${base}/admin/feedback`);
  await page.getByRole("button", { name: "Tandai ditinjau" }).first().click();
  assert.equal((await state()).showcase.feedback[0].status, "DITINJAU");
  await page.goto(`${base}/admin/roles`);
  await page.getByRole("checkbox", { name: "Kelola check-in" }).first().check();
  assert.ok((await state()).showcase.roles.some(role => role.permissions.includes("Kelola check-in")));
  await page.goto(`${base}/admin/payments`);
  await page.getByLabel("QRIS aktif").uncheck();
  assert.equal((await state()).showcase.paymentOptions.find(item => item.name === "QRIS").active, false);
  await page.goto(`${base}/admin/notifications`);
  await page.getByRole("button", { name: "Pratinjau pesan" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Andi");
  await expect(page.getByRole("dialog")).toContainText("tidak dikirim");
  await page.getByRole("button", { name: "Tutup pratinjau" }).click();
  await page.goto(`${base}/admin/website`);
  await page.getByLabel("Pesan pengumuman").fill("Paket perawatan akhir pekan");
  await page.getByLabel("Tampilkan di website publik").check();
  await page.getByRole("button", { name: "Simpan pengumuman" }).click();
  await page.goto(base);
  await expect(page.locator(".public-notice")).toContainText("Paket perawatan akhir pekan");
  assert.equal((await state()).showcase.websiteNotice.visible, true);
  await page.setViewportSize({ width: 390, height: 900 });
  for (const path of ["membership", "employees", "commissions", "inventory", "expenses", "branches", "reports", "promotions", "feedback", "roles", "payments", "notifications", "website"]) {
    await page.goto(`${base}/admin/${path}`);
    await expect(page.locator(".main-content h1")).toBeVisible();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path} overflows at mobile width`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/admin/settings`);
  await page.getByRole("button", { name: "Reset Demo" }).click();
  await page.getByRole("button", { name: "Ya, Reset Demo" }).click();
  const reset = await state();
  assert.equal(reset.version, 4);
  assert.equal(reset.showcase.websiteNotice.visible, false);
  assert.equal(reset.branches.some(item => item.name === "KL Autocare Cikupa"), false);
  assert.equal(reset.showcase.promotions[0].active, true);
  assert.deepEqual(errors, []);
  console.log("Business passed: membership, employee attendance, commissions, inventory, expenses, branch management, reports, promotion/feedback/role/payment/notification/website showcases, responsive layouts and console checks.");
} finally { await browser.close(); }
