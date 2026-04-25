# FantazDB

A fantasy sports-style web app reimagined with Dragon Ball Z characters. Users draft teams of DBZ characters and compete across movie-based “instances” where actions during events generate scores.

---

## Concept

This project is a spin on fantasy football, but using Dragon Ball Z characters and story arcs.

### MVP Flow
- Users select favorite Dragon Ball characters
- Users build a personal roster/team

### Next Phase
- Users join a “movie instance” (e.g., *Dragon Ball Z: Broly Movie*)
- Users draft characters in turn-based sessions against others

### Gameplay Phase
- During a movie instance, users track character actions using predefined event options
- Actions generate points
- Highest score at end of movie wins

---

## Tech Stack

- Frontend: React (Vite + TypeScript)
- Backend: ASP.NET Core Web API
- Dev Orchestration: concurrently (root scripts)
- Shared: planned `packages/shared` for types/contracts

---

## Project Structure

- FantaZDB/
- fantazdb.web/ # React frontend (Vite)
- fantazdb.api/ # .NET Web API backend
- package.json # root dev orchestrator

---

## Running the Project

### 1. Install root dependencies
```bash
npm install
```
### 2. Install frontend dependencies
```
cd fantazdb.web
npm install
```

### 3. Run full stack (recommended)

From root:
```bash
npm run dev
```

This runs:

- React dev server (http://localhost:5173
)
- .NET API via `dotnet watch run`

---

### Backend Only
```
dotnet watch run --project ./fantazdb.api/Fantazdb.Api.csproj
```


API runs on:
- http://localhost:5288
 (HTTP)
- https://localhost:7246
 (HTTPS)
 ---

### Frontend Only
```
npm run dev --prefix fantazdb.web
```
---

### API Test Endpoint
`GET /api/hello`


Returns:

`Hello from .NET`