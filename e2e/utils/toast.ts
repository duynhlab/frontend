import type { Locator, Page } from "@playwright/test";

/**
 * Toast locators via the accessibility tree only — no class names, so they
 * are implementation-agnostic (they survived the react-hot-toast → shadcn
 * swap unchanged). The Base UI viewport is a landmark region named
 * "Notifications"; each toast is a focusable alertdialog/dialog inside it.
 */
export function toastRegion(page: Page): Locator {
  return page.getByRole("region", { name: "Notifications" });
}

export function toastWithText(page: Page, text: string | RegExp): Locator {
  return toastRegion(page).getByText(text);
}
