#!/usr/bin/env node
import { chromium } from "playwright";
const url = process.argv[2] || process.env.LPIN_BASE_URL || "http://127.0.0.1:8090/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url, { waitUntil: "networkidle" });
const out = process.argv[3] || "screenshots/preview-thumb.png";
await page.screenshot({ path: out });
await browser.close();
console.log("wrote", out);
