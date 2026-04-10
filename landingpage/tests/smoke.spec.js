const { test, expect } = require("@playwright/test");

async function openWaitlistModal(page) {
  await page.getByRole("button", { name: "Join Waitlist" }).first().click();
  await expect(page.getByRole("heading", { name: "Join Waitlist" })).toBeVisible();
}

function waitlistDialog(page) {
  return page.locator("[data-waitlist-dialog]");
}

test("demo video opens in modal from See demo", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  await page.getByRole("button", { name: "See demo" }).click();
  await expect(page.getByRole("heading", { name: "See CursorBuddy in action" })).toBeVisible();
  await expect(page.locator("#demo-video")).toBeVisible();

  await page.getByRole("button", { name: "Close demo video" }).click();
  await expect(page.locator("[data-demo-dialog]")).toBeHidden();
});

test("landing page waitlist flow works end to end", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  await expect(page).toHaveTitle(/CursorBuddy/);
  await expect(page.getByRole("heading", { level: 1, name: "Speak. Follow. Learn." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Join Waitlist" }).first()).toBeVisible();

  await openWaitlistModal(page);

  const dialog = waitlistDialog(page);
  const emailField = dialog.locator("#waitlist-email");
  await dialog.locator("#waitlist-name").fill("Ada Lovelace");
  await emailField.fill("not-an-email");
  await dialog.getByRole("button", { name: "Join Waitlist" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();

  await emailField.fill("ada@example.com");
  await dialog.locator("#preferred-app").selectOption("vscode");
  await dialog.getByRole("button", { name: "Join Waitlist" }).click();
  await page.waitForURL("**/thanks/");
  await expect(page.getByRole("heading", { level: 1, name: "You are on the list." })).toBeVisible();

  await page.goto("/", { waitUntil: "load" });
  await openWaitlistModal(page);
  const dialog2 = waitlistDialog(page);
  await dialog2.locator("#waitlist-name").fill("Ada Lovelace");
  await dialog2.locator("#waitlist-email").fill("ada@example.com");
  await dialog2.locator("#preferred-app").selectOption("vscode");
  await dialog2.getByRole("button", { name: "Join Waitlist" }).click();
  await expect(page.getByText("You are already on the list")).toBeVisible();
});

test("legal routes and not found page render", async ({ page }) => {
  await page.goto("/privacy/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1, name: "CursorBuddy Privacy Policy" })).toBeVisible();

  await page.goto("/terms/", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1, name: "CursorBuddy Terms of Use" })).toBeVisible();

  await page.goto("/404.html", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1, name: "This path drifted off the page." })).toBeVisible();
});
