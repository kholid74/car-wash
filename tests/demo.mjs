/**
 * Uji alur demo utama (golden path) pada browser sungguhan.
 *
 * Jalankan aplikasi lebih dulu, lalu:
 *   npm run dev
 *   npm run test:e2e
 *
 * Alur yang diuji mengikuti bagian "DEMO STORY / GOLDEN PATH" pada brief:
 * dashboard → check-in B 1234 ABC → inspeksi → rekomendasi → konfirmasi A-012
 * → layar antrean → mulai cuci Bay 2 → QC → siap diambil → pembayaran QRIS
 * → riwayat kendaraan.
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
/** PNG 1×1 transparan, dipakai untuk menguji pratinjau foto inspeksi. */
const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const results = [];
let failures = 0;

async function step(name, fn) {
  try {
    await fn();
    results.push(`  ✔ ${name}`);
  } catch (error) {
    failures++;
    results.push(`  ✖ ${name}\n      ${error.message.split("\n")[0]}`);
  }
}

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
// Batas waktu per aksi dibuat pendek supaya kegagalan cepat terlihat, bukan menggantung.
page.setDefaultTimeout(Number(process.env.STEP_TIMEOUT ?? 15000));

const consoleErrors = [];
page.on("console", message => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", error => consoleErrors.push(`pageerror: ${error.message}`));

// Mulai dari state bersih agar hasilnya dapat diulang.
await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });

console.log(`\nUji alur demo pada ${BASE}\n`);

await step("1. Dashboard menampilkan operasional hari ini", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Selamat datang", exact: false }).waitFor();
  check(await page.getByText("Kendaraan Hari Ini").isVisible(), "Metrik 'Kendaraan Hari Ini' tidak tampil");
  check(await page.getByText("Antrean operasional").isVisible(), "Panel antrean tidak tampil");
  const queue = page.locator(".dashboard-queue");
  check(await queue.locator(".dashboard-queue-row").first().isVisible(), "Baris antrean tidak tampil di dashboard");
  check(/A-\d{3}/.test(await queue.innerText()), "Nomor antrean tidak tampil di dashboard");
  // Kendaraan yang sedang dikerjakan harus muncul lebih dulu daripada yang masih menunggu.
  check((await queue.locator(".dashboard-queue-row").first().innerText()).includes("Sedang Dicuci"), "Dashboard tidak memprioritaskan kendaraan yang sedang dikerjakan");
});

await step("2. Klik + Check-in Kendaraan", async () => {
  await page.getByRole("link", { name: /Check-in Kendaraan/ }).first().click();
  await page.getByRole("heading", { name: "Check-in Kendaraan" }).waitFor();
});

await step("3. Cari B 1234 ABC dan temukan Andi Pratama", async () => {
  await page.getByLabel("Masukkan nomor polisi").fill("B 1234 ABC");
  await page.getByRole("button", { name: "Cari Kendaraan" }).click();
  const found = page.getByText("Kendaraan terdaftar ditemukan");
  await found.waitFor();
  check(await page.getByText("Toyota Fortuner").first().isVisible(), "Model kendaraan tidak tampil");
  check(await page.getByText("Andi Pratama").first().isVisible(), "Nama pelanggan tidak tampil");
  check(await page.getByText("5 kunjungan").isVisible(), "Jumlah kunjungan sebelumnya tidak tampil");
});

await step("4. Lanjut ke inspeksi dan pilih kondisi", async () => {
  await page.getByRole("button", { name: /Lanjut ke Inspeksi/ }).click();
  await page.getByRole("heading", { name: "Inspeksi Kondisi Kendaraan" }).waitFor();
  check(await page.getByText("B 1234 ABC").first().isVisible(), "Plat tidak tampil di inspeksi");

  await page.getByRole("radio", { name: /Sedang/ }).check();
  for (const area of ["Body", "Kaca", "Interior", "Jok"]) {
    await page.getByRole("checkbox", { name: area, exact: true }).check();
  }
  await page.getByLabel("Catatan inspeksi").fill("Noda cukup berat pada jok belakang dan water spot pada kaca depan.");
  check(await page.getByText("Noda cukup berat pada jok belakang").isVisible(), "Catatan inspeksi tidak terisi");

  // Dokumentasi foto: pratinjau lokal tanpa unggahan sungguhan.
  await page.locator('input[type="file"]').setInputFiles({ name: "kondisi-jok.png", mimeType: "image/png", buffer: PNG_1PX });
  await page.locator(".photo-grid img").first().waitFor();
  check(await page.locator(".photo-grid img").count() === 1, "Pratinjau foto tidak muncul");
  check((await page.locator(".sticky-panel").innerText()).includes("1 foto"), "Ringkasan inspeksi belum menghitung foto");
});

