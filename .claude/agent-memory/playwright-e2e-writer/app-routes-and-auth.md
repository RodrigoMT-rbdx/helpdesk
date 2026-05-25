---
name: app-routes-and-auth
description: Application routes, auth flows, role-based access, and ProtectedRoute/AdminRoute behavior
metadata:
  type: project
---

## Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | `Login` | Public (always accessible) |
| `/` | `Home` | `ProtectedRoute` (any authenticated user) |
| `/users` | `Users` | `ProtectedRoute` + `AdminRoute` (admin only) |

## Auth client
- `authClient` from `better-auth/react`, baseURL `http://localhost:3001`
- `authClient.signIn.email({ email, password })` — returns `{ error }` on failure
- `authClient.signOut()` — clears HTTP-only session cookie
- `authClient.useSession()` — returns `{ data: session, isPending }` reactive hook

## Login form behavior
- Uses `react-hook-form` + `zodResolver` with schema: email must be valid, password must be non-empty
- Client-side errors: "Invalid email address", "Password is required"
- Server-side error displayed in `<Alert variant="destructive">` (`role="alert"`) — cleared on each new submission
- On success: navigates to `/`
- Loading state: button text changes to "Signing in…" and is disabled during request

## ProtectedRoute behavior
- Checks `authClient.useSession()`
- While `isPending=true`: shows a spinner
- If no session: `<Navigate to="/login" replace />`
- If session: renders `<Outlet />`

## AdminRoute behavior
- Same pattern as ProtectedRoute
- If no session OR role !== "admin": `<Navigate to="/" replace />`
- If admin: renders `<Outlet />`

## Important: /login has no redirect-if-authed guard
The `/login` route is NOT inside `ProtectedRoute`, and there is no "redirect if already logged in" guard. Authenticated users can navigate to `/login` freely — they stay on `/login`. Their session is preserved and they can navigate to `/` at any time.

## Layout navbar
- Shows user's `session.user.name`
- Shows "Users" nav link only if role === "admin"
- "Sign out" button calls `authClient.signOut()` then navigates to `/login`
