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

await page.goto("http://127.0.0.1:8080/jobsite", { waitUntil: "networkidle" });
await page.evaluate(() => {
  localStorage.removeItem("lpin-jobsite-v1");
  localStorage.removeItem("lpin-jobsite-v1");
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.getByRole("button", { name: /Reset demo/i }).click();
await page.waitForTimeout(400);

const feed = await page.locator("body").innerText();
const hasThreeLanes =
  feed.includes("Active reporting") &&
  feed.includes("Permit-office messages") &&
  feed.includes("Inspection scheduling");
const hasActivity = feed.includes("Activity wire");
await page.screenshot({ path: "/workspace/screenshots/fp-wired-feed.png", fullPage: true });

// 1 Active report with notify + inspection
await page.getByRole("button", { name: /^Report$/ }).click();
await page.waitForTimeout(300);
await page.getByPlaceholder(/Scaffold plank/i).fill("Wired QA: footing pour delayed");
await page.getByPlaceholder(/Where is it/i).fill("Grid B-4. Need city ok before rebar cover.");
await page.getByRole("button", { name: /Permit \/ code/i }).click();
// enable also inspection if not auto
const alsoBox = page.locator('label:has-text("Also request a city inspection") input');
if (!(await alsoBox.isChecked())) await alsoBox.check();
await page.getByPlaceholder(/Building B, floor 4/i).fill("Building B, grid B-4");
await page.getByRole("button", { name: /Submit active report/i }).click();
await page.waitForTimeout(600);
const afterReport = await page.locator("body").innerText();
const reportWired =
  afterReport.includes("Wired QA: footing pour delayed") ||
  afterReport.includes("footing pour");

// 2 Messages show wired notice
await page.getByRole("button", { name: /^Messages$/ }).click();
await page.waitForTimeout(400);
const msgs = await page.locator("body").innerText();
const msgWired =
  msgs.includes("footing") ||
  msgs.includes("Active field report") ||
  msgs.includes("Inspection request");
const hasWiredBadge = msgs.includes("Wired from");
await page.screenshot({ path: "/workspace/screenshots/fp-wired-messages.png", fullPage: true });

// 3 Inspections show new request + status wires message
await page.getByRole("button", { name: /^Inspections$/ }).click();
await page.waitForTimeout(400);
const insp = await page.locator("body").innerText();
const hasInspBoard =
  insp.includes("Inspection board") || insp.includes("Rough-in") || insp.includes("grid B-4");
// Mark scheduled on first available
const markSched = page.getByRole("button", { name: /Mark scheduled/i });
if ((await markSched.count()) > 0) {
  await markSched.first().click();
  await page.waitForTimeout(400);
}
await page.screenshot({ path: "/workspace/screenshots/fp-wired-inspections.png", fullPage: true });

// Status change should wire message
await page.getByRole("button", { name: /^Messages$/ }).click();
await page.waitForTimeout(400);
const afterStatus = await page.locator("body").innerText();
const statusWired =
  afterStatus.includes("Inspection update") ||
  afterStatus.includes("On the calendar") ||
  afterStatus.includes("status");

console.log(
  JSON.stringify(
    {
      hasThreeLanes,
      hasActivity,
      reportWired,
      msgWired,
      hasWiredBadge,
      hasInspBoard,
      statusWired,
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
