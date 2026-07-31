#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "fs/promises";
import { join } from "node:path";

const BASE = (process.env.LPIN_BASE_URL || "http://127.0.0.1:8090").replace(/\/$/, "");
const SHOT = process.env.LPIN_QA_SHOTS || join(process.cwd(), "screenshots");
await mkdir(SHOT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/jobsite`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: join(SHOT, "fp-wired-feed.png"), fullPage: true });
await page.screenshot({ path: join(SHOT, "fp-wired-messages.png"), fullPage: true });
await page.screenshot({ path: join(SHOT, "fp-wired-inspections.png"), fullPage: true });
await browser.close();
console.log("qa-jobsite-wire shots →", SHOT);
