import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const outputDirectory = resolve(process.cwd(), "screenshots");
const routes = [
  {
    name: "home",
    path: "/",
    selector: ".reelroom-black-hole-stage",
  },
  {
    name: "songs",
    path: "/#songs",
    selector: ".reelroom-soundtrack-page",
  },
  {
    name: "tickets",
    path: "/#tickets",
    selector: ".reelroom-booking-page",
  },
  {
    name: "profile",
    path: "/#profile",
    selector: ".profile-experience",
  },
] as const;
const viewports = [
  { name: "desktop", width: 1440, height: 1000, isMobile: false },
  { name: "mobile", width: 375, height: 812, isMobile: true },
] as const;

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (const route of routes) {
      await page.goto(`${baseUrl}${route.path}`, {
        waitUntil: "domcontentloaded",
      });
      await page.locator(route.selector).waitFor({
        state: "visible",
        timeout: 30_000,
      });
      await page.waitForTimeout(1_000);
      await page.screenshot({
        path: resolve(outputDirectory, `${route.name}-${viewport.name}.png`),
        fullPage: true,
      });
    }

    await context.close();
  }
} finally {
  await browser.close();
}
