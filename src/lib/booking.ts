import { createDraft, currentBranch, dayOf, demoNow, isActive, normalizePlate, registerVehicle, vehicleTypes, type DemoState, type Reservation } from "./domain.ts";

export const reservationStatuses: Record<Reservation["status"], string> = { PENDING: "Menunggu konfirmasi", CONFIRMED: "Dikonfirmasi", CANCELLED: "Dibatalkan", CHECKED_IN: "Sudah check-in" };
export const bookingDateLimit = (now = demoNow()) => dayOf(new Date(Date.parse(now) + 30 * 86400000).toISOString());
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const slotTime = (date: string, slot: string) => `${date}T${slot}:00+07:00`;
function validDate(date: string, now: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date && date >= dayOf(now) && date <= bookingDateLimit(now);
}

export function availableSlots(state: DemoState, branchId: string, date: string, excludeId?: string, now = demoNow()) {
  const branch = currentBranch(state, branchId);
  if (!validDate(date, now)) return [];
  const slots: { time: string; remaining: number }[] = [];
  for (let minute = minutes(branch.opensAt); minute + 60 <= minutes(branch.closesAt); minute += 60) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    if (Date.parse(slotTime(date, time)) <= Date.parse(now)) continue;
    // shortcut: one booking occupies one bay for one slot; add duration/walk-in scheduling for production use.
    const occupied = state.reservations.filter(booking => booking.id !== excludeId && booking.branchId === branchId && booking.date === date && booking.slot === time && booking.status !== "CANCELLED").length;
    slots.push({ time, remaining: Math.max(0, branch.bays - occupied) });
  }
  return slots;
}

function requireSlot(state: DemoState, branchId: string, date: string, slot: string, excludeId?: string, now = demoNow()) {
  const available = availableSlots(state, branchId, date, excludeId, now).find(option => option.time === slot);
  if (!available) throw new Error("Pilih jadwal mendatang dalam 30 hari dan sesuai jam buka cabang (WIB).");
  if (!available.remaining) throw new Error("Slot sudah penuh. Silakan pilih waktu lain.");
}

export type BookingInput = Pick<Reservation, "branchId" | "date" | "slot" | "customerName" | "phone" | "plate" | "brand" | "model" | "vehicleType" | "notes"> & { serviceId: string; expectedPrice: number };
export function createReservation(state: DemoState, input: BookingInput, now = demoNow()) {
  const service = state.services.find(service => service.id === input.serviceId && service.active);
  if (!service) throw new Error("Layanan tidak tersedia. Pilih layanan aktif lainnya.");
  if (input.expectedPrice !== service.price) throw new Error("Harga layanan berubah. Periksa kembali ringkasan sebelum mengonfirmasi.");
  const customerName = input.customerName.trim(); const phone = input.phone.trim();
  const plate = input.plate.trim().toUpperCase().replace(/\s+/g, " ");
  if (!customerName || customerName.length > 80 || !/^[+\d\s-]{8,20}$/.test(phone) || phone.replace(/\D/g, "").length < 8) throw new Error("Isi nama dan nomor WhatsApp yang valid.");
  if (!/^[A-Z]{1,3}\s?\d{1,4}\s?[A-Z]{0,3}$/.test(plate) || !vehicleTypes.includes(input.vehicleType) || !input.model.trim() || input.model.length > 50 || input.brand.length > 40 || input.notes.length > 1000) throw new Error("Periksa nomor polisi, jenis, model, dan catatan kendaraan.");
  requireSlot(state, input.branchId, input.date, input.slot, undefined, now);
  if (state.reservations.some(booking => booking.status !== "CANCELLED" && booking.date === input.date && normalizePlate(booking.plate) === normalizePlate(plate))) throw new Error("Kendaraan ini sudah memiliki reservasi pada tanggal tersebut.");
  const id = crypto.randomUUID();
  const prefix = `VC-${dayOf(now).replaceAll("-", "")}-`;
  const next = state.reservations.filter(booking => booking.reference.startsWith(prefix)).length + 1;
  const booking: Reservation = { id, reference: `${prefix}${String(next).padStart(4, "0")}`, branchId: input.branchId, date: input.date, slot: input.slot, createdAt: now, service: { id: service.id, name: service.name, price: service.price, duration: service.duration }, customerName, phone, plate, brand: input.brand.trim(), model: input.model.trim(), vehicleType: input.vehicleType, notes: input.notes.trim(), status: "PENDING", workOrderId: null };
  return { booking, state: { ...state, reservations: [...state.reservations, booking] } };
}

