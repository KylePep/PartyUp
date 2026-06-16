# Admin System — Design Spec
**Date:** 2026-06-16
**Scope:** Admin role, admin auth, and a game schema management panel (Phase 1 of a broader admin surface).

---

## Goal

Enable an admin user to log in through the normal app flow and access an admin panel where they can view all games and trigger schema regeneration for failed or pending entries — without using the terminal or direct DB access.

Future admin features (user banning, image removal, field definition editing, realm regrouping) are out of scope for this spec but the structure established here is designed to accommodate them.

---

## Section 1: Data Model & Auth

### `User` model
Add one field:
```csharp
public bool IsAdmin { get; set; } // defaults false
```

### EF Migration
A new migration adds the `is_admin` boolean column to the `Users` table, defaulting to `false` for all existing rows.

### JWT claim
`AuthService.GenerateJwt` conditionally adds a role claim when `IsAdmin` is true:
```csharp
new Claim(ClaimTypes.Role, "Admin")
```
ASP.NET Core's JWT bearer middleware maps `ClaimTypes.Role` to the role system automatically — no changes to `Program.cs` are needed for `[Authorize(Roles = "Admin")]` to work.

### How admin is granted
Direct database update only. No registration endpoint exists for this:
```sql
UPDATE users SET is_admin = true WHERE email = 'your@email.com';
```

### `/auth/me` response
Add `isAdmin: bool` to the response so the frontend can read it without decoding the JWT. The JWT role claim remains the enforcement mechanism on the backend; this is purely for frontend rendering decisions.

---

## Section 2: Backend API

### `AdminController`
New controller at `api/admin`, decorated with `[Authorize(Roles = "Admin")]` at the class level. Every endpoint in this controller is admin-only by default.

### `GET /api/admin/games`
Returns all games in the database. Response shape per game:
```
id, name, imageUrl, schemaStatus, fieldDefinitionCount
```
Used to populate the admin panel games table.

### `POST /api/admin/games/{id}/regenerate-schema`
Triggers schema regeneration for the given game (fire-and-forget, same pattern as the removed endpoint). No rate limiting — admin-only traffic does not need it.

Uses `IGameSchemaGenerationService` directly via DI, with `force: true` so it re-generates regardless of current status.

### Removed endpoint
`POST /games/{id}/regenerate-schema` on `GamesController` is removed. It was accessible to all authenticated users, which conflicts with the decision to make regeneration admin-only.

---

## Section 3: Frontend

### `CurrentUser` type
`isAdmin: boolean` added to the `CurrentUser` type in `apps/web/src/api/endpoints/auth.ts`.

### Admin route guard
New `AdminRoute` component reads `state.user.isAdmin` from `useAuth()`. If false, redirects to `/home`. The `/admin` route is nested inside `SignedInLayout`, so unauthenticated users are already redirected to `/` before `AdminRoute` is evaluated.

### Routing
`App.tsx` nests the admin route inside the existing `SignedInLayout` group:
```
/admin  →  AdminRoute  →  AdminPage
```
The NavBar is visible on the admin page, allowing easy navigation back to the regular app.

### `apps/web/src/api/endpoints/admin.ts`
Two functions:
- `getAdminGames()` — `GET /api/admin/games`
- `adminRegenerateSchema(gameId: string)` — `POST /api/admin/games/{id}/regenerate-schema`

### `AdminPage` (`/admin`)
A table of all games with the following columns:
- Game name (with thumbnail if available)
- Schema status — rendered as a colored badge:
  - `Failed` → red
  - `Generating` → yellow/amber
  - `Generated` → green
  - `Pending` → grey
- Regenerate button — active for `Failed` and `Pending` rows; disabled (with spinner) for `Generating` rows; hidden for `Generated` rows

No link in the main navigation. Entry point is the Settings page button (see below).

### Settings page
A conditionally rendered "Admin Panel" button is shown only when `state.user.isAdmin` is true. Navigates to `/admin`. Regular users see nothing different.

---

## What This Does Not Cover

- User banning
- Image moderation
- Field definition editing
- Realm regrouping

These are future admin features that will be added as separate specs. The `AdminController` structure established here gives them a natural home.
