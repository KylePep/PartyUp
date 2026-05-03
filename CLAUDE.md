# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PartyUp is a swipe-based matchmaking platform for multiplayer gamers. Users build character profiles per game and swipe on other characters — mutual likes create a match. It's a monorepo with an ASP.NET Core 8 backend API and a React + TypeScript + Vite frontend.

## Common Commands

### Start Everything
```bash
npm run dev          # Runs API + web concurrently (requires Docker DB running)
docker compose up -d # Start PostgreSQL container first
```

### Backend (apps/api)
```bash
dotnet watch run --project apps/api/PartyUp.Api.csproj   # API with hot reload
dotnet ef migrations add <Name> --project apps/api        # Add EF migration
dotnet ef database update --project apps/api              # Apply migrations
dotnet run --project apps/tools/PartyUp.SeedRunner -- A   # Seed database
```

### Frontend (apps/web)
```bash
npm run dev --prefix apps/web    # Vite dev server (http://localhost:5173)
npm run build --prefix apps/web  # Production build
```

### Testing
```bash
dotnet test                                                    # All tests
dotnet test apps/tests/PartyUp.Api.Tests                       # Integration tests only
dotnet test --filter "FullyQualifiedName~AuthTests"            # Single test class
```

## Architecture

### Backend (apps/api) — ASP.NET Core 8

**Pattern**: Controllers → Services (interface/impl) → EF Core DbContext → PostgreSQL

- [Program.cs](apps/api/Program.cs) — DI registration, middleware, JWT config, CORS (localhost:5173 only)
- [Infrastructure/Data/DbContext.cs](apps/api/Infrastructure/Data/DbContext.cs) — EF Core context with all DbSets
- [Controllers/](apps/api/Controllers/) — thin controllers, delegate to services
- [Services/](apps/api/Services/) — all business logic lives here; each service has an interface
- [Models/](apps/api/Models/) — EF Core entities
- [Infrastructure/Clients/RawgClient.cs](apps/api/Infrastructure/Clients/RawgClient.cs) — wraps api.rawg.io for game search

**Auth**: JWT bearer tokens (symmetric key), BCrypt password hashing. JWT key is hardcoded in dev — use User Secrets (`46836060-76dd-4b48-ae9c-8d3f3fec1319`) for real values.

**Key domain relationships**:
- `User` → `UserGame` (join) → `Game` (sourced from RAWG.io)
- `UserGame` → `Character` (a player's character for that game)
- `Character` → `CharacterInteraction` (Like/Dislike swipes between characters)
- Mutual likes → `CharacterMatch` (consistent GUID ordering prevents duplicate rows)

### Frontend (apps/web) — React + TypeScript + Vite

- [src/api/client.ts](apps/web/src/api/client.ts) — base fetch client; `API_BASE` hardcoded to `http://localhost:5288/api`
- [src/api/endpoints/](apps/web/src/api/endpoints/) — one file per resource (games, characters, etc.)
- [src/hooks/](apps/web/src/hooks/) — data-fetching hooks (e.g. `useCharacters`)
- [src/pages/](apps/web/src/pages/) — page-level components
- [src/components/](apps/web/src/components/) — shared UI components

### Tests (apps/tests/PartyUp.Api.Tests)

Integration tests using `xUnit` + `WebApplicationFactory<Program>`. Tests hit a real database — no mocking.

- [Infrastructure/ApiFactory.cs](apps/tests/PartyUp.Api.Tests/Infrastructure/ApiFactory.cs) — configures test app
- [Seeders/](apps/tests/PartyUp.Api.Tests/Seeders/) — DB init and test data
- [Factories/](apps/tests/PartyUp.Api.Tests/Factories/) — builder-pattern factories for test entities

## Configuration

Secrets (JWT key, DB connection string, RAWG API key) go in `apps/api/appsettings.Development.json` or .NET User Secrets — never in committed config files.

```json
{
  "Jwt": { "Key": "..." },
  "ConnectionStrings": { "DefaultConnection": "Host=localhost;Database=partyup;Username=partyup;Password=partyup" },
  "Rawg": { "ApiKey": "..." }
}
```

Docker DB defaults: host `localhost:5432`, user/password `partyup`, database `partyup`.
