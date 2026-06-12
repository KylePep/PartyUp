# Seeders

## How it works

The seeder system has three layers:

1. **SeedRunner** (`apps/tools/PartyUp.SeedRunner/Program.cs`) — a console app that boots an EF Core `AppDbContext` and delegates to a seeder class based on a mode argument:
   ```bash
   dotnet run --project apps/tools/PartyUp.SeedRunner -- <MODE>
   ```

2. **HardcodedSchemas** (`HardcodedSchemas.cs`) — static factory methods that return `GameFieldDefinition` lists. Each method takes a `gameId` and returns the field schema for that game. Both seeders and integration tests share this file.

3. **Seeder classes** — plain C# classes that receive an `AppDbContext` and call `SaveChangesAsync()` as they go. No DI, no services — just direct EF inserts.

---

## Modes

| Mode | Command | Description |
|------|---------|-------------|
| `A` | `-- A` | Simple set: one user, two games, three characters |
| `B` | `-- B` | Two users sharing one game with different characters |
| `S` | `-- S [count]` | Scale seed: N users (default 50) in ESO with random interactions |
| `D` | `-- D` | Demo account with large-scale data across 12 games |

---

## Demo account (`D`)

Creates a fully populated login-able account for manual UI testing.

**Credentials:** `demo@partyup.test` / `Demo1234!`

| Game | Other players | Matches | Pending likes from others | Discovery queue |
|------|--------------|---------|--------------------------|----------------|
| Elder Scrolls Online | 45 | 0 | 5 | 37 undiscovered |
| Valorant | 22 | 15 | 2 | 2 |
| World of Warcraft | 20 | 12 | 2 | 3 |
| Destiny 2 | 18 | 10 | 2 | 3 |
| Apex Legends | 16 | 8 | 2 | 3 |
| Final Fantasy XIV | 14 | 6 | 1 | 4 |
| Guild Wars 2 | 12 | 5 | 1 | 3 |
| Minecraft | 10 | 4 | 1 | 2 |
| Sea of Thieves | 8 | 4 | 1 | 0 |
| Lost Ark | 7 | 3 | 1 | 0 |
| Path of Exile | 5 | 2 | 0 | 0 |
| Diablo IV | 4 | 1 | 0 | 0 |

If `demo@partyup.test` already exists when you run mode `D`, the seeder aborts early. Wipe the database and re-run to reset.
