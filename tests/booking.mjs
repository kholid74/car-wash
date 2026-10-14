import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const key = "kalsara-car-wash-v1";
const legacy = JSON.parse(await readFile(new URL("./fixtures/demo-v2.json", import.meta.url), "utf8"));
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
await page.emulateMedia({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);

async function booking({ plate, name, slot, phone = "0812-9876-5432" }) {
  await page.goto(`${base}/booking?branch=bsd&service=detailing`);
  await expect(page.getByRole("heading", { name: /Waktu untuk/ })).toBeVisible();
  await page.getByRole("button", { name: "Pilih cabang & jadwal" }).click();
  const date = await page.locator("#booking-date").inputValue();
  for (const width of [768, 390]) {
    await page.setViewportSize({ width, height: 950 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Booking form overflows at ${width}px`);
    if (width === 390) await page.screenshot({ path: "test-results/booking-schedule-390.png", fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  const slotButton = page.getByRole("button", { name: new RegExp(`^${slot} `) });
  await expect(slotButton).toBeEnabled();
  await slotButton.click();
  await page.getByRole("button", { name: "Data pelanggan" }).click();
  await page.getByLabel("Nama lengkap", { exact: true }).fill(name);
  await page.getByLabel("Nomor WhatsApp", { exact: true }).fill(phone);
  await page.getByLabel("Nomor polisi", { exact: true }).fill(plate);
  await page.getByLabel("Merek", { exact: true }).fill("Honda");
  await page.getByLabel("Model kendaraan", { exact: true }).fill("HR-V");
  await page.getByRole("button", { name: "Kirim permintaan" }).click();
  await expect(page.getByRole("heading", { name: new RegExp(`Terima kasih,.*${name}`) })).toBeVisible();
  return { date, ...await state().then(saved => ({ booking: saved.reservations.at(-1) })) };
}

try {
  await page.goto(base);
  await page.evaluate(({ key, legacy }) => localStorage.setItem(key, JSON.stringify(legacy)), { key, legacy });
  await page.reload();
  await expect(page.getByRole("heading", { name: /Detail kecil/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pilih jadwal perawatan" })).toBeVisible();
  for (const section of ["CAR WASH & DETAILING STUDIO", "CARE THAT SHOWS", "OUR CRAFT", "PERTANYAAN UMUM", "KUNJUNGI KAMI"]) {
    if (section === "CAR WASH & DETAILING STUDIO") await expect(page.getByText(section).first()).toBeVisible();
    else await expect(page.getByText(new RegExp(section)).first()).toBeVisible();
  }
  await expect(page.locator(".package-card")).toHaveCount(3);
  assert.ok(await page.locator("img").count() >= 3);
  await page.screenshot({ path: "test-results/public-full-1440.png", fullPage: true });
  for (const [path, title] of [["/layanan", /Perawatan sesuai/], ["/layanan/premium", /Premium Wash/], ["/membership", /Perjalanan rutin/], ["/tentang", /dimulai dengan perhatian/], ["/kontak", /kunjungan Anda/]]) {
    await page.goto(`${base}${path}`);
    await expect(page.locator("main h1")).toContainText(title);
    assert.equal(await page.locator(".sidebar").count(), 0);
  }
  for (const width of [768, 390]) {
    await page.goto(base);
    await page.setViewportSize({ width, height: 950 });
    await expect(page.getByRole("heading", { name: /Detail kecil/ })).toBeVisible();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Public page overflows at ${width}px`);
    await page.screenshot({ path: `test-results/public-home-${width}.png`, fullPage: true });
  }

  const first = await booking({ plate: "B 7001 XYZ", name: "Nadia Demo", slot: "08:00" });
  const second = await booking({ plate: "B 7002 XYZ", name: "Rafi Demo", slot: "08:00" });
  assert.equal(first.booking.status, "PENDING");
  assert.match(first.booking.reference, /^VC-\d{8}-\d{4}$/);
  assert.equal(first.booking.service.price, legacy.services.find(service => service.id === "detailing").price);
  await page.goto(`${base}/booking?branch=bsd&service=detailing`);
  await page.getByRole("button", { name: "Pilih cabang & jadwal" }).click();
  await expect(page.getByRole("button", { name: /^08:00 .*Penuh/ })).toBeDisabled();
  const third = await booking({ plate: "B 7003 XYZ", name: "Bima Demo", slot: "09:00" });
  assert.equal(third.booking.date, first.booking.date);
  assert.equal(second.booking.date, first.booking.date);

  const admin = await context.newPage();
  await admin.goto(`${base}/admin`);
  await admin.getByLabel("Email", { exact: true }).fill("admin@klautocare.demo");
  await admin.getByLabel("Kata sandi", { exact: true }).fill("demo123");
  await admin.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(admin.getByRole("heading", { name: "Ringkasan operasional" })).toBeVisible();
  await admin.getByLabel("Cabang aktif").selectOption("bsd");
  await admin.goto(`${base}/admin/reservations`);
  await expect(admin.locator(".reservation-card")).toHaveCount(3);
  await expect(admin.locator(".reservation-card").filter({ hasText: first.booking.reference })).toContainText("Nadia Demo");
  await admin.getByLabel("Tanggal", { exact: true }).fill(first.booking.date);
  await expect(admin.locator(".reservation-card")).toHaveCount(3);
  await admin.locator(".reservation-toolbar select").selectOption("PENDING");
  await expect(admin.locator(".reservation-card")).toHaveCount(3);
  await admin.locator(".reservation-toolbar select").selectOption("");
  await admin.setViewportSize({ width: 390, height: 950 });
  assert.ok(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Reservation view overflows at mobile width");
  await admin.screenshot({ path: "test-results/reservations-390.png", fullPage: true });
  await admin.setViewportSize({ width: 1440, height: 1000 });

  const thirdCard = admin.locator(".reservation-card").filter({ hasText: third.booking.reference });
  await thirdCard.getByRole("button", { name: "Konfirmasi" }).click();
  await expect(thirdCard.getByText("Dikonfirmasi")).toBeVisible();
  await admin.locator(".reservation-card").filter({ hasText: first.booking.reference }).getByRole("button", { name: "Konfirmasi" }).click();
  await admin.locator(".reservation-card").filter({ hasText: second.booking.reference }).getByRole("button", { name: "Konfirmasi" }).click();

  await thirdCard.getByRole("button", { name: "Jadwal" }).click();
  const dialog = admin.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: /^08:00/ })).toBeDisabled();
  await dialog.getByRole("button", { name: "Tutup dialog" }).click();
  const firstCard = admin.locator(".reservation-card").filter({ hasText: first.booking.reference });
  await firstCard.getByRole("button", { name: "Batalkan" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Batalkan reservasi", exact: true }).click();
  await thirdCard.getByRole("button", { name: "Jadwal" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: /^08:00/ }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Simpan jadwal" }).click();
  await expect(thirdCard).toContainText("08:00");
  await thirdCard.getByRole("button", { name: "Check-in" }).click();
  await expect(admin.getByRole("heading", { name: "Inspeksi Kondisi Kendaraan" })).toBeVisible();
  const afterCheckIn = await admin.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  const converted = afterCheckIn.reservations.find(booking => booking.id === third.booking.id);
  assert.equal(converted.status, "CHECKED_IN");
  const orderCount = afterCheckIn.orders.length;
  await admin.goto(`${base}/admin/reservations`);
  await admin.getByLabel("Cabang aktif").selectOption("bsd").catch(() => {});
  const checkedIn = admin.locator(".reservation-card").filter({ hasText: third.booking.reference });
  await expect(checkedIn).toContainText("Sudah check-in");
  const workOrderPath = await checkedIn.getByRole("link", { name: "Lihat work order" }).getAttribute("href");
  await admin.goto(`${base}${workOrderPath}`);
  await expect(admin.getByRole("heading", { name: /Detail pengerjaan/ })).toBeVisible();
  assert.equal((await admin.evaluate(key => JSON.parse(localStorage.getItem(key)), key)).orders.length, orderCount);
  await admin.goto(`${base}/admin`);
  await expect(admin.locator(".upcoming-reservation")).toHaveCount(1);

  const confirmation = await context.newPage();
  await confirmation.goto(`${base}/booking/confirmation/${first.booking.id}`);
  await expect(confirmation.getByRole("heading", { name: /Nadia Demo/ })).toBeVisible();
  assert.ok(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  console.log("Booking passed: public sections/catalog, responsive home and form, capacity, v2 migration, admin filters, confirmation, reschedule, cancellation, check-in once, dashboard and confirmation view.");
} finally { await browser.close(); }
