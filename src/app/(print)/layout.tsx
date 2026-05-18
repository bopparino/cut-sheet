import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Cut Sheet Ticket",
  description: "Printable cutsheet ticket.",
};

// Separate root layout for /print/* so Puppeteer never inherits the app's
// nav or container max-width. Tailwind's variables still load via globals.css.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased">{children}</body>
    </html>
  );
}
