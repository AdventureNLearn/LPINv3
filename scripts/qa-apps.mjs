#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "node:path";

const BASE = (process.env.LPIN_BASE_URL || "http://127.0.0.1:8090").replace(/\/$/, "");
const SHOT = process.env.LPIN_QA_SHOTS || join(process.cwd(), "screenshots");
await mkdir(SHOT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.error("pageerror", e));

await page.goto(`${BASE}/jobsite`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: join(SHOT, "fp-feed.png"), fullPage: true });

// messages / inspections if nav present
try {
  await page.getByRole("button", { name: /Inspect|Messages|Desk/i }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(SHOT, "fp-messages.png"), fullPage: true });
} catch {
  /* optional */
}

await page.goto(`${BASE}/claims`, { waitUntil: "networkidle" }).catch(() =>
  page.goto(`${BASE}/claimcard`, { waitUntil: "networkidle" }),
);
await page.waitForTimeout(300);
await page.screenshot({ path: join(SHOT, "cc-plain.png"), fullPage: true });

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(`${BASE}/jobsite`, { waitUntil: "networkidle" });
await mobile.screenshot({ path: join(SHOT, "fp-mobile.png"), fullPage: true });
await browser.close();
console.log("qa-apps shots →", SHOT);
