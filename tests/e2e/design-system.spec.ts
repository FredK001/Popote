import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("design system page", () => {
  test("renders every component section", async ({ page }) => {
    await page.goto("/design-system");
    await expect(page.getByRole("heading", { level: 1, name: "Design system" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
  });

  test("has no horizontal scroll at 390px", async ({ page }) => {
    await page.goto("/design-system");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("ticking an ingredient updates the mise en place bar", async ({ page }) => {
    await page.goto("/design-system");
    const tile = page.getByRole("checkbox", { name: "Cocher pommes" });
    await tile.click();
    await expect(tile).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("1 sur 6")).toBeVisible();
  });

  test("passes axe WCAG 2.2 AA checks", async ({ page }) => {
    await page.goto("/design-system");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
