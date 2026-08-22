import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corporate Apocalypse 2400",
  description: "Flagship simulation event -- SymbiTech 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <Providers>{children}</Providers>
        <div id="overlay-root" />
      </body>
    </html>
  );
}