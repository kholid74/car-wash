import { PublicPage } from "@/components/public-site";
export default async function Page({ searchParams }: { searchParams: Promise<{ service?: string; branch?: string; vehicleType?: string; date?: string }> }) {
  const params = await searchParams;
  return <PublicPage initialService={params.service} initialBranch={params.branch} initialVehicleType={params.vehicleType} initialDate={params.date} />;
}
