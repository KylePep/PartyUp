# API Test Suite Design

**Date:** 2026-05-06
**Branch:** fix-character-interaction

## Goal

Add a comprehensive HTTP integration test suite covering the four active API feature areas: Auth, Characters, CharacterInteractions, and UserGames. Tests go through the full HTTP stack (WebApplicationFactory) so they verify routing, auth middleware, controller logic, and service logic together. Games controller is excluded — it calls the external RAWG.io API and works reliably in production.

## Scope

- **Happy paths**: the endpoint works correctly when used as intended
- **Sad paths**: focused on authorization — unauthenticated requests (401) and ownership checks (user A cannot touch user B's data)
- **Not covered**: 404s, validation errors, Games controller

## Infrastructure

### `ApiFactory` (update `apps/tests/PartyUp.Api.Tests/Infrastructure/ApiFactory.cs`)

Override `ConfigureWebHost` to swap the EF Core connection string to `partyup_test`. Currently the factory inherits `WebApplicationFactory<Program>` with no overrides, meaning tests silently run against the real database configured in `appsettings.Development.json`.

### `DatabaseReset` (update `apps/tests/PartyUp.Api.Tests/Infrastructure/DatabaseReset.cs`)

Read the connection string from the service provider's `IConfiguration` rather than the current hardcode (`Host=localhost;Port=5432;Database=partyup_test;Username=postgres;Password=postgres`). This keeps it in sync with whatever `ApiFactory` sets.

### `TestBase` (new `apps/tests/PartyUp.Api.Tests/Infrastructure/TestBase.cs`)

Abstract base class for all test classes. Implements `IAsyncLifetime` — since xUnit creates a new test class instance per test method, `InitializeAsync` runs before each test, giving true per-test DB isolation via Respawn.

Provides:
- `Factory` — the shared `ApiFactory` (via `IClassFixture<ApiFactory>`)
- `Client` — an unauthenticated `HttpClient` for 401 tests
- `CreateAuthenticatedClientAsync(username?, password?)` — registers a user, logs in, returns an `HttpClient` with `Authorization: Bearer <token>` set. Generates a random username by default (`user_{Guid}`) so tests are self-contained even if isolation fails.

All test classes inherit `TestBase` and declare `IClassFixture<ApiFactory>`.

## Test Files

### `Features/Auth/AuthTests.cs` (extend existing)

| Test | What it checks |
|------|---------------|
| `Register_ThenLogin_ReturnsToken` | Happy path (rename of existing test) |
| `Login_WithWrongPassword_Returns401` | Wrong credentials → 401 |
| `Register_WithDuplicateUsername_ReturnsBadRequest` | Duplicate username → 400 |
| `Me_WithoutAuth_Returns401` | `GET /api/auth/me` with no token → 401 |

### `Features/Characters/CharacterTests.cs` (new)

| Test | What it checks |
|------|---------------|
| `CreateCharacter_ReturnsCreated` | `POST /api/characters` with valid UserGame → 201 |
| `GetMyCharacters_ReturnsCharacters` | `GET /api/characters` returns the authenticated user's characters |
| `Discover_ReturnsOtherUsersCharactersForSameGame` | `GET /api/characters/discover?gameId=` returns other users' characters, not own |
| `CreateCharacter_WithoutAuth_Returns401` | `POST /api/characters` with no token → 401 |
| `GetMyCharacters_WithoutAuth_Returns401` | `GET /api/characters` with no token → 401 |
| `CreateCharacter_OnAnotherUsersGame_ReturnsNotFound` | User A POSTs with user B's UserGame ID → 404 |

### `Features/CharacterInteractions/CharacterInteractionTests.cs` (new)

| Test | What it checks |
|------|---------------|
| `Like_WithNoMutualLike_IsMatchFalse` | One-sided like → `{ isMatch: false }` |
| `Like_WithMutualLike_IsMatchTrue` | A likes B, B likes A → `{ isMatch: true, matchId: ... }` |
| `Dislike_IsMatchFalse` | Dislike → `{ isMatch: false }` |
| `RecordInteraction_WithoutAuth_Returns401` | `POST /api/character-interactions` with no token → 401 |

### `Features/UserGames/UserGameTests.cs` (new)

| Test | What it checks |
|------|---------------|
| `AddGame_ReturnsUserGame` | `POST /api/user-games` with seeded game → 200 with UserGame response |
| `GetUserGames_ReturnsOwnGames` | `GET /api/user-games` returns only the authenticated user's games |
| `DeleteUserGame_RemovesGame` | `DELETE /api/user-games/{id}` → 204, subsequent GET returns empty |
| `AddGame_WithoutAuth_Returns401` | `POST /api/user-games` with no token → 401 |
| `GetUserGames_WithoutAuth_Returns401` | `GET /api/user-games` with no token → 401 |
| `GetUserGames_DoesNotReturnOtherUsersGames` | Two users add games; each GET only sees their own |

## Test Data Strategy

- **Games**: not pre-seeded. `AddUserGameRequest` accepts `ExternalId/Name/ImageUrl` directly — `UserGameService` creates the game record internally. Character and interaction tests that need a UserGame ID should POST to `/api/user-games` first.
- **Users**: created via HTTP (`POST /api/auth/register`) so they have valid password hashes and JWT tokens
- **UserGames, Characters, Interactions**: created via HTTP wherever possible; seeded directly via factories only when needed as preconditions (e.g. setting up the "other user's" character for a discover or ownership test)

## Known Issues to Fix During Implementation

- **`AuthTests.cs` field name bug**: the existing test sends `passwordHash` but `RegisterRequest` uses `Password`. The test currently sends null for the password field. Fix field name to `password` when extending the test class.

## Total Test Count

~20 tests across 4 feature files + 1 shared infrastructure file.
