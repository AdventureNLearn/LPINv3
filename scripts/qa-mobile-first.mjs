#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "node:path";

const BASE = (process.env.LPIN_BASE_URL || "http://127.0.0.1:8090").replace(/\/$/, "");
const SHOT = process.env.LPIN_QA_SHOTS || join(process.cwd(), "screenshots");
await mkdir(SHOT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

async function shot(page, name) {
  await page.screenshot({ path: join(SHOT, `${name}.png`), fullPage: true });
}

async function checkPage(name, url, mobile, actions) {
  const context = await browser.newContext(
    mobile
      ? {
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        }
      : { viewport: { width: 1440, height: 900 } },
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name} console: ${m.text()}`);
  });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  if (actions) await actions(page);
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth + 2,
    };
  });
  await shot(page, name);
  await context.close();
  return { overflow };
}

await checkPage("fp-mobile-dash", `${BASE}/jobsite`, true);
await checkPage("fp-mobile-report", `${BASE}/jobsite`, true, async (page) => {
  try {
    await page.getByRole("button", { name: /^Report$/i }).first().click();
    await page.waitForTimeout(300);
  } catch {
    /* optional */
  }
});
await checkPage("fp-desktop-dash", `${BASE}/jobsite`, false);
await checkPage("cc-mobile", `${BASE}/claims`, true).catch(() =>
  checkPage("cc-mobile", `${BASE}/claimcard`, true),
);
await checkPage("home", `${BASE}/`, false);

await browser.close();
if (errors.length) {
  console.error(errors.slice(0, 20));
  process.exit(1);
}
console.log("qa-mobile-first OK →", SHOT);
