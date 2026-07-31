import { chromium } from "playwright";
import { mkdir } from "fs/promises";

await mkdir("/workspace/screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];

async function shot(page, path) {
  await page.screenshot({ path, fullPage: true });
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
  const text = await page.locator("body").innerText();
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth > doc.clientWidth + 2,
    };
  });
  await shot(page, `/workspace/screenshots/${name}.png`);
  await context.close();
  return { text, overflow, len: text.length };
}

// Jobsite mobile dashboard
const fpM = await checkPage(
  "fp-mobile-dash",
  "http://127.0.0.1:8080/jobsite",
  true,
  async (page) => {
    await page.evaluate(() => localStorage.removeItem("lpin-jobsite-v1"));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    // bottom nav should exist
  },
);

// Jobsite mobile report form
const fpR = await checkPage(
  "fp-mobile-report",
  "http://127.0.0.1:8080/jobsite",
  true,
  async (page) => {
    await page.evaluate(() => localStorage.removeItem("lpin-jobsite-v1"));
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: /^Report$/i }).first().click();
    await page.waitForTimeout(300);
  },
);

// Jobsite desktop dashboard
const fpD = await checkPage(
  "fp-desktop-dash",
  "http://127.0.0.1:8080/jobsite",
  false,
  async (page) => {
    await page.evaluate(() => localStorage.removeItem("lpin-jobsite-v1"));
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(300);
  },
);

// Claims mobile board
const ccM = await checkPage(
  "cc-mobile-board",
  "http://127.0.0.1:8080/claimcard",
  true,
  async (page) => {
    await page.getByRole("button", { name: /Sample/i }).click();
    await page.waitForTimeout(500);
  },
);

// Claims desktop board
const ccD = await checkPage(
  "cc-desktop-board",
  "http://127.0.0.1:8080/claimcard",
  false,
  async (page) => {
    await page.getByRole("button", { name: /Sample/i }).click();
    await page.waitForTimeout(500);
  },
);

// Home mobile
const homeM = await checkPage(
  "home-mobile",
  "http://127.0.0.1:8080/",
  true,
);

console.log(
  JSON.stringify(
    {
      fpMobile: {
        hasBottomNav: fpM.text.includes("Home") && fpM.text.includes("Report"),
        hasDashboard: fpM.text.includes("Jobsite dashboard"),
        hasKpi: fpM.text.includes("Open reports"),
        overflow: fpM.overflow,
      },
      fpReport: {
        hasSubmit: fpR.text.includes("Submit active report"),
        overflow: fpR.overflow,
      },
      fpDesktop: {
        hasDashboard: fpD.text.includes("Jobsite dashboard"),
        hasActivity: fpD.text.includes("Activity wire"),
        hasPriority: fpD.text.includes("Priority reports"),
        desktopNav: fpD.text.includes("Dashboard") && fpD.text.includes("Desk"),
        overflow: fpD.overflow,
      },
      claimMobile: {
        hasScore: ccM.text.includes("Score claims") || ccM.text.includes("Your score"),
        hasBottom: ccM.text.includes("Score") && ccM.text.includes("Share"),
        overflow: ccM.overflow,
      },
      claimDesktop: {
        hasBoard: ccD.text.includes("Score claims") || ccD.text.includes("Claim"),
        overflow: ccD.overflow,
      },
      homeMobile: {
        hasApps: homeM.text.includes("Claims") && homeM.text.includes("Jobsite"),
        mobileFirst: homeM.text.includes("Mobile-first") || homeM.text.includes("hand first"),
        overflow: homeM.overflow,
      },
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
