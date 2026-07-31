import { chromium } from "playwright";
import { mkdir } from "fs/promises";

await mkdir("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

// Jobsite full flows
await page.goto("http://127.0.0.1:8080/jobsite", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.removeItem("lpin-jobsite-v1"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.getByRole("button", { name: /Reset demo/i }).click();
await page.waitForTimeout(400);
const feed = await page.locator("body").innerText();
const hasPlain = feed.includes("Stop now") && feed.includes("permit office");
const hasGlossary = feed.includes("Plain-language key");
const hasP0 = feed.includes("Storm drain") || feed.includes("scaffold");
await page.screenshot({ path: "/workspace/screenshots/fp-feed.png", fullPage: true });

// Report
await page.getByRole("button", { name: /^Report$/ }).click();
await page.waitForTimeout(300);
await page.getByPlaceholder(/Scaffold plank/i).fill("Test active report");
await page.getByPlaceholder(/Where is it/i).fill("Level 2 stair. Need office eyes.");
await page.getByRole("button", { name: /Permit \/ code/i }).click();
await page.getByRole("button", { name: /Submit report/i }).click();
await page.waitForTimeout(500);
const afterReport = await page.locator("body").innerText();
const reported = afterReport.includes("Test active report");

// Messages
await page.getByRole("button", { name: /^Messages$/ }).click();
await page.waitForTimeout(300);
const msgText = await page.locator("body").innerText();
const hasMsgs = msgText.includes("permit office") && msgText.includes("Storm drain");
await page.getByRole("button", { name: /Write to the permit office/i }).click();
await page.waitForTimeout(200);
await page.getByPlaceholder(/Request to move/i).fill("QA message subject");
await page.getByPlaceholder(/Be specific/i).fill("Please confirm vacuum truck window.");
await page.getByRole("button", { name: /^Send message$/ }).click();
await page.waitForTimeout(400);
const afterMsg = await page.locator("body").innerText();
const msgSent = afterMsg.includes("QA message subject");
await page.screenshot({ path: "/workspace/screenshots/fp-messages.png", fullPage: true });

// Inspections
await page.getByRole("button", { name: /^Inspections$/ }).click();
await page.waitForTimeout(300);
const inspText = await page.locator("body").innerText();
const hasInsp = inspText.includes("Rough-in") && inspText.includes("MEP");
await page.getByRole("button", { name: /Request an inspection/i }).click();
await page.waitForTimeout(200);
await page.getByPlaceholder(/Building B/i).fill("Building B, floor 1");
await page.getByRole("button", { name: /Submit request/i }).click();
await page.waitForTimeout(500);
const afterInsp = await page.locator("body").innerText();
const inspRequested = afterInsp.includes("Building B, floor 1") || afterInsp.includes("Requested");
await page.screenshot({ path: "/workspace/screenshots/fp-inspections.png", fullPage: true });

// Claims plain language
await page.goto("http://127.0.0.1:8080/claimcard", { waitUntil: "networkidle" });
const ccHome = await page.locator("body").innerText();
const ccPlain =
  ccHome.includes("Supported") &&
  ccHome.includes("Unproven") &&
  ccHome.includes("plain English");
await page.getByRole("button", { name: /Try a sample post/i }).click();
await page.waitForTimeout(400);
const board = await page.locator("body").innerText();
const boardOk = board.includes("How scoring works") || board.includes("primary");
await page.screenshot({ path: "/workspace/screenshots/cc-plain.png", fullPage: true });

// Mobile jobsite
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto("http://127.0.0.1:8080/jobsite", { waitUntil: "networkidle" });
await mobile.waitForTimeout(400);
await mobile.screenshot({ path: "/workspace/screenshots/fp-mobile.png", fullPage: true });
const overflow = await mobile.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
);

console.log(
  JSON.stringify(
    {
      jobsite: {
        hasPlain,
        hasGlossary,
        hasP0,
        reported,
        hasMsgs,
        msgSent,
        hasInsp,
        inspRequested,
      },
      claimcard: { ccPlain, boardOk },
      mobileOverflow: overflow,
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
