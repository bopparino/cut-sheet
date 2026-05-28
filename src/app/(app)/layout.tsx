import type { Metadata } from "next";
import Link from "next/link";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cut Sheet Form",
  description: "Web cutsheet for stock-duct orders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="theme-insight min-h-screen bg-background text-foreground antialiased">
        <header className="border-b border-border bg-card">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link
              href="/browse"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Cut Sheet Form
            </Link>
            <div className="flex items-center gap-5 text-sm">
              <Link
                href="/browse"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Browse
              </Link>
              <Link
                href="/search"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Search
              </Link>
              <Link
                href="/form/new"
                className="btn-glow rounded-md bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                New Cutsheet
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}