function findReservation(state: DemoState, id: string) {
  const booking = state.reservations.find(booking => booking.id === id);
  if (!booking) throw new Error("Reservasi tidak ditemukan.");
  if (booking.branchId !== state.activeBranchId) throw new Error("Pilih cabang reservasi untuk melanjutkan.");
  return booking;
}
export function updateReservation(state: DemoState, id: string, action: "confirm" | "cancel" | "reschedule", schedule?: { date: string; slot: string }, now = demoNow()): DemoState {
  const booking = findReservation(state, id);
  if (!["PENDING", "CONFIRMED"].includes(booking.status)) throw new Error("Reservasi ini sudah ditutup dan tidak dapat diubah.");
  if (action === "cancel") return { ...state, reservations: state.reservations.map(item => item.id === id ? { ...item, status: "CANCELLED" } : item) };
  const date = action === "reschedule" ? schedule?.date ?? "" : booking.date;
  const slot = action === "reschedule" ? schedule?.slot ?? "" : booking.slot;
  if (action === "confirm" && Date.parse(slotTime(date, slot)) <= Date.parse(now)) {
    if (!validDate(date, `${date}T12:00:00+07:00`)) throw new Error("Tanggal reservasi tidak valid.");
  } else requireSlot(state, booking.branchId, date, slot, id, now);
  if (state.reservations.some(other => other.id !== id && other.status !== "CANCELLED" && other.date === date && normalizePlate(other.plate) === normalizePlate(booking.plate))) throw new Error("Kendaraan sudah memiliki reservasi pada tanggal tujuan.");
  return { ...state, reservations: state.reservations.map(item => item.id === id ? { ...item, date, slot, status: action === "confirm" ? "CONFIRMED" : item.status } : item) };
}

export function reservationCheckIn(state: DemoState, id: string) {
  const booking = findReservation(state, id);
  if (booking.workOrderId) {
    const order = state.orders.find(order => order.id === booking.workOrderId);
    if (!order) throw new Error("Pesanan reservasi tidak ditemukan.");
    return { state, order };
  }
  if (booking.status !== "CONFIRMED") throw new Error("Konfirmasi reservasi sebelum check-in.");
  let vehicle = state.vehicles.find(vehicle => normalizePlate(vehicle.plate) === normalizePlate(booking.plate));
  const existingVehicleId = vehicle?.id;
  if (existingVehicleId && state.orders.some(order => order.vehicleId === existingVehicleId && isActive(order))) throw new Error("Kendaraan masih memiliki pesanan aktif. Selesaikan pesanan tersebut dahulu.");
  let next = state;
  if (!vehicle) {
    const customer = state.customers.find(customer => customer.phone.replace(/\D/g, "") === booking.phone.replace(/\D/g, ""));
    const result = registerVehicle(state, { plate: booking.plate, brand: booking.brand, model: booking.model, color: "Belum dicatat", type: booking.vehicleType, customerId: customer?.id, customerName: booking.customerName, phone: booking.phone });
    vehicle = result.vehicle; next = result.state;
  }
  if (!vehicle) throw new Error("Kendaraan booking belum terdaftar.");
  const result = createDraft(next, vehicle.id);
  const order = { ...result.order, items: [{ serviceId: booking.service.id, name: booking.service.name, price: booking.service.price, quantity: 1 }], notes: `Reservasi ${booking.reference}${booking.notes ? `\n${booking.notes}` : ""}` };
  return { order, state: { ...result.state, orders: result.state.orders.map(item => item.id === order.id ? order : item), reservations: result.state.reservations.map(item => item.id === id ? { ...item, status: "CHECKED_IN" as const, workOrderId: order.id } : item) } };
}
