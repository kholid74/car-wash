import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.emulateMedia({ reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", error => errors.push(`${page.url()}: ${error.message}`));
page.on("console", message => { if (message.type() === "error" && !/favicon/.test(message.text())) errors.push(message.text()); });
await mkdir("test-results", { recursive: true });

async function login() {
  await page.getByLabel("Email", { exact: true }).fill("admin@klautocare.demo");
  await page.getByLabel("Kata sandi", { exact: true }).fill("demo123");
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
}

try {
  await page.goto(base);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Detail kecil");
  await expect(page.getByText("KL Autocare", { exact: false }).first()).toBeVisible();
  await page.locator(".booking-preview-fields select").nth(0).selectOption("SUV");
  await page.locator(".booking-preview-fields select").nth(1).selectOption("premium");
  await page.locator(".booking-preview-fields select").nth(2).selectOption("bsd");
  const selectedDate = await page.locator(".booking-preview-fields input[type=date]").inputValue();
  await page.getByRole("link", { name: "Pilih waktu" }).click();
  await expect(page.getByRole("button", { name: "Pilih cabang & jadwal" })).toBeVisible();
  await expect(page.locator(".booking-panel select").first()).toHaveValue("SUV");
  await page.getByRole("button", { name: "Pilih cabang & jadwal" }).click();
  await expect(page.locator(".booking-panel select").first()).toHaveValue("bsd");
  await expect(page.locator("#booking-date")).toHaveValue(selectedDate);
  await page.goto(base);
  await page.locator("#before-after-range").focus();
  await page.keyboard.press("End");
  await expect(page.locator("#before-after-range")).toHaveValue("100");
  assert.equal(await page.locator(".sidebar").count(), 0);
  await page.screenshot({ path: "test-results/public-desktop.png", fullPage: true });

  await page.goto(`${base}/queue`);
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fqueue$/);
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("wrong@klautocare.demo");
  await page.getByLabel("Kata sandi", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "Masuk ke dashboard" }).click();
  await expect(page.locator(".login-form").getByRole("alert")).toContainText("Gunakan email");
  await page.screenshot({ path: "test-results/login-desktop.png", fullPage: true });
  await login();
  await expect(page).toHaveURL(`${base}/admin/queue`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Antrean operasional");
  await page.goto(`${base}/admin/settings`);
  await page.getByLabel("Nama usaha", { exact: true }).fill("Usaha tersimpan v1");
  await page.getByRole("button", { name: "Simpan Pengaturan" }).click();
  await expect(page.getByRole("status")).toContainText("Pengaturan berhasil");
  const saved = await page.evaluate(() => localStorage.getItem("kalsara-car-wash-v1"));
  assert.equal(JSON.parse(saved).version, 4);
  await page.reload();
  await expect(page.getByLabel("Nama usaha", { exact: true })).toHaveValue("Usaha tersimpan v1");
  assert.equal(await page.evaluate(() => localStorage.getItem("kalsara-car-wash-v1")), saved);

  await page.goto(`${base}/admin`);
  await expect(page.getByRole("heading", { name: "Ringkasan operasional" })).toBeVisible();
  const links = await page.locator('nav[aria-label="Navigasi utama"] a').evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
  for (const href of links) {
    await page.goto(`${base}${href}`);
    await expect(page.locator(".main-content h1")).toBeVisible();
    await expect(page.getByText("Halaman tidak ditemukan", { exact: true })).toHaveCount(0);
  }

  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/admin`);
    await expect(page.getByRole("heading", { name: "Ringkasan operasional" })).toBeVisible();
    assert.equal(await page.locator(".dashboard-metrics .metric-card").count(), 6);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Admin overflows at ${width}px`);
    await page.screenshot({ path: `test-results/admin-${width}.png`, fullPage: true });
    if (width < 1024) {
      await page.getByRole("button", { name: "Buka navigasi" }).click();
      await expect(page.getByRole("link", { name: "Quality Control", exact: true })).toBeVisible();
      await page.getByRole("link", { name: "Quality Control", exact: true }).click();
      await expect(page.locator(".main-content h1")).toHaveText("Quality Control");
      await expect(page.getByRole("button", { name: "Buka navigasi" })).toHaveAttribute("aria-expanded", "false");
      await page.getByRole("button", { name: "Buka navigasi" }).click();
      await expect(page.locator(".sidebar .brand")).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Buka navigasi" })).toBeFocused();
    }
    await page.goto(base);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Public overflows at ${width}px`);
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/admin`);
  await page.getByRole("button", { name: "Keluar dari demo" }).click();
  await expect(page.getByRole("button", { name: "Masuk ke dashboard" })).toBeVisible();
  await page.goto(`${base}/admin/work-orders/wo-01`);
  await expect(page).toHaveURL(/\/admin\/login\?next=/);
  assert.equal(await page.locator(".sidebar").count(), 0);
  await page.goto(`${base}/admin/login?next=https://example.com`);
  await login();
  await expect(page).toHaveURL(`${base}/admin`);
  await expect(page.getByRole("heading", { name: "Ringkasan operasional" })).toBeVisible();
  await page.getByRole("button", { name: "Keluar dari demo" }).click();
  await page.goto(`${base}/display/queue`);
  await expect(page.getByRole("heading", { name: "Status Kendaraan" })).toBeVisible();
  assert.equal(await page.locator(".sidebar").count(), 0);
  assert.ok(!(await page.locator("body").innerText()).includes("0812-3456-7890"));
  assert.deepEqual(errors, []);
  console.log("PASS: public/admin routes, login validation/redirect/logout, v4 persistence, every navigation item, responsive layouts, public queue display; no browser errors.");
} finally {
  await browser.close();
}
