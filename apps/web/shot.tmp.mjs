import { chromium } from "playwright";
const [, , url, out, w = "1440", h = "900", full = "0"] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2200);
if (full === "1") {
  // trigger reveals by scrolling through
  for (let y = 0; y < 30000; y += 700) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(60); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
}
await page.screenshot({ path: out, fullPage: full === "1" });
console.log(errors.length ? errors.join("\n") : "no console errors");
await browser.close();
