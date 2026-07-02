import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import "../globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Cut Sheet Form",
  description: "Web cutsheet for stock-duct orders.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Auth gate: no session, no app. getCurrentUser does the real DB-backed check
  // (the edge middleware only handles the cheap cookie-presence redirect).
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const trashCount =
    db
      .prepare<[], { n: number }>(
        "SELECT COUNT(*) AS n FROM cutsheets WHERE deleted_at IS NOT NULL",
      )
      .get()?.n ?? 0;

  return (
    <html lang="en" className={`${archivo.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="theme-insight min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          <div className="flex min-h-screen">
            <AppSidebar trashCount={trashCount} user={user} />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
