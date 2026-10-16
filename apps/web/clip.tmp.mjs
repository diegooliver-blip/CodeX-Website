import { chromium } from "playwright";
const [, , url, out, y, w = "1440", h = "900"] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: "networkidle" });
for (let yy = 0; yy <= +y; yy += 500) { await p.evaluate((v) => window.scrollTo(0, v), yy); await p.waitForTimeout(50); }
await p.evaluate((v) => window.scrollTo(0, v), +y); await p.waitForTimeout(1200);
await p.screenshot({ path: out }); await b.close();
