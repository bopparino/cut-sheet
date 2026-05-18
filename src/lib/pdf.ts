import "server-only";
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

export async function renderPdfFromUrl(url: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.4in", right: "0.4in", bottom: "0.4in", left: "0.4in" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
