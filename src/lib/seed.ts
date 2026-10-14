import { dayAt, emptyInspection, jakartaMinutes, minuteOfDay, type DemoState, type LineItem, type PaymentMethod, type Service, type Status } from "./domain.ts";
import { migrateDemoState, type LegacyWorkOrder } from "./migration.ts";

/**
 * Data contoh untuk prototype.
 *
 * Angka-angka di sini sengaja disusun agar skenario demo utama konsisten:
 * - Antrean hari ini memakai A-001..A-011, sehingga check-in berikutnya menghasilkan A-012.
 * - Bay 2 dibiarkan kosong agar dapat dipilih pada langkah "Mulai Cuci" di alur demo.
 * - B 1234 ABC memiliki 5 kunjungan selesai senilai Rp840.000, sehingga setelah transaksi
 *   demo Rp185.000 totalnya menjadi 6 kunjungan / Rp1.025.000.
 *
 * Waktu pesanan hari ini dihitung mundur dari jam berjalan, jadi antrean selalu terlihat
 * hidup (waktu tunggu beberapa menit) kapan pun demo dibuka.
 */

const people: [string, string, string, string, string, string, string][] = [
  ["Andi Pratama", "0812-3456-7890", "B 1234 ABC", "Toyota", "Fortuner", "Putih", "SUV"],
  ["Siti Rahma", "0813-0000-1001", "B 5678 XYZ", "Toyota", "Avanza", "Silver", "MPV"],
  ["Rizky Maulana", "0813-0000-1002", "B 9988 KLM", "Honda", "Brio", "Kuning", "City Car"],
  ["Dimas Prakoso", "0813-0000-1003", "B 7712 DEF", "Toyota", "Innova Zenix", "Hitam", "MPV"],
  ["Rina Wijaya", "0813-0000-1004", "B 8821 QWE", "Mitsubishi", "Pajero Sport", "Putih", "SUV"],
  ["Fajar Hidayat", "0813-0000-1005", "B 2210 JKT", "Honda", "HR-V", "Abu-abu", "SUV"],
  ["Nadia Putri", "0813-0000-1006", "B 3105 NDP", "Suzuki", "Baleno", "Biru", "City Car"],
  ["Arif Setiawan", "0813-0000-1007", "B 9087 AS", "Toyota", "Camry", "Hitam", "Sedan"],
  ["Maya Lestari", "0813-0000-1008", "B 1623 MLY", "Daihatsu", "Xenia", "Silver", "MPV"],
  ["Budi Santoso", "0813-0000-1009", "B 4432 BST", "Hyundai", "Creta", "Putih", "SUV"],
  ["Dewi Anggraini", "0813-0000-1010", "B 7012 DWA", "Honda", "Civic", "Merah", "Sedan"],
  ["Reza Saputra", "0813-0000-1011", "B 6501 RZA", "Suzuki", "Ertiga", "Abu-abu", "MPV"],
];

const catalog: Omit<Service, "active">[] = [
  { id: "basic", name: "Basic Wash", price: 60000, description: "Cuci eksterior, pembersihan ban, dan pengeringan.", duration: 25 },
  { id: "premium", name: "Premium Wash", price: 120000, description: "Cuci eksterior, vakum interior, pembersihan ban, dan pengeringan.", duration: 45 },
  { id: "interior", name: "Interior Cleaning", price: 65000, description: "Pembersihan dashboard, jok, karpet, dan bagasi.", duration: 30 },
  { id: "detailing", name: "Detailing", price: 250000, description: "Perawatan menyeluruh untuk kilau dan perlindungan body.", duration: 90 },
];

/** Susunan layanan untuk pesanan historis, dipakai agar distribusi laporan konsisten. */
const mix = ["premium", "basic", "premium", "interior", "basic", "premium", "basic", "premium", "interior", "basic", "detailing", "premium"] as const;

/** Geser waktu ISO sebanyak `minutes`, hasilnya tetap dalam zona +07:00. */
function shift(iso: string, minutes: number): string {
  const jakarta = new Date(new Date(iso).getTime() + minutes * 60000 + 7 * 3600000);
  return `${jakarta.toISOString().slice(0, 19)}+07:00`;
}

type Seedling = {
  id: string; vehicleId: string; queue: string; status: Status; at: string;
  services: string[]; bay: number | null; discount?: number; manualTotal?: number; notes?: string;
  finishedAt?: string;
};

