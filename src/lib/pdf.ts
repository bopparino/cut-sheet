import "server-only";
import { headers } from "next/headers";
import puppeteer, { type Browser } from "puppeteer";

declare global {
  // eslint-disable-next-line no-var
  var __cutsheetBrowser: Browser | undefined;
}

// Reuse one Chromium instance across requests. Puppeteer cold-starts cost
// ~1s; the bulk of PDF latency comes from launching, not rendering.
async function getBrowser(): Promise<Browser> {
  if (globalThis.__cutsheetBrowser?.connected) return globalThis.__cutsheetBrowser;
  // In Docker we install system Chromium and point PUPPETEER_EXECUTABLE_PATH
  // at it (so we don't have to also ship Puppeteer's bundled Chromium). In
  // local dev the var is unset and Puppeteer falls back to its bundled copy.
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  globalThis.__cutsheetBrowser = browser;
  return browser;
}

type PaperFormat = "Letter" | "Legal" | "Tabloid" | "A4";

export async function renderPdfFromUrl(
  url: string,
  options: {
    format?: PaperFormat;
    margin?: { top: string; right: string; bottom: string; left: string };
    // When true, the rendered page's @page CSS rule wins over the format
    // option. Lets a print page lock its own paper size so the result is
    // identical whether the user hits Cmd-P in a browser or the API endpoint.
    preferCSSPageSize?: boolean;
  } = {},
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Puppeteer's loopback request is a fresh browser with no session, but the
    // /print/* pages sit behind the auth middleware like everything else. Every
    // caller of this function is a route handler serving an already-authed
    // user, so forward that user's Cookie header - the print page then renders
    // under the same session as the person who clicked the button.
    const cookie = (await headers()).get("cookie");
    if (cookie) await page.setExtraHTTPHeaders({ cookie });
    const res = await page.goto(url, { waitUntil: "networkidle0" });
    // If auth (or anything else) redirected us off the print page, fail loudly
    // instead of printing whatever page we landed on (e.g. /login).
    if (new URL(page.url()).pathname !== new URL(url).pathname) {
      throw new Error(`Print page ${url} redirected to ${page.url()}`);
    }
    // The existence checks in the API routes catch most bad inputs, but a
    // schema-invalid row still notFound()s in the print page - without this
    // guard the user downloads Next's 404 page as a PDF with HTTP 200.
    if (!res || res.status() >= 400) {
      throw new Error(`Print page ${url} responded ${res ? res.status() : "with no response"}`);
    }
    const pdf = await page.pdf({
      // Default to US Letter (8.5×11) — the pick tickets print on Letter. The
      // cut sheet / blank / fittings routes pass "Legal" explicitly.
      format: options.format ?? "Letter",
      printBackground: true,
      preferCSSPageSize: options.preferCSSPageSize ?? false,
      margin:
        options.margin ?? {
          top: "0.4in",
          right: "0.4in",
          bottom: "0.4in",
          left: "0.4in",
        },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
