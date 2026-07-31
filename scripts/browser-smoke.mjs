#!/usr/bin/env node
/**
 * Lightweight headless load + screenshot.
 * Defaults: product port 8090; shots under ./screenshots (override with argv / LPIN_QA_SHOTS).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const url = process.argv[2] || process.env.LPIN_BASE_URL || "http://127.0.0.1:8090/";
const outPng =
  process.argv[3] ||
  process.env.LPIN_QA_SHOTS && join(process.env.LPIN_QA_SHOTS, "app-builder-preview.png") ||
  join(process.cwd(), "screenshots", "app-builder-preview.png");
mkdirSync(dirname(outPng), { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.screenshot({ path: outPng, fullPage: true });
await browser.close();
console.log("wrote", outPng);
