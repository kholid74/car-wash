import { notFound, redirect } from "next/navigation";

const legacyRoutes = new Set(["dashboard", "check-in", "inspection", "service-selection", "confirmation", "queue", "work-orders", "cashier", "reservations", "vehicles", "customers", "transactions", "services", "reports", "settings", "membership", "employees", "commissions", "inventory", "expenses", "branches", "promotions", "feedback", "roles", "payments", "notifications", "website"]);

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (legacyRoutes.has(path[0])) {
    redirect(path[0] === "dashboard" ? "/admin" : `/admin/${path.map(encodeURIComponent).join("/")}`);
  }
  notFound();
}
