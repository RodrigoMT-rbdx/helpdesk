---
name: ui-selector-quirks
description: Known selector gotchas for this app's shadcn/ui components — CardTitle is a div not a heading, type=email native validation, etc.
metadata:
  type: project
---

## shadcn/ui CardTitle is a `<div>`, not a heading

`CardTitle` in `client/src/components/ui/card.tsx` renders as `<div data-slot="card-title">`, not `<h2>` or any semantic heading element.

**Do NOT use**: `getByRole('heading', { name: '...' })`  
**Use instead**: `page.locator('[data-slot="card-title"]', { hasText: '...' })`

This affects the Login page "Sign in" title. `getByText('Sign in', { exact: true })` also fails because the submit button also has text "Sign in", causing a strict-mode violation.

## `<input type="email">` native browser validation blocks Zod/react-hook-form

The browser intercepts form submit when the email field has `type="email"` and the value is malformed — the `submit` event never fires, so react-hook-form's `onSubmit`/Zod never run.

To test Zod's email validation in this app:
1. Fill a valid email so react-hook-form registers the field
2. Overwrite via native DOM setter: `nativeSet.call(el, 'bad@value'); el.dispatchEvent(new Event('input', { bubbles: true }))`
3. Submit via `page.evaluate(() => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))` — this bypasses browser constraint validation

## Home page heading IS a real `<h1>`
`<h1 className="text-4xl font-bold ...">Tickets</h1>` in the Home component renders as a real heading. `getByRole('heading', { name: 'Tickets' })` works fine.

## Users page heading IS a real `<h1>`
`<h1 className="text-3xl font-bold ...">Users</h1>` in the Users component renders as a real heading. `getByRole('heading', { name: 'Users' })` works fine.

## shadcn Badge — use `data-slot="badge"` to avoid strict-mode violations in table rows

`Badge` renders as `<span data-slot="badge">`. When a row contains a name like "Test Agent", `getByText("agent")` resolves to BOTH the cell text and the badge span. Use:

```ts
row.locator('[data-slot="badge"]', { hasText: "agent" })
```

## Unique emails for parallel tests — escape `+` in RegExp

Tests run fully in parallel sharing the same DB (reset only between full runs). Any test that creates a user must use a unique email:

```ts
const uniqueEmail = `testuser+${Date.now()}@example.com`;
```

When building a RegExp from this email to locate a row, `+` is a regex metacharacter and must be escaped:

```ts
const escaped = uniqueEmail.replace(/[+.*?^${}()|[\]\\]/g, "\\$&");
const row = page.getByRole("row", { name: new RegExp(escaped) });
```

Then target the badge within the row using `data-slot`:

```ts
await expect(row.locator('[data-slot="badge"]', { hasText: "agent" })).toBeVisible();
```

## Scoping form queries inside a Dialog

When a dialog is open and the page also contains a form outside the dialog, scope all field and button lookups to the dialog locator to avoid strict-mode violations:

```ts
const dialog = page.getByRole("dialog");
await dialog.getByLabel("Name").fill("...");
await dialog.getByRole("button", { name: "Create user" }).click();
```

To submit a form programmatically inside a dialog (bypassing browser validation), target the form within the dialog:

```ts
await page.evaluate(() => {
  const form = document.querySelector('[role="dialog"] form')!;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
});
```
