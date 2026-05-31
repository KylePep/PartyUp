# User Profile & Settings Design

**Date:** 2026-05-30  
**Status:** Approved

## Overview

Add a user profile system and settings page to PartyUp. The `User` model stays auth-only (credentials). A new `UserProfile` model owns all display and preference data. A dedicated settings page surfaces this to the user via the existing binder layout.

## Out of Scope

- Bio / about me
- Avatar / profile picture
- Location
- Auth0 integration (deferred to its own project)
- Character-level filter settings (future, per-Character preferences)
- Revealing profile data post-match (future, tied to messaging feature)

---

## Data Model

### `User` (modified)

Auth-only. One field renamed, no new fields added.

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `Email` | string | Renamed from `Username`. Required, unique, email-format validated. |
| `PasswordHash` | string | BCrypt hash |

### `UserProfile` (new)

1:1 with `User`. Created automatically at registration.

| Field | Type | Notes |
|---|---|---|
| `Id` | Guid | PK |
| `UserId` | Guid | FK → User, unique |
| `DisplayName` | string? | Nullable, max 50 chars. Private — not shown to other users. |
| `Preferences` | JSONB | Serialized `UserPreferences` object, defaults to `{}` |

### `UserPreferences` (C# class, not a table)

Typed class EF Core serializes into the `Preferences` JSONB column. New preference keys extend this class — no migration required.

```csharp
public class UserPreferences
{
    public bool DarkMode { get; set; } = false;
    public bool NotificationsEnabled { get; set; } = false;
}
```

---

## API

### ProfileController — `GET /api/profile`

Returns the authenticated user's profile.

**Response:**
```json
{
  "displayName": "Kyle",
  "preferences": {
    "darkMode": false,
    "notificationsEnabled": true
  }
}
```

### ProfileController — `PATCH /api/profile`

Updates email and/or display name. Email changes are validated for format and uniqueness.

**Request:**
```json
{
  "email": "new@example.com",
  "displayName": "Kyle"
}
```

**Response:** Updated profile object. Returns 400 if email is already taken or invalid format.

> `ProfileService` coordinates this update across both tables: `User.Email` and `UserProfile.DisplayName` in a single transaction.

### ProfileController — `PATCH /api/profile/preferences`

Merges the provided keys into the stored preferences blob.

**Request:**
```json
{
  "darkMode": true
}
```

**Response:** Full updated `UserPreferences` object.

### AuthController — `PUT /api/auth/password`

Changes the authenticated user's password. Lives in `AuthController` because credentials are a `User` concern, not a `UserProfile` concern.

**Request:**
```json
{
  "currentPassword": "old",
  "newPassword": "new"
}
```

**Response:** 200 on success. 400 if `currentPassword` is incorrect. Password validated for minimum strength (min 8 chars).

All endpoints require `[Authorize]` and resolve the user from the JWT `Id` claim. A new `IProfileService` / `ProfileService` pair follows the existing service pattern.

---

## Frontend

### SettingsPage

New page at the `/settings` route (already defined in `BinderTabs`). Uses `BinderLayout` with `activeTab="Settings"`.

**Left content — Account & Security:**

1. **Account section**
   - `Email` field — pre-filled, editable, email validation
   - `Display Name` field — pre-filled (if set), editable, max 50 chars
   - Save button → `PATCH /api/profile`

2. **Security section** (below Account)
   - `Current Password` field — always blank
   - `New Password` field — always blank
   - `Confirm New Password` field — always blank
   - Submit button → `PUT /api/auth/password`
   - Inline error shown if current password is wrong

**Right content — Preferences:**

- `Dark Mode` toggle → saved via `PATCH /api/profile/preferences`
- `Notifications` toggle (disabled/greyed, not yet implemented) → same endpoint when implemented
- Each toggle saves immediately on change (no Save button needed for preferences)

### Data Layer

- `src/api/endpoints/profileEndpoints.ts` — three fetch functions: `getProfile`, `updateProfile`, `updatePreferences`
- `src/hooks/useProfile.ts` — wraps `GET /api/profile`, exposes `profile`, `isLoading`, `updateProfile`, `updatePreferences`
- `AuthContext` updated: `username` field renamed to `email`, `profile` added to context state so display name and preferences are accessible app-wide without an extra fetch

### AuthContext changes

`GET /api/auth/me` response gains `profile` alongside `id` and `email`:

```json
{
  "id": "...",
  "email": "user@example.com",
  "profile": {
    "displayName": "Kyle",
    "preferences": { "darkMode": false, "notificationsEnabled": false }
  }
}
```

The JWT token itself is unchanged — it carries only `Id` and `Email` claims.

---

## Migration

One EF Core migration covers all schema changes:
- Rename column `Username` → `Email` on `Users` table
- Add `Email` unique index
- Create `UserProfiles` table with `UserId` unique FK, `DisplayName`, `Preferences`

Existing user rows get their `Username` value moved to `Email`. Profile rows are created for existing users with null `DisplayName` and empty `Preferences`.
