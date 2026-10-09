import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Universe",
  description: "A private universe for two people to remember their journey.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