await step("5. Rekomendasi menampilkan Premium Wash + Interior Cleaning = Rp185.000", async () => {
  await page.getByRole("button", { name: /Lihat Rekomendasi Layanan/ }).click();
  await page.getByRole("heading", { name: "Rekomendasi Layanan" }).waitFor();
  check(await page.getByText("Direkomendasikan").first().isVisible(), "Label rekomendasi tidak tampil");
  const summary = page.locator(".sticky-panel");
  check(await summary.getByText("Premium Wash").isVisible(), "Premium Wash tidak direkomendasikan");
  check(await summary.getByText("Interior Cleaning").isVisible(), "Interior Cleaning tidak direkomendasikan");
  check(await summary.getByText("Rp185.000").first().isVisible(), "Total Rp185.000 tidak tampil");
});

await step("6. Konfirmasi menghasilkan nomor antrean A-012", async () => {
  await page.getByRole("button", { name: /Lanjut Konfirmasi/ }).click();
  await page.getByRole("heading", { name: "Konfirmasi Layanan & Harga" }).waitFor();
  await page.getByRole("checkbox", { name: /telah menyetujui/ }).check();
  await page.getByRole("button", { name: /Konfirmasi & Masuk Antrean/ }).click();
  await page.getByRole("heading", { name: "Check-in berhasil" }).waitFor();
  check(await page.getByText("A-012").first().isVisible(), "Nomor antrean A-012 tidak muncul");
});

