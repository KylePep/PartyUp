# PartyUp

PartyUp is a swipe-based matchmaking platform for multiplayer gamers. Players build character profiles for each game they play and swipe on other characters — mutual likes create a match, connecting players who want to team up.

---

## Features

- **Swipe-based discovery** — Like or pass on character cards to find compatible teammates
- **Game-specific profiles** — Characters are tied to individual games with game-appropriate attributes
- **AI-generated character fields** — Claude (Anthropic) generates game-specific profile fields (class, role, rank, playstyle, etc.) per game automatically
- **Mutual match system** — A match is created only when both players like each other
- **Character image uploads** — Avatar storage via Google Cloud Storage
- **Game catalog** — Backed by the RAWG.io API for game search and metadata
- **JWT authentication** — Stateless auth with BCrypt password hashing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core 8 Web API |
| ORM | Entity Framework Core |
| Database | PostgreSQL 15 |
| Frontend | React + TypeScript + Vite |
| AI | Anthropic Claude (Haiku) |
| File Storage | Google Cloud Storage |
| Game Data | RAWG.io API |
| Auth | JWT Bearer Tokens |
| Testing | xUnit + WebApplicationFactory |

---

## Architecture

This is a monorepo with the following layout:

```
apps/
  api/          # ASP.NET Core 8 backend
  web/          # React + TypeScript + Vite frontend
  tests/        # xUnit integration tests
  tools/        # CLI seed runner
```

### Backend (`apps/api`)

**Pattern:** Controllers → Services → EF Core DbContext → PostgreSQL

- Controllers are thin — all business logic lives in services
- Each service has a corresponding interface for testability
- JWT auth middleware protects all routes except login/register

**Domain model:**

```
User
 └── UserGame (join)
      └── Game  (sourced from RAWG.io)
           └── GameFieldDefinition  (AI-generated per-game schema)
      └── Character
           └── CharacterFieldValue  (EAV values for game-specific fields)
           └── CharacterInteraction  (Like/Dislike swipes)
                └── CharacterMatch  (created on mutual like)
```

### Frontend (`apps/web`)

- `src/api/` — typed fetch client and per-resource endpoint modules
- `src/hooks/` — data-fetching hooks
- `src/pages/` — page-level components (Home, Discover, Matches, Character management)
- `src/components/` — shared UI (cards, panels, modals, forms)

---

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for the local PostgreSQL database)

### 1. Start the database

```bash
docker compose up -d
```

This starts a PostgreSQL 15 container on port `5432` with user/password/database all set to `partyup`.

### 2. Configure secrets

Create `apps/api/appsettings.Development.json` (git-ignored):

```json
{
  "Jwt": {
    "Key": "your-development-jwt-secret-key"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=partyup;Username=partyup;Password=partyup"
  },
  "Rawg": {
    "ApiKey": "your-rawg-api-key"
  },
  "Anthropic": {
    "ApiKey": "your-anthropic-api-key"
  },
  "GoogleCloudStorage": {
    "BucketName": "your-gcs-bucket-name"
  }
}
```

- RAWG API key: [rawg.io/apidocs](https://rawg.io/apidocs)
- Anthropic API key: [console.anthropic.com](https://console.anthropic.com)
- GCS: requires a service account with `roles/storage.objectAdmin` on the bucket

### 3. Apply migrations

```bash
dotnet ef database update --project apps/api
```

### 4. (Optional) Seed the database

```bash
npm run dev:seed
```

### 5. Run the app

```bash
npm run dev
```

This starts the API (port `5288`) and the Vite dev server (port `5173`) concurrently.

---

## Development Commands

### Root

```bash
npm run dev          # Start API + frontend concurrently
npm run dev:seed     # Seed database with sample data
```

### Backend (`apps/api`)

```bash
dotnet watch run --project apps/api/PartyUp.Api.csproj   # API with hot reload
dotnet ef migrations add <Name> --project apps/api        # Add EF migration
dotnet ef database update --project apps/api              # Apply migrations
```

### Frontend (`apps/web`)

```bash
npm run dev --prefix apps/web    # Vite dev server
npm run build --prefix apps/web  # Production build
```

### Tests

```bash
dotnet test                                              # All tests
dotnet test apps/tests/PartyUp.Api.Tests                # Integration tests only
dotnet test --filter "FullyQualifiedName~CharacterTests" # Single test class
```

Integration tests use `WebApplicationFactory<Program>` and hit a real database — no mocks.

---

## How It Works

1. A user registers and selects games they play
2. For each game, the user creates a character profile
3. Game-specific profile fields (class, role, rank, etc.) are generated automatically by Claude based on the game's metadata
4. Users discover other characters in shared games via a swipe interface
5. Liking a character sends a `CharacterInteraction`; when both sides like each other, a `CharacterMatch` is created
6. Matched players can coordinate to play together

---

## Contributing

Pull requests are welcome. Please open an issue first for significant changes.
