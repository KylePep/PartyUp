# API Cleanup & Consistency Refactor

**Date:** 2026-05-05  
**Status:** Approved

## Overview

Eliminate dead code, fix naming inconsistencies between the `Character` entity and its DTOs, add missing response DTOs, close a security gap on the swipe endpoint, and rename `CharacterMatchService`/`SwipeController` so the backend vocabulary reflects the domain (`CharacterInteraction`) rather than the frontend action (`swipe`).

No behavioral changes — this is purely structural.

---

## Section 1: Deletions

| File | Reason |
|---|---|
| `Controllers/CharacterController.cs` | Misnamed file containing dead `UserGameCharactersController` (nested route `api/usergames/{userGameId}/characters` — unused, frontend uses `api/characters`) |
| `Controllers/UsersController.cs` | Admin scaffold — no authorization, exposed raw `User` entity including `PasswordHash` |
| `Services/UserService.cs` | Only served `UsersController` |
| `Services/Interfaces/IUserService.cs` | Same |

---

## Section 2: Model Changes

### `Models/Character.cs` — field renames (DB migration required)

| Current field | New field | Notes |
|---|---|---|
| `Description` | `Bio` | Column rename |
| `PlayStyle` | `Playstyle` | Column rename |
| `CreateAt` | `CreatedAt` | Typo fix, column rename |

DTOs already use `Bio`, `Playstyle`, and `CreatedAt`. After renaming the entity to match, all manual mapping shims in `CharacterService` (`Description = request.Bio`, `PlayStyle = request.Playstyle`) are removed.

### `Models/CharacterInteractions.cs` — file rename only

Rename file from `CharacterInteractions.cs` to `CharacterInteraction.cs`. The class inside was already named `CharacterInteraction` (singular). No code or DB changes required.

---

## Section 3: Missing DTOs & Misplaced Models

### New DTOs

| File | Location | Shape |
|---|---|---|
| `AuthResponse.cs` | `Models/DTOs/Auth/` | `{ string Token, string Username }` — returned by both login and register |
| `UserGameResponse.cs` | `Models/DTOs/UserGame/` | `{ Guid Id, Guid UserId, Guid GameId, string GameName, string? GameImageUrl }` — replaces raw `UserGame` entity in `UserGamesController` responses |

### Models moved into DTOs

| File | Current location | New location | Reason |
|---|---|---|---|
| `GameDetails.cs` | `Models/` | `Models/DTOs/Game/` | Not persisted — RAWG read model |
| `PagedGamesResult.cs` | `Models/` | `Models/DTOs/Game/` | Response wrapper, not an entity |

### `RawgGameDetailed.cs` — trim to used fields

Only 7 of the 30+ mapped properties are actually read by `GameService`. Remove unused properties. Keep: `Id`, `Name`, `Description`, `Background_Image`, `Website`, `Rating`, `Platforms`.

---

## Section 4: Service & Controller Renames

### Service

| Current | New | Notes |
|---|---|---|
| `Services/CharacterMatchService.cs` | `Services/CharacterInteractionService.cs` | Handles swipe recording + match detection |
| `Services/Interfaces/ICharacterMatchService.cs` | `Services/Interfaces/ICharacterInteractionService.cs` | Interface renamed to match |
| Method `SwipeAsync` | `RecordInteractionAsync` | Reflects what the method actually does |

`Program.cs` DI registration updated: `ICharacterInteractionService → CharacterInteractionService`.

### Controller

| Current | New | Route |
|---|---|---|
| `Controllers/SwipeController.cs` | `Controllers/CharacterInteractionController.cs` | `api/swipes` → `api/character-interactions` |

### DTO rename

| Current | New | Notes |
|---|---|---|
| `Models/DTOs/CharacterInteraction/SwipeRequest.cs` | `CharacterInteractionRequest.cs` | Name now matches the controller and service |

`[Authorize]` added to `CharacterInteractionController` — currently missing, allowing unauthenticated swipes.

### New interface: `IAuthService`

`AuthService` is the only service without an interface. Add `Services/Interfaces/IAuthService.cs`:

```csharp
public interface IAuthService
{
    Task<User?> Register(string username, string password);
    Task<string?> Login(string username, string password, IConfiguration config);
}
```

`AuthService` implements `IAuthService`. `Program.cs` registers `IAuthService → AuthService`.

---

## Final File Structure (apps/api)

```
Controllers/
  AuthController.cs
  CharacterInteractionController.cs   ← renamed from SwipeController
  CharactersController.cs
  GamesController.cs
  UserGamesController.cs

Models/
  Character.cs                        ← Bio, Playstyle, CreatedAt
  CharacterInteraction.cs             ← file renamed (singular)
  CharacterMatch.cs
  Game.cs
  UserGame.cs
  User.cs
  DTOs/
    Auth/
      AuthResponse.cs                 ← new
      LoginRequest.cs
      RegisterRequest.cs
    Character/
      CharacterResponse.cs
      CreateCharacterRequest.cs
      DiscoverCharacterResponse.cs
      UpdateCharacterRequest.cs
    CharacterInteraction/
      CharacterInteractionRequest.cs  ← renamed from SwipeRequest.cs
      MatchResponse.cs
    Game/
      GameDetails.cs                  ← moved from Models/
      PagedGamesResult.cs             ← moved from Models/
    Rawg/
      RawgGame.cs
      RawgGameDetailed.cs             ← trimmed
      RawgResponse.cs
    UserGame/
      AddUserGameRequest.cs
      UserGameResponse.cs             ← new

Services/
  AuthService.cs
  CharacterInteractionService.cs      ← renamed from CharacterMatchService
  CharacterService.cs
  GameService.cs
  UserGameService.cs
  Interfaces/
    IAuthService.cs                   ← new
    ICharacterInteractionService.cs   ← renamed from ICharacterMatchService
    ICharacterService.cs
    IGameService.cs
    IUserGameService.cs
```

---

## Migration

One EF Core migration required for the three `Character` field renames (`Description→Bio`, `PlayStyle→Playstyle`, `CreateAt→CreatedAt`). All other changes are code-only.

## Out of Scope

- No behavioral changes to any endpoint
- No new features
- Frontend route update (`api/swipes` → `api/character-interactions`) is a separate frontend task