await step("7. Layar antrean menampilkan A-012", async () => {
  await page.goto(`${BASE}/display/queue`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Status Kendaraan" }).waitFor();
  check(await page.getByText("A-012").first().isVisible(), "A-012 tidak tampil di layar antrean");
  check(!(await page.locator("body").innerText()).includes("0812-3456-7890"), "Nomor telepon pelanggan bocor ke layar antrean");
  check(await page.locator(".sidebar").count() === 0, "Layar antrean tidak boleh menampilkan navigasi admin");
});

await step("8. Mulai cuci A-012 di Bay 2 dari halaman antrean", async () => {
  await page.goto(`${BASE}/queue`, { waitUntil: "networkidle" });
  const card = page.locator(".queue-card").filter({ hasText: "A-012" });
  await card.getByRole("button", { name: /Mulai Cuci/ }).click();
  await page.getByRole("dialog").getByRole("radio", { name: /Bay 2/ }).check();
  await page.getByRole("dialog").getByRole("button", { name: /Mulai Cuci/ }).click();
  await page.locator(".toast").filter({ hasText: "Sedang Dicuci" }).waitFor();
  await page.waitForFunction(() => {
    const card = document.querySelector(".column-washing");
    return card && card.textContent.includes("A-012");
  }, null, { timeout: 5000 });
});

await step("9. Layar antrean memperlihatkan A-012 · Sedang Dicuci · Bay 2", async () => {
  await page.goto(`${BASE}/display/queue`, { waitUntil: "networkidle" });
  const row = page.locator(".display-row").filter({ hasText: "A-012" });
  await row.waitFor();
  check((await row.innerText()).includes("Sedang Dicuci"), "Status belum menjadi Sedang Dicuci");
  check((await row.innerText()).includes("Bay 2"), "Bay 2 belum tampil");
  check((await row.innerText()).includes("B 12•• ABC"), "Plat belum disamarkan sesuai pengaturan bawaan");
});

await step("10. Kirim ke Quality Check", async () => {
  await page.goto(`${BASE}/queue`, { waitUntil: "networkidle" });
  const card = page.locator(".queue-card").filter({ hasText: "A-012" });
  await card.getByRole("button", { name: /Kirim ke QC/ }).click();
  await page.locator(".toast").filter({ hasText: "Pemeriksaan Kualitas" }).waitFor();
});

await step("11. Tandai siap diambil dan pastikan disorot di layar antrean", async () => {
  await page.goto(`${BASE}/queue`, { waitUntil: "networkidle" });
  const card = page.locator(".queue-card").filter({ hasText: "A-012" });
  await card.getByRole("button", { name: /Tandai Siap/ }).click();
  await page.locator(".toast").filter({ hasText: "Siap Diambil" }).waitFor();

  await page.goto(`${BASE}/display/queue`, { waitUntil: "networkidle" });
  const column = page.locator(".display-ready");
  const ready = column.locator(".display-ready-card").filter({ hasText: "A-012" });
  await ready.waitFor();
  check((await ready.innerText()).includes("Silakan menuju kasir"), "Kartu siap diambil tidak menampilkan arahan ke kasir");
  check(/siap diambil/i.test(await column.innerText()), "Judul bagian siap diambil tidak tampil");
});

await step("12. Bayar Rp185.000 dengan QRIS", async () => {
  await page.goto(`${BASE}/queue`, { waitUntil: "networkidle" });
  await page.locator(".queue-card").filter({ hasText: "A-012" }).getByRole("link", { name: /Proses Pembayaran/ }).click();
  await page.getByRole("heading", { name: "Pembayaran", exact: true }).waitFor();
  await page.getByRole("radio", { name: "QRIS" }).check();
  check(await page.getByText("Rp185.000").first().isVisible(), "Total pembayaran tidak tampil");
  await page.getByRole("button", { name: /Proses Pembayaran/ }).click();
  await page.getByRole("heading", { name: "Pembayaran Berhasil" }).waitFor();
  check(await page.getByText(/TRX-20261002-\d{4}/).first().isVisible(), "Nomor transaksi tidak tampil");
});

await step("13. Struk dapat dibuka", async () => {
  await page.getByRole("button", { name: /Lihat Receipt/ }).click();
  await page.getByRole("dialog").waitFor();
  const receipt = page.locator(".receipt");
  check((await receipt.innerText()).includes("Rp185.000"), "Struk tidak memuat total");
  check((await receipt.innerText()).includes("QRIS"), "Struk tidak memuat metode pembayaran");
  await page.getByRole("button", { name: "Tutup dialog" }).click();
});

await step("14. Riwayat kendaraan B 1234 ABC bertambah menjadi 6 kunjungan", async () => {
  await page.goto(`${BASE}/vehicles`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Nomor polisi / kendaraan / pelanggan").fill("B 1234 ABC");
  await page.locator("tbody tr").first().getByRole("link").first().click();
  await page.getByRole("heading", { name: "Toyota Fortuner" }).waitFor();
  check(await page.getByText("Rp1.025.000").first().isVisible(), "Total belanja belum Rp1.025.000");
  await page.getByRole("tab", { name: "Riwayat Layanan" }).click();
  await page.locator("tbody tr").first().waitFor();
  const rows = await page.locator("tbody tr").count();
  check(rows === 6, `Riwayat layanan seharusnya 6 baris, ditemukan ${rows}`);
  check((await page.locator("tbody").innerText()).includes("Rp185.000"), "Transaksi hari ini belum masuk riwayat");

  // Foto inspeksi tersimpan bersama riwayat kunjungan.
  await page.getByRole("tab", { name: "Riwayat Inspeksi" }).click();
  await page.locator(".inspection-history").waitFor();
  check(await page.locator(".inspection-history img").count() > 0, "Foto inspeksi tidak tersimpan pada riwayat");
});

await step("15. Reset Demo mengembalikan data awal", async () => {
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Reset Demo/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Ya, Reset Demo/ }).click();
  await page.locator(".toast").filter({ hasText: "Demo telah direset" }).waitFor();

  await page.goto(`${BASE}/display/queue`, { waitUntil: "networkidle" });
  check(await page.locator(".display-row").filter({ hasText: "A-012" }).count() === 0, "A-012 masih ada setelah reset");
});

await step("16. Tidak ada error console yang berarti", async () => {
  const noisy = consoleErrors.filter(text => !/favicon|Download the React DevTools/i.test(text));
  check(noisy.length === 0, `Error console: ${noisy.slice(0, 3).join(" | ")}`);
});

await browser.close();

console.log(results.join("\n"));
console.log(`\n${failures === 0 ? "SEMUA LANGKAH BERHASIL" : `${failures} LANGKAH GAGAL`}\n`);
process.exit(failures === 0 ? 0 : 1);
