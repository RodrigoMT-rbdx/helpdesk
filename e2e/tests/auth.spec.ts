import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Credentials (from seed script / .env.test)
// ---------------------------------------------------------------------------
const ADMIN = { email: "admin@example.com", password: "password123", name: "Admin" };
const AGENT = { email: "agent@example.com", password: "password123", name: "Agent" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a locator for the "Sign in" card title on the login page.
 * CardTitle renders as a <div data-slot="card-title">, not a semantic heading.
 * We scope by the data-slot attribute to avoid matching the submit button's text.
 */
function signInTitle(page: Page) {
  return page.locator('[data-slot="card-title"]', { hasText: "Sign in" });
}

async function fillLoginForm(page: Page, email: string, password: string) {
  if (email) await page.getByLabel("Email").fill(email);
  if (password) await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

async function loginAs(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await fillLoginForm(page, user.email, user.password);
  await page.waitForURL("/");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Authentication", () => {
  // -------------------------------------------------------------------------
  // Login page: structure
  // -------------------------------------------------------------------------
  test.describe("Login page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("shows the login card with correct title and description", async ({ page }) => {
      // CardTitle renders as a <div>, not a semantic heading, so use text match
      await expect(signInTitle(page)).toBeVisible();
      await expect(page.getByText("Tickets — Support Management")).toBeVisible();
    });

    test("renders email and password fields and a submit button", async ({ page }) => {
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    });

    test("email field has type email and password field has type password", async ({ page }) => {
      await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
      await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
    });
  });

  // -------------------------------------------------------------------------
  // Successful login
  // -------------------------------------------------------------------------
  test.describe("Successful login", () => {
    test("admin can log in and lands on the home page", async ({ page }) => {
      await page.goto("/login");
      await fillLoginForm(page, ADMIN.email, ADMIN.password);
      await page.waitForURL("/");
      await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
    });

    test("agent can log in and lands on the home page", async ({ page }) => {
      await page.goto("/login");
      await fillLoginForm(page, AGENT.email, AGENT.password);
      await page.waitForURL("/");
      await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
    });

    test("nav bar displays the logged-in user's name after admin login", async ({ page }) => {
      await loginAs(page, ADMIN);
      await expect(page.getByText(ADMIN.name)).toBeVisible();
    });

    test("nav bar displays the logged-in user's name after agent login", async ({ page }) => {
      await loginAs(page, AGENT);
      await expect(page.getByText(AGENT.name)).toBeVisible();
    });

    test("admin sees the Users nav link", async ({ page }) => {
      await loginAs(page, ADMIN);
      await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
    });

    test("agent does NOT see the Users nav link", async ({ page }) => {
      await loginAs(page, AGENT);
      await expect(page.getByRole("link", { name: "Users" })).not.toBeVisible();
    });

    test("submit button shows 'Signing in…' while the request is in flight", async ({ page }) => {
      await page.goto("/login");
      // Delay the sign-in response so we can observe the loading state
      await page.route("**/api/auth/sign-in/email", async (route) => {
        await new Promise((r) => setTimeout(r, 600));
        await route.continue();
      });
      await fillLoginForm(page, ADMIN.email, ADMIN.password);
      await expect(page.getByRole("button", { name: "Signing in…" })).toBeDisabled();
      // Wait for navigation to complete so the route mock is cleaned up
      await page.waitForURL("/");
    });
  });

  // -------------------------------------------------------------------------
  // Client-side validation (Zod / react-hook-form — no network call needed)
  // -------------------------------------------------------------------------
  test.describe("Client-side validation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("shows validation errors when both fields are empty and form is submitted", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText("Invalid email address")).toBeVisible();
      await expect(page.getByText("Password is required")).toBeVisible();
    });

    test("shows validation error when email is missing", async ({ page }) => {
      await page.getByLabel("Password").fill(ADMIN.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText("Invalid email address")).toBeVisible();
    });

    test("shows validation error when password is missing", async ({ page }) => {
      await page.getByLabel("Email").fill(ADMIN.email);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByText("Password is required")).toBeVisible();
    });

    test("shows validation error for a malformed email address", async ({ page }) => {
      // The <input type="email"> has native browser validation that blocks the
      // submit event before React/Zod runs. To test Zod's own email check:
      // 1. Fill a valid email so the field is registered by react-hook-form
      // 2. Then overwrite the value via the native setter (bypassing React events)
      //    with a bad value — react-hook-form's stored value becomes invalid
      // 3. Submit via page.evaluate on the form element to skip browser validation
      await page.getByLabel("Email").fill(ADMIN.email);
      await page.getByLabel("Password").fill(ADMIN.password);

      // Overwrite email field value to something malformed without triggering
      // react-hook-form's internal re-validation (so it won't pre-clear the error)
      await page.getByLabel("Email").evaluate((el: HTMLInputElement) => {
        const nativeSet = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!;
        nativeSet.call(el, "not-an-email");
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });

      // Submit the form programmatically, bypassing browser's built-in
      // HTML5 constraint validation (which would block on type=email)
      await page.evaluate(() => {
        const form = document.querySelector("form")!;
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });

      await expect(page.getByText("Invalid email address")).toBeVisible();
    });

    test("does NOT make a network request when client-side validation fails", async ({
      page,
    }) => {
      let signInCalled = false;
      await page.route("**/api/auth/sign-in/email", (route) => {
        signInCalled = true;
        return route.continue();
      });

      // Submit with both fields empty — Zod will reject before any fetch
      await page.getByRole("button", { name: "Sign in" }).click();
      // Wait for error messages to confirm validation ran
      await expect(page.getByText("Invalid email address")).toBeVisible();
      expect(signInCalled).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Server-side authentication errors
  // -------------------------------------------------------------------------
  test.describe("Server-side authentication errors", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("shows an error for wrong password", async ({ page }) => {
      await fillLoginForm(page, ADMIN.email, "wrong-password");
      await expect(page.getByRole("alert")).toBeVisible();
      // The user stays on the login page
      await expect(page).toHaveURL(/\/login/);
    });

    test("shows an error for a non-existent email address", async ({ page }) => {
      await fillLoginForm(page, "nobody@example.com", "irrelevant");
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    });

    test("clears the server error when a new successful submission starts", async ({ page }) => {
      // First attempt — fail
      await fillLoginForm(page, ADMIN.email, "bad-password");
      await expect(page.getByRole("alert")).toBeVisible();

      // Second attempt — succeed; navigate to home and confirm no alert remains
      await page.getByLabel("Password").fill(ADMIN.password);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL("/");
      // On the home page there should be no destructive alert
      await expect(page.getByRole("alert")).not.toBeVisible();
    });

    test("does not navigate away on a failed login attempt", async ({ page }) => {
      await fillLoginForm(page, ADMIN.email, "bad-password");
      await expect(page.getByRole("alert")).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    });
  });

  // -------------------------------------------------------------------------
  // Route protection — unauthenticated access
  // -------------------------------------------------------------------------
  test.describe("Route protection — unauthenticated", () => {
    test("visiting / without a session redirects to /login", async ({ page }) => {
      await page.goto("/");
      await page.waitForURL(/\/login/);
      await expect(signInTitle(page)).toBeVisible();
    });

    test("visiting /users without a session redirects to /login", async ({ page }) => {
      await page.goto("/users");
      await page.waitForURL(/\/login/);
      await expect(signInTitle(page)).toBeVisible();
    });

    test("the login page is accessible without a session", async ({ page }) => {
      // /login is the only public route — it must always be reachable unauthenticated
      await page.goto("/login");
      await expect(signInTitle(page)).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Route protection — role-based (admin vs agent)
  // -------------------------------------------------------------------------
  test.describe("Route protection — role-based", () => {
    test("agent visiting /users is redirected to /", async ({ page }) => {
      await loginAs(page, AGENT);
      await page.goto("/users");
      await page.waitForURL("/");
      await expect(page.getByRole("heading", { name: "Tickets" })).toBeVisible();
    });

    test("admin visiting /users sees the Users page", async ({ page }) => {
      await loginAs(page, ADMIN);
      await page.goto("/users");
      await page.waitForURL("/users");
      await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Authenticated user visiting /login
  // -------------------------------------------------------------------------
  test.describe("Authenticated user visiting /login", () => {
    test("logged-in admin can still navigate to /login but their session is preserved", async ({
      page,
    }) => {
      await loginAs(page, ADMIN);
      // /login is not wrapped in ProtectedRoute so it is always accessible.
      // The app does not auto-redirect away from /login when authenticated.
      await page.goto("/login");
      await expect(page).toHaveURL(/\/login/);
      // Session cookie is still set — navigating to / succeeds without re-login
      await page.goto("/");
      await page.waitForURL("/");
      await expect(page.getByText(ADMIN.name)).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Logout flow
  // -------------------------------------------------------------------------
  test.describe("Logout", () => {
    test("sign out button appears in the nav for a logged-in user", async ({ page }) => {
      await loginAs(page, ADMIN);
      await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    });

    test("clicking Sign out redirects to /login", async ({ page }) => {
      await loginAs(page, ADMIN);
      await page.getByRole("button", { name: "Sign out" }).click();
      await page.waitForURL(/\/login/);
      await expect(signInTitle(page)).toBeVisible();
    });

    test("after signing out, protected routes redirect to /login", async ({ page }) => {
      await loginAs(page, ADMIN);
      await page.getByRole("button", { name: "Sign out" }).click();
      await page.waitForURL(/\/login/);

      // Try navigating to the protected home page
      await page.goto("/");
      await page.waitForURL(/\/login/);
      await expect(signInTitle(page)).toBeVisible();
    });

    test("agent can also sign out successfully", async ({ page }) => {
      await loginAs(page, AGENT);
      await page.getByRole("button", { name: "Sign out" }).click();
      await page.waitForURL(/\/login/);
      await expect(signInTitle(page)).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Session persistence
  // -------------------------------------------------------------------------
  test.describe("Session persistence", () => {
    test("a full page reload keeps the user logged in", async ({ page }) => {
      await loginAs(page, ADMIN);
      await page.reload();
      // After reload the ProtectedRoute re-checks the session via HTTP-only cookie
      await expect(page.getByText(ADMIN.name)).toBeVisible();
      await expect(page).toHaveURL("/");
    });
  });
});