export function seed(): DemoState {
  const services: Service[] = catalog.map(service => ({ ...service, active: true }));
  const line = (id: string): LineItem => {
    const service = services.find(item => item.id === id)!;
    return { serviceId: service.id, name: service.name, price: service.price, quantity: 1 };
  };

  const timelineOf = (order: Seedling) => {
    const events: { label: string; at: string }[] = [{ label: "Check-in kendaraan", at: order.at }];
    const offset = (minutes: number) => shift(order.at, minutes);
    if (order.status === "CANCELLED") {
      events.push({ label: "Pesanan dibatalkan", at: offset(6) });
      return events;
    }
    events.push({ label: "Masuk antrean", at: offset(4) });
    if (["WASHING", "QUALITY_CHECK", "READY", "COMPLETED"].includes(order.status)) events.push({ label: "Mulai dicuci", at: offset(18) });
    if (["QUALITY_CHECK", "READY", "COMPLETED"].includes(order.status)) events.push({ label: "Pemeriksaan kualitas", at: offset(38) });
    if (["READY", "COMPLETED"].includes(order.status)) events.push({ label: "Siap diambil", at: offset(45) });
    if (order.status === "COMPLETED") events.push({ label: "Pembayaran selesai", at: order.finishedAt ?? offset(52) });
    return events;
  };

  const build = (seedling: Seedling): LegacyWorkOrder => ({
    id: seedling.id,
    vehicleId: seedling.vehicleId,
    queue: seedling.queue,
    status: seedling.status,
    createdAt: seedling.at,
    inspection: {
      ...emptyInspection(),
      dirt: seedling.services.includes("detailing") ? "Berat" : "Sedang",
      areas: seedling.services.includes("interior") ? ["Body", "Kaca", "Interior", "Jok"] : ["Body", "Kaca"],
      notes: seedling.notes ?? "Kondisi kendaraan dicatat sebelum pencucian.",
    },
    items: seedling.services.map(line),
    discount: seedling.discount ?? 0,
    manualTotal: seedling.manualTotal ?? null,
    notes: "",
    bay: seedling.bay,
    timeline: timelineOf(seedling),
  });

  // Sebar 11 pesanan hari ini mundur dari jam berjalan, sehingga waktu tunggu selalu wajar.
  const nowMinutes = jakartaMinutes();
  const span = Math.min(150, Math.max(10, nowMinutes - 10));
  const startMinutes = Math.max(0, nowMinutes - span);
  const step = (nowMinutes - startMinutes) / 11;
  const todayAt = (index: number) => minuteOfDay(Math.round(startMinutes + index * step));
  const todayDone = (index: number) => minuteOfDay(Math.min(nowMinutes, Math.round(startMinutes + index * step + 52)));

  const seedlings: Seedling[] = [
    { id: "wo-01", vehicleId: "v-1", queue: "A-001", status: "WASHING", at: todayAt(0), services: ["premium"], bay: 1 },
    { id: "wo-02", vehicleId: "v-2", queue: "A-002", status: "WASHING", at: todayAt(1), services: ["premium"], bay: 3 },
    { id: "wo-03", vehicleId: "v-3", queue: "A-003", status: "QUEUED", at: todayAt(2), services: ["premium", "interior"], bay: null },
    { id: "wo-04", vehicleId: "v-4", queue: "A-004", status: "QUEUED", at: todayAt(3), services: ["premium"], bay: null },
    { id: "wo-05", vehicleId: "v-5", queue: "A-005", status: "QUEUED", at: todayAt(4), services: ["basic"], bay: null },
    { id: "wo-06", vehicleId: "v-6", queue: "A-006", status: "QUEUED", at: todayAt(5), services: ["detailing"], bay: null },
    { id: "wo-07", vehicleId: "v-7", queue: "A-007", status: "QUALITY_CHECK", at: todayAt(6), services: ["premium"], bay: 1 },
    { id: "wo-08", vehicleId: "v-8", queue: "A-008", status: "READY", at: todayAt(7), services: ["premium", "interior"], bay: 3 },
    { id: "wo-09", vehicleId: "v-9", queue: "A-009", status: "COMPLETED", at: todayAt(8), services: ["detailing"], bay: 2, finishedAt: todayDone(8) },
    { id: "wo-10", vehicleId: "v-10", queue: "A-010", status: "COMPLETED", at: todayAt(9), services: ["premium", "interior"], bay: 1, finishedAt: todayDone(9) },
    { id: "wo-11", vehicleId: "v-11", queue: "A-011", status: "COMPLETED", at: todayAt(10), services: ["premium"], bay: 2, finishedAt: todayDone(10) },
  ];

  // Riwayat B 1234 ABC: 5 kunjungan selesai senilai Rp840.000.
  const historyDay = (daysAgo: number, time: string) => `${dayAt(daysAgo)}T${time}:00+07:00`;
  const history: Seedling[] = [
    { id: "hist-1", vehicleId: "v-0", queue: "A-028", status: "COMPLETED", at: historyDay(69, "09:10"), services: ["detailing"], bay: 1, notes: "Pelanggan meminta perhatian ekstra pada bagian kap mesin.", finishedAt: historyDay(69, "10:45") },
    { id: "hist-2", vehicleId: "v-0", queue: "A-041", status: "COMPLETED", at: historyDay(54, "13:20"), services: ["premium"], bay: 2, notes: "Water spot ringan pada kaca depan.", finishedAt: historyDay(54, "14:15") },
    { id: "hist-3", vehicleId: "v-0", queue: "A-017", status: "COMPLETED", at: historyDay(42, "10:05"), services: ["detailing"], bay: 3, manualTotal: 290000, notes: "Penyesuaian harga disetujui pelanggan untuk perawatan ekstra kolong.", finishedAt: historyDay(42, "11:50") },
    { id: "hist-4", vehicleId: "v-0", queue: "A-062", status: "COMPLETED", at: historyDay(29, "15:30"), services: ["basic"], bay: 1, notes: "Cuci rutin, kondisi kendaraan relatif bersih.", finishedAt: historyDay(29, "16:05") },
    { id: "hist-5", vehicleId: "v-0", queue: "A-034", status: "COMPLETED", at: historyDay(14, "11:15"), services: ["premium"], bay: 2, notes: "Noda ringan pada karpet baris kedua.", finishedAt: historyDay(14, "12:10") },
  ];

  // Data tujuh hari terakhir untuk laporan, memakai pesanan sungguhan.
  const history7: Seedling[] = [];
  let index = 0;
  const dailyCount = [4, 5, 6, 7, 8, 6];
  dailyCount.forEach((count, dayIndex) => {
    const day = dayAt(6 - dayIndex);
    for (let n = 0; n < count; n++) {
      const serviceId = mix[index % mix.length];
      const start = shift(`${day}T08:00:00+07:00`, Math.floor(n / 2) * 75 + (n % 2) * 35);
      history7.push({
        id: `rep-${index}`,
        vehicleId: `v-${1 + (index % 11)}`,
        queue: `A-${String(n + 1).padStart(3, "0")}`,
        status: "COMPLETED",
        at: start,
        services: [serviceId],
        bay: 1 + (n % 3),
        finishedAt: shift(start, 40),
      });
      index++;
    }
  });

  const orders = [...seedlings, ...history, ...history7].map(build);

  const methods: PaymentMethod[] = ["Tunai", "QRIS", "Transfer Bank", "E-Wallet"];
  const perDay = new Map<string, number>();
  const transactions = orders
    .filter(order => order.status === "COMPLETED")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((order, i) => {
      const day = order.createdAt.slice(0, 10);
      const sequence = (perDay.get(day) ?? 0) + 1;
      perDay.set(day, sequence);
      const amount = order.manualTotal ?? order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) - order.discount;
      return {
        id: `TRX-${day.replaceAll("-", "")}-${String(sequence).padStart(4, "0")}`,
        workOrderId: order.id,
        paidAt: order.timeline.at(-1)!.at,
        method: methods[i % methods.length],
        amount,
        received: amount,
      };
    });

  const demo = migrateDemoState({
    version: 1,
    nextQueue: 12,
    customers: people.map((person, i) => ({ id: `c-${i}`, name: person[0], phone: person[1] })),
    vehicles: people.map((person, i) => ({ id: `v-${i}`, customerId: `c-${i}`, plate: person[2], brand: person[3], model: person[4], color: person[5], type: person[6] })),
    services,
    orders,
    transactions,
    settings: { name: "KL Autocare", address: "Jl. Contoh No. 123, Tangerang Selatan", phone: "0812-0000-0000", prefix: "A", bays: 3, identity: "masked" },
  });
  return { ...demo, orders: demo.orders.map((order, index) => order.branchId === "main" && order.status === "COMPLETED" ? { ...order, employeeId: index % 3 === 0 ? "staff-2" : "staff-1" } : order) };
}
