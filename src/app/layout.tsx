import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import "./showcase.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-poppins" });

export const metadata: Metadata = {
  title: "KL Autocare | Car Wash & Detailing Studio",
  description: "Car wash dan auto detailing premium. Detail kecil. Perjalanan lebih berarti.",
  applicationName: "KL Autocare",
  openGraph: { title: "KL Autocare", description: "Car Wash & Detailing Studio", siteName: "KL Autocare", locale: "id_ID", type: "website" },
  twitter: { card: "summary", title: "KL Autocare", description: "Car Wash & Detailing Studio" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id" className={poppins.variable}><body>{children}</body></html>;
}
