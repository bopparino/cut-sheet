import type { Metadata } from "next";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";

export const metadata: Metadata = {
  title: "Cut Sheet Form",
  description: "Web cutsheet for stock-duct orders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="border-b">
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
            <Link href="/search" className="text-lg font-semibold tracking-tight">
              Cut Sheet Form
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/search" className="text-muted-foreground hover:text-foreground">
                Search
              </Link>
              <Link
                href="/form/new"
                className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:opacity-90"
              >
                New Cutsheet
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
