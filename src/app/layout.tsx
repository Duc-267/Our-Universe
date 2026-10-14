import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const display = Fredoka({ subsets: ["latin", "latin-ext"], variable: "--font-display", display: "swap" });
const body = Nunito({ subsets: ["latin", "vietnamese"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Our Universe",
  description: "A private universe for two people to remember their journey.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
