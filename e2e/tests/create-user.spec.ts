import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Credentials (from seed script / .env.test)
// ---------------------------------------------------------------------------
const ADMIN = { email: "admin@example.com", password: "password123" };
const AGENT = { email: "agent@example.com", password: "password123" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAs(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

async function navigateToUsers(page: Page) {
  await page.goto("/users");
  await page.waitForURL("/users");
  // Wait for table to finish loading (skeletons disappear)
  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
}

async function openCreateUserDialog(page: Page) {
  await page.getByRole("button", { name: "New user" }).click();
  // Wait for dialog to be visible
  await expect(page.getByRole("dialog")).toBeVisible();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Create User", () => {
  // -------------------------------------------------------------------------
  // Dialog structure
  // -------------------------------------------------------------------------
  test.describe("Dialog structure", () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, ADMIN);
      await navigateToUsers(page);
      await openCreateUserDialog(page);
    });

    test("dialog opens with correct title and description", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("New user")).toBeVisible();
      await expect(
        dialog.getByText("Create a new agent account.")
      ).toBeVisible();
    });

    test("dialog contains Name, Email, and Password fields", async ({
      page,
    }) => {
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Name")).toBeVisible();
      await expect(dialog.getByLabel("Email")).toBeVisible();
      await expect(dialog.getByLabel("Password")).toBeVisible();
    });

    test("password field has type password", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Password")).toHaveAttribute(
        "type",
        "password"
      );
    });

    test("submit button reads 'Create user'", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: "Create user" })
      ).toBeVisible();
    });

    test("dialog closes when dismissed", async ({ page }) => {
      // Press Escape to close the dialog
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Client-side validation
  // -------------------------------------------------------------------------
  test.describe("Client-side validation", () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, ADMIN);
      await navigateToUsers(page);
      await openCreateUserDialog(page);
    });

    test("shows all three validation errors when form is submitted empty", async ({
      page,
    }) => {
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Create user" }).click();

      // Each error is rendered in a role=alert (shadcn Alert)
      await expect(
        dialog.getByText("Name must be at least 3 characters")
      ).toBeVisible();
      await expect(
        dialog.getByText("Invalid email address")
      ).toBeVisible();
      await expect(
        dialog.getByText("Password must be at least 8 characters")
      ).toBeVisible();
    });

    test("shows error when name is too short (under 3 characters)", async ({
      page,
    }) => {
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name").fill("ab");
      await dialog.getByLabel("Email").fill("newuser@example.com");
      await dialog.getByLabel("Password").fill("password123");
      await dialog.getByRole("button", { name: "Create user" }).click();

      await expect(
        dialog.getByText("Name must be at least 3 characters")
      ).toBeVisible();
    });

    test("shows error for invalid email address", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name").fill("New User");
      await dialog.getByLabel("Password").fill("password123");

      // Use the same technique as auth.spec.ts to bypass browser's native
      // type=email validation and test Zod's own email check
      await dialog.getByLabel("Email").fill("valid@example.com");
      await dialog.getByLabel("Email").evaluate((el: HTMLInputElement) => {
        const nativeSet = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value"
        )!.set!;
        nativeSet.call(el, "not-an-email");
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });

      await page.evaluate(() => {
        const form = document.querySelector('[role="dialog"] form')!;
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });

      await expect(
        dialog.getByText("Invalid email address")
      ).toBeVisible();
    });

    test("shows error when password is too short (under 8 characters)", async ({
      page,
    }) => {
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name").fill("New User");
      await dialog.getByLabel("Email").fill("newuser@example.com");
      await dialog.getByLabel("Password").fill("short");
      await dialog.getByRole("button", { name: "Create user" }).click();

      await expect(
        dialog.getByText("Password must be at least 8 characters")
      ).toBeVisible();
    });

    test("does not call the API when client-side validation fails", async ({
      page,
    }) => {
      let apiCalled = false;
      await page.route("**/api/users", (route) => {
        if (route.request().method() === "POST") {
          apiCalled = true;
        }
        return route.continue();
      });

      const dialog = page.getByRole("dialog");
      // Submit with empty fields
      await dialog.getByRole("button", { name: "Create user" }).click();

      await expect(
        dialog.getByText("Name must be at least 3 characters")
      ).toBeVisible();
      expect(apiCalled).toBe(false);
    });

    test("dialog stays open after validation errors", async ({ page }) => {
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Create user" }).click();

      await expect(
        dialog.getByText("Name must be at least 3 characters")
      ).toBeVisible();
      // Dialog should still be visible
      await expect(page.getByRole("dialog")).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Successful user creation
  // -------------------------------------------------------------------------
  test.describe("Successful user creation", () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, ADMIN);
      await navigateToUsers(page);
    });

    test("creates a new user and the dialog closes", async ({ page }) => {
      // Use a timestamp-based unique email to avoid collisions
      const uniqueEmail = `testuser+${Date.now()}@example.com`;

      await openCreateUserDialog(page);
      const dialog = page.getByRole("dialog");

      await dialog.getByLabel("Name").fill("Test Agent");
      await dialog.getByLabel("Email").fill(uniqueEmail);
      await dialog.getByLabel("Password").fill("password123");
      await dialog.getByRole("button", { name: "Create user" }).click();

      // Dialog should close on success
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });

    test("new user appears in the users table after creation", async ({
      page,
    }) => {
      const uniqueEmail = `testuser+${Date.now()}@example.com`;

      await openCreateUserDialog(page);
      const dialog = page.getByRole("dialog");

      await dialog.getByLabel("Name").fill("Test Agent");
      await dialog.getByLabel("Email").fill(uniqueEmail);
      await dialog.getByLabel("Password").fill("password123");
      await dialog.getByRole("button", { name: "Create user" }).click();

      // After dialog closes, the users list should refresh
      await expect(page.getByRole("dialog")).not.toBeVisible();
      // Scope to the unique email cell so the assertion is strict-mode safe
      await expect(page.getByRole("cell", { name: uniqueEmail })).toBeVisible();
    });

    test("new user is created with agent role (shown as 'agent' badge)", async ({
      page,
    }) => {
      const uniqueEmail = `testuser+${Date.now()}@example.com`;

      await openCreateUserDialog(page);
      const dialog = page.getByRole("dialog");

      await dialog.getByLabel("Name").fill("Test Agent");
      await dialog.getByLabel("Email").fill(uniqueEmail);
      await dialog.getByLabel("Password").fill("password123");
      await dialog.getByRole("button", { name: "Create user" }).click();

      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Find the role cell in the row that contains the unique email.
      // Use getByRole('cell') with the email to anchor the row, then check its
      // sibling role cell for the 'agent' badge via data-slot=badge.
      const emailCell = page.getByRole("cell", { name: uniqueEmail });
      await expect(emailCell).toBeVisible();
      // The badge is a <span data-slot="badge"> — use a locator scoped to the row
      const escapedEmail = uniqueEmail.replace(/[+.*?^${}()|[\]\\]/g, "\\$&");
      const row = page.getByRole("row", { name: new RegExp(escapedEmail) });
      await expect(row.locator('[data-slot="badge"]', { hasText: "agent" })).toBeVisible();
    });

    test("submit button shows 'Creating…' while the request is in flight", async ({
      page,
    }) => {
      const uniqueEmail = `testuser+${Date.now()}@example.com`;

      // Delay the POST /api/users response to observe the loading state
      await page.route("**/api/users", async (route) => {
        if (route.request().method() === "POST") {
          await new Promise((r) => setTimeout(r, 600));
        }
        await route.continue();
      });

      await openCreateUserDialog(page);
      const dialog = page.getByRole("dialog");

      await dialog.getByLabel("Name").fill("Test Agent");
      await dialog.getByLabel("Email").fill(uniqueEmail);
      await dialog.getByLabel("Password").fill("password123");
      await dialog.getByRole("button", { name: "Create user" }).click();

      await expect(
        dialog.getByRole("button", { name: "Creating…" })
      ).toBeDisabled();

      // Wait for dialog to close so the route mock is cleaned up
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Server-side errors
  // -------------------------------------------------------------------------
  test.describe("Server-side errors", () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, ADMIN);
      await navigateToUsers(page);
      await openCreateUserDialog(page);
    });

    test("shows error when email already exists (seeded admin email)", async ({
      page,
    }) => {
      const dialog = page.getByRole("dialog");

      await dialog.getByLabel("Name").fill("Duplicate User");
      await dialog.getByLabel("Email").fill(ADMIN.email);
      await dialog.getByLabel("Password").fill("password123");
      await dialog.getByRole("button", { name: "Create user" }).click();

      await expect(
        dialog.getByText("A user with this email already exists")
      ).toBeVisible();
    });

    test("shows error when email already exists (seeded agent email)", async ({
      page,
    }) => {
      const dialog = page.getByRole("dialog");

      await dialog.getByLabel("Name").fill("Duplicate User");
      await dialog.getByLabel("Email").fill(AGENT.email);
      await dialog.getByLabel("Password").fill("password123");
      await dialog.getByRole("button", { name: "Create user" }).click();

      await expect(
        dialog.getByText("A user with this email already exists")
      ).toBeVisible();
    });

    test("dialog stays open when server returns a duplicate email error", async ({
      page,
    }) => {
      const dialog = page.getByRole("dialog");

      await dialog.getByLabel("Name").fill("Duplicate User");
      await dialog.getByLabel("Email").fill(ADMIN.email);
      await dialog.getByLabel("Password").fill("password123");
      await dialog.getByRole("button", { name: "Create user" }).click();

      await expect(
        dialog.getByText("A user with this email already exists")
      ).toBeVisible();
      // Dialog must remain open
      await expect(page.getByRole("dialog")).toBeVisible();
    });

    test("server error is cleared when the dialog is closed and reopened", async ({
      page,
    }) => {
      const dialog = page.getByRole("dialog");

      // Trigger a server error
      await dialog.getByLabel("Name").fill("Duplicate User");
      await dialog.getByLabel("Email").fill(ADMIN.email);
      await dialog.getByLabel("Password").fill("password123");
      await dialog.getByRole("button", { name: "Create user" }).click();
      await expect(
        dialog.getByText("A user with this email already exists")
      ).toBeVisible();

      // Close the dialog via Escape
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();

      // Reopen the dialog
      await page.getByRole("button", { name: "New user" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();

      // The server error should be gone
      await expect(
        page.getByText("A user with this email already exists")
      ).not.toBeVisible();
    });
  });
});
