import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import "../globals.css";

export const metadata: Metadata = {
  title: "Cut Sheet Ticket",
  description: "Printable cutsheet ticket.",
};

// Separate root layout for /print/* so Puppeteer never inherits the app's
// nav or container max-width. Tailwind's variables still load via globals.css.
//
// Auth gate: every /print/* page renders real cutsheet data, so it needs the
// same DB-backed session check the (app) layout does - the edge middleware
// only verifies a cookie is present, not valid. The PDF pipeline forwards the
// authed caller's cookie (src/lib/pdf.ts), so legitimate renders pass; an
// unauthenticated request redirects to /login and renderPdfFromUrl's redirect
// guard turns that into a clean error instead of printing someone's data.
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  // Two ways in: a live app session, or the Ariya render pass — the header
  // the Ariya PDF route's headless Chromium carries (see /api/ariya/pdf).
  // The pass only exists while ARIYA_API_TOKEN is configured.
  const token = process.env.ARIYA_API_TOKEN;
  const pass = (await headers()).get("x-ariya-render");
  const ariyaRender = Boolean(token && pass === token);
  if (!ariyaRender && !(await getCurrentUser())) redirect("/login");
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased">{children}</body>
    </html>
  );
}
