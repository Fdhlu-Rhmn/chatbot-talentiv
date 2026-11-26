import type { Metadata } from "next";
import { DM_Sans, Poppins } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
  title: "Dashboard Jarkoman · Talentiv",
  description: "Otomasi jarkoman WhatsApp kelas Talentiv Academy",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className={`${dmSans.variable} ${poppins.variable} antialiased`}>{children}</body>
    </html>
  );
}
