#!/usr/bin/env node
/**
 * LPIN Suite full E2E (Playwright).
 *
 * Prerequisites: app reachable at BASE (default http://127.0.0.1:8080).
 *   npm run dev   # in another terminal, or already up
 *   npm run qa
 *
 * Exit 0 = all checks pass + no page/console errors.
 * Exit 1 = navigation / infrastructure failure.
 * Exit 2 = assertion failure or page errors.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const BASE = (process.env.LPIN_BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const SHOT_DIR = process.env.LPIN_QA_SHOTS || "/workspace/screenshots";
const TIMEOUT = Number(process.env.LPIN_QA_TIMEOUT_MS || 45000);

mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
const allErrors = [];
let failed = 0;

function pass(name, detail = {}) {
  results.push({ name, ok: true, ...detail });
  console.log(`  ✓ ${name}`);
}

function fail(name, reason, detail = {}) {
  failed += 1;
  results.push({ name, ok: false, reason, ...detail });
  console.error(`  ✗ ${name}: ${reason}`);
}

async function shot(page, name) {
  const path = join(SHOT_DIR, `qa-${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function bodyText(page) {
  return page.locator("body").innerText();
}

async function clearJobsiteStorage(page) {
  await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (
        k.startsWith("lpin-jobsite") ||
        k.startsWith("aos-fieldpulse") ||
        k.startsWith("lpin-claim") ||
        k.includes("fieldpulse")
      ) {
        localStorage.removeItem(k);
      }
    }
  });
}

async function goto(page, path) {
  const url = `${BASE}${path}`;
  const resp = await page.goto(url, { waitUntil: "networkidle", timeout: TIMEOUT });
  return { url, status: resp?.status() ?? 0 };
}

async function newPage(browser, { mobile = false } = {}) {
  const context = await browser.newContext(
    mobile
      ? {
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        }
      : { viewport: { width: 1280, height: 900 } },
  );
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (e) => {
    const s = String(e?.message || e);
    pageErrors.push(s);
    allErrors.push(s);
  });
  page.on("console", (m) => {
    if (m.type() === "error") {
      const t = m.text();
      // Ignore benign Vite/HMR noise
      if (/Failed to load resource|favicon|Download the React DevTools/i.test(t)) return;
      consoleErrors.push(t);
      allErrors.push(t);
    }
  });
  page._qaErrors = { pageErrors, consoleErrors };
  page._qaContext = context;
  return page;
}

async function closePage(page) {
  await page._qaContext?.close().catch(() => {});
}

async function goJobsiteView(page, viewLabel) {
  // Prefer visible controls; force bottom-nav when present but CSS-hidden on desktop.
  const bottom = page.locator("nav.bottom-nav button").filter({ hasText: new RegExp(viewLabel, "i") });
  if ((await bottom.count()) > 0) {
    await bottom.first().click({ force: true });
    await page.waitForTimeout(200);
    return;
  }
  // Desktop side/top nav — accessible name may include icon text
  const desk = page.getByRole("button", { name: new RegExp(viewLabel, "i") });
  const n = await desk.count();
  for (let i = 0; i < n; i++) {
    const el = desk.nth(i);
    const txt = (await el.innerText().catch(() => "")).trim();
    if (new RegExp(viewLabel, "i").test(txt) || (await el.getAttribute("aria-label") || "").match(new RegExp(viewLabel, "i"))) {
      await el.click({ force: true });
      await page.waitForTimeout(200);
      return;
    }
  }
  if (/report/i.test(viewLabel)) {
    const cta = page.getByRole("button", { name: /File report/i });
    if (await cta.count()) {
      await cta.first().click({ force: true });
      return;
    }
  }
  if (/inspect/i.test(viewLabel)) {
    const cta = page.getByRole("button", { name: /Inspect/i });
    if (await cta.count()) {
      await cta.first().click({ force: true });
      return;
    }
  }
  throw new Error(`Cannot navigate to ${viewLabel}`);
}


// ---------- suites ----------

async function suiteSmoke(browser) {
  console.log("\n[A] Smoke");
  const page = await newPage(browser);
  try {
    for (const path of ["/", "/jobsite", "/claims"]) {
      const { status } = await goto(page, path);
      await page.waitForTimeout(400);
      const text = (await bodyText(page)).trim();
      const okStatus = status > 0 && status < 400;
      const okContent = text.length > 40;
      if (okStatus && okContent) pass(`smoke ${path}`, { status, len: text.length });
      else fail(`smoke ${path}`, `status=${status} len=${text.length}`);
    }
    await shot(page, "smoke-claims");
  } finally {
    await closePage(page);
  }
}

async function suiteBlank(browser) {
  console.log("\n[B] Blank jobsite");
  const page = await newPage(browser);
  try {
    await goto(page, "/jobsite");
    await clearJobsiteStorage(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    // From feed sample banner
    const start = page.getByRole("button", { name: /^Start blank jobsite$/i });
    if ((await start.count()) === 0) {
      fail("blank from feed", "Start blank jobsite button not found on feed");
      await shot(page, "blank-missing");
      return;
    }
    await start.first().click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /Yes — start blank jobsite/i }).click();
    await page.waitForTimeout(1200);

    const text = await bodyText(page);
    const nameVal = await page
      .locator('input[placeholder="Building name or contract"]')
      .inputValue()
      .catch(() => "");

    const checks = {
      live: /Live jobsite board/i.test(text),
      notSample: /Live jobsite board/i.test(text) && !/Sample board is loaded/i.test(text),
      siteIdentity: /Site identity/i.test(text),
      name: nameVal === "My jobsite" || /My jobsite/i.test(text),
      zeroReports: /0 report/i.test(text),
    };
    const ok = Object.values(checks).every(Boolean);
    if (ok) pass("blank jobsite from feed", checks);
    else fail("blank jobsite from feed", "assertions", checks);

    // State empty after blank
    const state = page.locator("select").first();
    const stateVal = await state.inputValue().catch(() => "err");
    if (stateVal === "") pass("blank state cleared");
    else fail("blank state cleared", `state=${stateVal}`);

    await shot(page, "blank");
  } finally {
    await closePage(page);
  }
}

async function suiteStateAhj(browser) {
  console.log("\n[C] State → AHJ (sample of 51)");
  const page = await newPage(browser);
  try {
    await goto(page, "/jobsite");
    await clearJobsiteStorage(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // Ensure blank + Site view
    const start = page.getByRole("button", { name: /^Start blank jobsite$/i });
    if (await start.count()) {
      await start.first().click();
      await page.waitForTimeout(200);
      const yes = page.getByRole("button", { name: /Yes — start blank jobsite/i });
      if (await yes.count()) await yes.click();
      await page.waitForTimeout(800);
    } else {
      // Navigate Site via bottom nav if already blank
      const siteNav = page.locator("nav.bottom-nav button").last();
      if (await siteNav.count()) await siteNav.click();
      await page.waitForTimeout(400);
    }

    const stateSelect = page.locator("select").first();
    if ((await stateSelect.count()) === 0) {
      fail("state select present", "no select on Site identity");
      return;
    }

    async function pickState(code, expectRe) {
      await stateSelect.selectOption(code);
      await page.waitForTimeout(350);
      const text = await bodyText(page);
      const ok = expectRe.test(text);
      if (ok) pass(`state ${code} drives AHJ`, { match: expectRe.toString() });
      else fail(`state ${code} drives AHJ`, `panel missing ${expectRe}`, {
        snippet: text.slice(0, 400),
      });
      return text;
    }

    await pickState("FL", /Florida|FBC/i);
    await pickState("TX", /Texas/i);
    await pickState("CA", /California|Title 24|CBC/i);
    await pickState("WY", /Wyoming/i);
    await pickState("DC", /District of Columbia|Washington,\s*DC|DC Construction|DCRA/i);

    // City freeform must not override state (state-only rule)
    await stateSelect.selectOption("TX");
    await page.waitForTimeout(200);
    const city = page.locator('input[placeholder*="County or city"]');
    if (await city.count()) {
      await city.fill("Anytown");
      await page.waitForTimeout(300);
    }
    const afterCity = await bodyText(page);
    if (/Texas/i.test(afterCity) && !/Florida \(FBC/i.test(afterCity)) {
      pass("city freeform does not override state");
    } else {
      fail("city freeform does not override state", "expected Texas pack with freeform city typed", {
        hasTexas: /Texas/i.test(afterCity),
        hasFlFbc: /Florida \(FBC/i.test(afterCity),
      });
    }

    // Option count = 51 states + empty option
    const optionCount = await stateSelect.locator("option").count();
    if (optionCount >= 52) pass("state select has 51 jurisdictions", { optionCount });
    else fail("state select has 51 jurisdictions", `options=${optionCount}`);

    await shot(page, "state-ahj");
  } finally {
    await closePage(page);
  }
}

async function suiteCoreLoop(browser) {
  console.log("\n[D] Jobsite core loop (report → inspect)");
  const page = await newPage(browser, { mobile: true });
  try {
    await goto(page, "/jobsite");
    await clearJobsiteStorage(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(600);

    // Blank first so board is clean
    const start = page.getByRole("button", { name: /^Start blank jobsite$/i });
    if (await start.count()) {
      await start.first().click();
      await page.waitForTimeout(200);
      const yes = page.getByRole("button", { name: /Yes — start blank jobsite/i });
      if (await yes.count()) await yes.click();
      await page.waitForTimeout(700);
    }

    await goJobsiteView(page, "Report");
    await page.waitForTimeout(400);

    await page.getByPlaceholder("Short problem title").fill("E2E footing hold");
    await page
      .getByPlaceholder("What happened, where, and what is blocked")
      .fill("Grid A-1 pour delayed. Need building department eyes.");
    await page.getByRole("button", { name: /Submit report/i }).click();
    await page.waitForTimeout(900);

    let text = await bodyText(page);
    if (/E2E footing hold/i.test(text)) pass("file field report");
    else {
      // may still be on report form with toast — go board
      await goJobsiteView(page, "Board").catch(async () => {
        await page.getByRole("button", { name: /Board/i }).first().click();
      });
      await page.waitForTimeout(500);
      text = await bodyText(page);
      if (/E2E footing hold/i.test(text)) pass("file field report");
      else fail("file field report", "report title not on board", { snippet: text.slice(0, 300) });
    }

    await page.getByRole("button", { name: /^Inspect$/i }).click();
    await page.waitForTimeout(600);
    const reqBtn = page.getByRole("button", { name: /Request inspection/i });
    if ((await reqBtn.count()) === 0) {
      const tnow = await bodyText(page);
      fail("request inspection", "Inspect view not reached", { snippet: tnow.slice(0, 500) });
    } else {
      const areaByLabel = page.locator("label").filter({ hasText: /Area/i }).locator("input");
      if (await areaByLabel.count()) {
        await areaByLabel.first().fill("Building A, grid A-1");
      }
      await reqBtn.first().click();
      await page.waitForTimeout(900);
      text = await bodyText(page);
      if (/Building A, grid A-1/i.test(text)) pass("request inspection");
      else fail("request inspection", "area not listed after submit", { snippet: text.slice(0, 500) });
    }

    await shot(page, "core-loop");
  } finally {
    await closePage(page);
  }
}

async function suiteGuidancePacks(browser) {
  console.log("\n[E] Guidance packs");
  const page = await newPage(browser, { mobile: true });
  try {
    // Static manifest
    const man = await page.request.get(`${BASE}/packs/jurisdiction-manifest.json`);
    const manOk = man.ok();
    let packCount = 0;
    if (manOk) {
      const json = await man.json();
      packCount = Array.isArray(json.packs) ? json.packs.length : 0;
    }
    if (manOk && packCount >= 50) pass("manifest has packs", { packCount });
    else fail("manifest has packs", `ok=${manOk} count=${packCount}`);

    // FL pack file
    const fl = await page.request.get(`${BASE}/packs/states/FL.json`);
    if (fl.ok()) pass("FL pack static");
    else fail("FL pack static", `status=${fl.status()}`);

    // UI button
    await goto(page, "/jobsite");
    await clearJobsiteStorage(page);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const start = page.getByRole("button", { name: /^Start blank jobsite$/i });
    if (await start.count()) {
      await start.first().click();
      await page.waitForTimeout(200);
      const yes = page.getByRole("button", { name: /Yes — start blank jobsite/i });
      if (await yes.count()) await yes.click();
      await page.waitForTimeout(700);
    }

    // Ensure on project/site view with guidance button
    const siteNav = page.locator("nav.bottom-nav button").last();
    if (await siteNav.count()) await siteNav.click({ force: true });
    await page.waitForTimeout(400);

    const stateSelect = page.locator("select").first();
    if (await stateSelect.count()) await stateSelect.selectOption("FL");

    const checkBtn = page.getByRole("button", { name: /Check guidance updates/i });
    if ((await checkBtn.count()) === 0) {
      fail("guidance check button", "not found");
    } else {
      await checkBtn.click();
      await page.waitForTimeout(1500);
      // Should not crash; optional success toast text
      const errs = page._qaErrors.pageErrors.length;
      if (errs === 0) pass("guidance check click (no crash)");
      else fail("guidance check click (no crash)", `${errs} page errors`);
    }

    await shot(page, "guidance");
  } finally {
    await closePage(page);
  }
}

async function suiteClaims(browser) {
  console.log("\n[F] Claims");
  const page = await newPage(browser);
  try {
    await goto(page, "/claims");
    await page.waitForTimeout(500);
    const sample = page.getByRole("button", { name: /^Sample$/i });
    if ((await sample.count()) === 0) {
      fail("claims sample", "Sample button missing");
      return;
    }
    await sample.click();
    await page.waitForTimeout(800);
    const text = await bodyText(page);
    const hasTri =
      /Supported/i.test(text) && /Unproven/i.test(text) && /Disputed/i.test(text);
    if (hasTri) pass("claims sample board");
    else fail("claims sample board", "tri-state labels missing", {
      snippet: text.slice(0, 400),
    });
    await shot(page, "claims");
  } finally {
    await closePage(page);
  }
}

async function suiteMobile(browser) {
  console.log("\n[G] Mobile viewport");
  const page = await newPage(browser, { mobile: true });
  try {
    for (const path of ["/jobsite", "/claims"]) {
      await goto(page, path);
      await page.waitForTimeout(500);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          overflow: doc.scrollWidth > doc.clientWidth + 2,
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });
      const text = await bodyText(page);
      if (!overflow.overflow && text.length > 40) {
        pass(`mobile ${path} no overflow`, overflow);
      } else {
        fail(`mobile ${path} no overflow`, JSON.stringify(overflow));
      }
    }

    // Jobsite bottom nav present
    await goto(page, "/jobsite");
    await page.waitForTimeout(400);
    const navCount = await page.locator("nav.bottom-nav button").count();
    if (navCount >= 5) pass("mobile jobsite bottom nav", { navCount });
    else fail("mobile jobsite bottom nav", `buttons=${navCount}`);

    await shot(page, "mobile-jobsite");
  } finally {
    await closePage(page);
  }
}

// ---------- main ----------

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

console.log(`LPIN E2E → ${BASE}`);

try {
  // Health gate
  const probe = await fetch(`${BASE}/`).catch((e) => ({ ok: false, error: e }));
  if (!probe.ok && probe.status === undefined) {
    console.error("Server not reachable. Start with: npm run dev");
    process.exit(1);
  }

  for (const fn of [
    suiteSmoke,
    suiteBlank,
    suiteStateAhj,
    suiteCoreLoop,
    suiteGuidancePacks,
    suiteClaims,
    suiteMobile,
  ]) {
    try {
      await fn(browser);
    } catch (err) {
      fail(fn.name, String(err?.message || err));
      console.error(err);
    }
  }
} finally {
  await browser.close();
}

const summary = {
  base: BASE,
  failed,
  passed: results.filter((r) => r.ok).length,
  total: results.length,
  results,
  errors: allErrors.slice(0, 30),
};

const summaryPath = join(SHOT_DIR, "qa-lpin-suite-summary.json");
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
console.log(`\nSummary: ${summary.passed}/${summary.total} passed, ${failed} failed`);
console.log(`Wrote ${summaryPath}`);

if (failed > 0 || allErrors.length > 0) {
  if (allErrors.length) console.error("Page/console errors:", allErrors.slice(0, 10));
  process.exit(2);
}
process.exit(0);
