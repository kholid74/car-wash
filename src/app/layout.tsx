import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalsara Car Wash Demo",
  description: "Prototype operasional car wash, dari inspeksi hingga riwayat kendaraan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
