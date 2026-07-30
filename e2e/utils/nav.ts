import type { Locator, Page } from "@playwright/test";

/**
 * Viewport-aware main navigation: on mobile the desktop nav is hidden and the
 * links live inside the hamburger Sheet (a dialog). Returns a locator scoped
 * to whichever navigation is actually visible, opening the sheet if needed.
 */
export async function openMainNav(page: Page): Promise<Locator> {
  const hamburger = page.getByRole("button", { name: "Open menu" });
  if (await hamburger.isVisible()) {
    await hamburger.click();
    return page.getByRole("dialog").getByRole("navigation", { name: "Main" });
  }
  return page.getByRole("navigation", { name: "Main" }).first();
}
