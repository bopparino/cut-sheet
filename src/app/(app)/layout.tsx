import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { db } from "@/lib/db";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Cut Sheet Form",
  description: "Web cutsheet for stock-duct orders.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const trashCount =
    db
      .prepare<[], { n: number }>(
        "SELECT COUNT(*) AS n FROM cutsheets WHERE deleted_at IS NOT NULL",
      )
      .get()?.n ?? 0;

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="theme-insight min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <div className="flex min-h-screen">
            <AppSidebar trashCount={trashCount} />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
