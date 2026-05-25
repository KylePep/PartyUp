# AI-Generated Game Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace PartyUp's one-size-fits-all Character fields with AI-generated, game-specific field schemas stored as EAV rows, support filtering in discovery, add GCS-backed image upload, and add a large-scale seeder for testing match mechanics.

**Architecture:** When `UserGameService.AddGameToUser` inserts a new `Game` row (first time a game is added by any user), it fires a background `Task.Run` that calls Claude (`claude-haiku-4-5-20251001`) via raw HttpClient and saves the returned field definitions as `GameFieldDefinition` rows. Characters store per-field values in `CharacterFieldValue` rows. The discover endpoint filters these via chained LINQ `.Where` clauses. Image upload goes through a GCS storage service and returns a public URL.

**Tech Stack:** ASP.NET Core 8, EF Core 8 + PostgreSQL/Npgsql, Anthropic HTTP API (raw HttpClient, no SDK), Google.Cloud.Storage.V1, React 19 + TypeScript, TailwindCSS

---

## File Map

**New backend files:**
- `apps/api/Models/Enums/SchemaStatus.cs` — enum
- `apps/api/Models/Enums/FieldType.cs` — enum
- `apps/api/Models/GameFieldDefinition.cs` — EF entity
- `apps/api/Models/CharacterFieldValue.cs` — EF entity
- `apps/api/Models/DTOs/Character/CharacterFieldValueRequest.cs` — request DTO
- `apps/api/Models/DTOs/Character/CharacterFieldValueDto.cs` — response DTO
- `apps/api/Models/DTOs/Game/FieldDefinitionsResponse.cs` — response DTO
- `apps/api/Models/DTOs/Game/GameFieldDefinitionDto.cs` — response DTO
- `apps/api/Services/Interfaces/IAnthropicService.cs`
- `apps/api/Services/AnthropicService.cs`
- `apps/api/Services/Interfaces/IGameFieldDefinitionService.cs`
- `apps/api/Services/GameFieldDefinitionService.cs`
- `apps/api/Services/Interfaces/IGameSchemaGenerationService.cs`
- `apps/api/Services/GameSchemaGenerationService.cs`
- `apps/api/Services/Interfaces/IGcsStorageService.cs`
- `apps/api/Services/GcsStorageService.cs`
- `apps/tests/PartyUp.Api.Tests/Infrastructure/FakeAnthropicHandler.cs`
- `apps/tests/PartyUp.Api.Tests/Infrastructure/FakeGcsService.cs`
- `apps/tests/PartyUp.Api.Tests/Factories/GameFieldDefinitionFactory.cs`
- `apps/tests/PartyUp.Api.Tests/Features/GameFieldDefinitions/GameFieldDefinitionTests.cs`
- `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterFieldFilterTests.cs`
- `apps/tools/PartyUp.SeedRunner/ScaleSeeder.cs`
- `apps/tools/PartyUp.SeedRunner/HardcodedSchemas.cs`
- `apps/web/src/api/endpoints/fieldDefinitions.ts`
- `apps/web/src/hooks/useFieldDefinitions.ts`
- `apps/web/src/components/character-wizard/DynamicGameplayStep.tsx`
- `apps/web/src/components/DiscoveryFilters.tsx`

**Modified backend files:**
- `apps/api/Models/Game.cs` — add `SchemaStatus`, `FieldDefinitions` nav
- `apps/api/Models/Character.cs` — add `FieldValues` nav
- `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs` — add `GameFields`
- `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs` — add `GameFields`
- `apps/api/Infrastructure/Data/DbContext.cs` — add DbSets, EF config
- `apps/api/Services/GameService.cs` — fix missing `_db.Games.Add(game)` bug
- `apps/api/Services/UserGameService.cs` — inject `IServiceScopeFactory`, fire AI trigger
- `apps/api/Services/CharacterService.cs` — save field values, apply discover filters
- `apps/api/Controllers/GamesController.cs` — add field-definitions endpoint
- `apps/api/Controllers/CharactersController.cs` — update discover, add image upload
- `apps/api/Program.cs` — register new services
- `apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs` — register fakes
- `apps/tools/PartyUp.SeedRunner/Program.cs` — add Scale mode

**Modified frontend files:**
- `apps/web/src/api/endpoints/characters.ts` — add image upload, gameFields
- `apps/web/src/components/character-wizard/types.ts` — add `gameFields` to form data
- `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx` — fetch schema, loading, dynamic step
- `apps/web/src/components/character-wizard/IdentityStep.tsx` — file picker
- `apps/web/src/components/DiscoveryPanel.tsx` — add filter bar

---

## Task 1: Add NuGet packages and configuration shape

**Files:**
- Modify: `apps/api/PartyUp.Api.csproj`
- Modify: `apps/api/appsettings.Development.json` (add config keys — do not commit values)

- [ ] **Step 1: Add Google.Cloud.Storage.V1 package**

```bash
dotnet add apps/api/PartyUp.Api.csproj package Google.Cloud.Storage.V1
```

Expected: package added to csproj, `dotnet build apps/api` succeeds.

- [ ] **Step 2: Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Add config keys to appsettings.Development.json**

Add the following keys to `apps/api/appsettings.Development.json` (values stay empty — filled via User Secrets or environment vars):

```json
{
  "Anthropic": {
    "ApiKey": ""
  },
  "GoogleCloudStorage": {
    "BucketName": "partyup-characters"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/PartyUp.Api.csproj apps/api/appsettings.Development.json
git commit -m "chore: add GCS package and config shape for AI + storage"
```

---

## Task 2: SchemaStatus enum, GameFieldDefinition model, and EF migration

**Files:**
- Create: `apps/api/Models/Enums/SchemaStatus.cs`
- Create: `apps/api/Models/Enums/FieldType.cs`
- Create: `apps/api/Models/GameFieldDefinition.cs`
- Modify: `apps/api/Models/Game.cs`
- Modify: `apps/api/Infrastructure/Data/DbContext.cs`

- [ ] **Step 1: Create SchemaStatus enum**

Create `apps/api/Models/Enums/SchemaStatus.cs`:

```csharp
namespace PartyUp.Api.Models.Enums;

public enum SchemaStatus
{
    Pending,
    Generating,
    Generated,
    Failed
}
```

- [ ] **Step 2: Create FieldType enum**

Create `apps/api/Models/Enums/FieldType.cs`:

```csharp
namespace PartyUp.Api.Models.Enums;

public enum FieldType
{
    Select,
    MultiSelect,
    Text
}
```

- [ ] **Step 3: Create GameFieldDefinition model**

Create `apps/api/Models/GameFieldDefinition.cs`:

```csharp
using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Models;

public class GameFieldDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GameId { get; set; }
    public string Key { get; set; } = default!;
    public string Label { get; set; } = default!;
    public FieldType Type { get; set; }
    public List<string> Options { get; set; } = [];
    public bool IsFilterable { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
}
```

- [ ] **Step 4: Add SchemaStatus and nav property to Game**

Update `apps/api/Models/Game.cs`:

```csharp
using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Models;

public class Game
{
    public Guid Id { get; set; }
    public int ExternalId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? Description { get; set; }
    public string? Website { get; set; }
    public double Rating { get; set; }
    public List<string> Platforms { get; set; } = [];
    public SchemaStatus SchemaStatus { get; set; } = SchemaStatus.Pending;
    public List<GameFieldDefinition> FieldDefinitions { get; set; } = [];
}
```

- [ ] **Step 5: Register GameFieldDefinition in DbContext**

Update `apps/api/Infrastructure/Data/DbContext.cs` — add the DbSet and EF configuration:

```csharp
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Game> Games { get; set; }
        public DbSet<UserGame> UserGames { get; set; }
        public DbSet<Character> Characters { get; set; }
        public DbSet<CharacterInteraction> CharacterInteractions { get; set; }
        public DbSet<CharacterMatch> CharacterMatches { get; set; }
        public DbSet<GameFieldDefinition> GameFieldDefinitions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            var stringListComparer = new ValueComparer<List<string>>(
                (a, b) => a != null && b != null && a.SequenceEqual(b),
                v => v.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
                v => v.ToList());

            modelBuilder.Entity<Game>(e =>
            {
                e.Property(g => g.Platforms)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                    .HasColumnType("jsonb")
                    .Metadata.SetValueComparer(stringListComparer);

                e.Property(g => g.SchemaStatus).HasConversion<string>();
            });

            modelBuilder.Entity<GameFieldDefinition>(e =>
            {
                e.HasKey(x => x.Id);
                e.Property(x => x.Type).HasConversion<string>();
                e.Property(x => x.Options)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                        v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                    .HasColumnType("jsonb")
                    .Metadata.SetValueComparer(stringListComparer);
                e.HasOne<Game>()
                    .WithMany(g => g.FieldDefinitions)
                    .HasForeignKey(x => x.GameId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
```

- [ ] **Step 6: Generate migration**

```bash
dotnet ef migrations add AddGameFieldDefinitions --project apps/api
```

Expected: migration file created in `apps/api/Migrations/`.

- [ ] **Step 7: Edit migration to set existing Game rows to 'Failed'**

Open the generated migration file and find the `AddColumn` for `SchemaStatus`. Change `defaultValue` to `"Failed"` so existing games fall back to generic fields:

```csharp
migrationBuilder.AddColumn<string>(
    name: "SchemaStatus",
    table: "Games",
    type: "text",
    nullable: false,
    defaultValue: "Failed");
```

- [ ] **Step 8: Apply migration**

```bash
dotnet ef database update --project apps/api
```

Expected: Database updated successfully.

- [ ] **Step 9: Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/
git commit -m "feat: add GameFieldDefinition model, SchemaStatus, and migration"
```

---

## Task 3: CharacterFieldValue model and migration

**Files:**
- Create: `apps/api/Models/CharacterFieldValue.cs`
- Modify: `apps/api/Models/Character.cs`
- Modify: `apps/api/Infrastructure/Data/DbContext.cs`

- [ ] **Step 1: Create CharacterFieldValue model**

Create `apps/api/Models/CharacterFieldValue.cs`:

```csharp
namespace PartyUp.Api.Models;

public class CharacterFieldValue
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CharacterId { get; set; }
    public Guid FieldDefinitionId { get; set; }
    public string Value { get; set; } = default!;

    public GameFieldDefinition FieldDefinition { get; set; } = default!;
}
```

- [ ] **Step 2: Add FieldValues nav property to Character**

Add to `apps/api/Models/Character.cs` (after the `CreatedAt` line):

```csharp
    public List<CharacterFieldValue> FieldValues { get; set; } = [];
```

- [ ] **Step 3: Register CharacterFieldValue in DbContext**

Add to `AppDbContext` in `apps/api/Infrastructure/Data/DbContext.cs`:

After the `GameFieldDefinitions` DbSet line, add:
```csharp
        public DbSet<CharacterFieldValue> CharacterFieldValues { get; set; }
```

Add inside `OnModelCreating` after the `GameFieldDefinition` block:
```csharp
            modelBuilder.Entity<CharacterFieldValue>(e =>
            {
                e.HasKey(x => x.Id);
                e.HasOne(x => x.FieldDefinition)
                    .WithMany()
                    .HasForeignKey(x => x.FieldDefinitionId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne<Character>()
                    .WithMany(c => c.FieldValues)
                    .HasForeignKey(x => x.CharacterId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
```

- [ ] **Step 4: Generate migration**

```bash
dotnet ef migrations add AddCharacterFieldValues --project apps/api
```

Expected: migration file created.

- [ ] **Step 5: Apply migration**

```bash
dotnet ef database update --project apps/api
```

Expected: Database updated successfully.

- [ ] **Step 6: Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/
git commit -m "feat: add CharacterFieldValue model and migration"
```

---

## Task 4: AnthropicService

**Files:**
- Create: `apps/api/Services/Interfaces/IAnthropicService.cs`
- Create: `apps/api/Services/AnthropicService.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Infrastructure/FakeAnthropicHandler.cs`

- [ ] **Step 1: Create the interface**

Create `apps/api/Services/Interfaces/IAnthropicService.cs`:

```csharp
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;

namespace PartyUp.Api.Services.Interfaces;

public interface IAnthropicService
{
    Task<List<GameFieldDefinitionDto>> GenerateFieldDefinitionsAsync(Game game);
}
```

- [ ] **Step 2: Create the DTOs needed by the service**

Create `apps/api/Models/DTOs/Game/GameFieldDefinitionDto.cs`:

```csharp
using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Models.DTOs.Game;

public class GameFieldDefinitionDto
{
    public string Key { get; set; } = default!;
    public string Label { get; set; } = default!;
    public string Type { get; set; } = default!;
    public List<string> Options { get; set; } = [];
    public bool IsFilterable { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
}
```

Create `apps/api/Models/DTOs/Game/FieldDefinitionsResponse.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Game;

public class FieldDefinitionsResponse
{
    public string SchemaStatus { get; set; } = default!;
    public List<GameFieldDefinitionDto> Fields { get; set; } = [];
}
```

- [ ] **Step 3: Create AnthropicService**

Create `apps/api/Services/AnthropicService.cs`:

```csharp
using System.Net.Http.Json;
using System.Text.Json;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class AnthropicService : IAnthropicService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    public AnthropicService(IHttpClientFactory httpClientFactory, IConfiguration config)
    {
        _http = httpClientFactory.CreateClient("anthropic");
        _apiKey = config["Anthropic:ApiKey"]
            ?? throw new InvalidOperationException("Anthropic:ApiKey is not configured.");
    }

    public async Task<List<GameFieldDefinitionDto>> GenerateFieldDefinitionsAsync(Game game)
    {
        const string systemPrompt =
            "You are a gaming expert helping build a multiplayer matchmaking platform. " +
            "Given a game's details, return a JSON array of character field definitions " +
            "that players would use to find compatible teammates. Prioritize fields with " +
            "enumerable options (server region, class, role, faction) over free-text fields. " +
            "Return only valid JSON — no explanation, no markdown.";

        var userPrompt = $"""
            Game: {game.Name}
            Description: {game.Description ?? "N/A"}
            Platforms: {string.Join(", ", game.Platforms)}

            Return a JSON array with this exact shape:
            [{{"key":"...","label":"...","type":"Select|MultiSelect|Text","options":[...],"isFilterable":true,"isRequired":true,"sortOrder":1}}]
            """;

        var body = new
        {
            model = "claude-haiku-4-5-20251001",
            max_tokens = 1024,
            system = systemPrompt,
            messages = new[] { new { role = "user", content = userPrompt } }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("x-api-key", _apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");

        var response = await _http.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var raw = await response.Content.ReadAsStringAsync();
        var parsed = JsonSerializer.Deserialize<AnthropicResponse>(raw, JsonOpts)
            ?? throw new InvalidOperationException("Empty response from Anthropic.");

        var text = parsed.Content.FirstOrDefault()?.Text?.Trim()
            ?? throw new InvalidOperationException("No text content in Anthropic response.");

        // Strip markdown fences if Claude includes them
        var start = text.IndexOf('[');
        var end = text.LastIndexOf(']');
        if (start >= 0 && end > start)
            text = text[start..(end + 1)];

        return JsonSerializer.Deserialize<List<GameFieldDefinitionDto>>(text, JsonOpts)
            ?? throw new InvalidOperationException("Failed to deserialize field definitions.");
    }

    private sealed class AnthropicResponse
    {
        public List<AnthropicContent> Content { get; set; } = [];
    }

    private sealed class AnthropicContent
    {
        public string Type { get; set; } = "";
        public string Text { get; set; } = "";
    }
}
```

- [ ] **Step 4: Create the test fake**

Create `apps/tests/PartyUp.Api.Tests/Infrastructure/FakeAnthropicHandler.cs`:

```csharp
using System.Net;
using System.Text;

namespace PartyUp.Api.Tests.Infrastructure;

public class FakeAnthropicHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        const string json = """
        {
            "content": [{
                "type": "text",
                "text": "[{\"key\":\"server\",\"label\":\"Server\",\"type\":\"Select\",\"options\":[\"NA\",\"EU\"],\"isFilterable\":true,\"isRequired\":true,\"sortOrder\":1},{\"key\":\"alliance\",\"label\":\"Alliance\",\"type\":\"Select\",\"options\":[\"Ebonheart Pact\",\"Aldmeri Dominion\",\"Daggerfall Covenant\"],\"isFilterable\":true,\"isRequired\":true,\"sortOrder\":2}]"
            }]
        }
        """;

        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        });
    }
}
```

- [ ] **Step 5: Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/ apps/tests/
git commit -m "feat: add AnthropicService and FakeAnthropicHandler"
```

---

## Task 5: GameFieldDefinitionService

**Files:**
- Create: `apps/api/Services/Interfaces/IGameFieldDefinitionService.cs`
- Create: `apps/api/Services/GameFieldDefinitionService.cs`

- [ ] **Step 1: Create the interface**

Create `apps/api/Services/Interfaces/IGameFieldDefinitionService.cs`:

```csharp
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;

namespace PartyUp.Api.Services.Interfaces;

public interface IGameFieldDefinitionService
{
    Task SaveDefinitionsAsync(Guid gameId, List<GameFieldDefinitionDto> dtos);
    Task<List<GameFieldDefinition>> GetDefinitionsAsync(Guid gameId);
}
```

- [ ] **Step 2: Create the implementation**

Create `apps/api/Services/GameFieldDefinitionService.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Game;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class GameFieldDefinitionService : IGameFieldDefinitionService
{
    private readonly AppDbContext _db;

    public GameFieldDefinitionService(AppDbContext db)
    {
        _db = db;
    }

    public async Task SaveDefinitionsAsync(Guid gameId, List<GameFieldDefinitionDto> dtos)
    {
        var validDtos = dtos.Where(d =>
            !string.IsNullOrWhiteSpace(d.Key) &&
            !string.IsNullOrWhiteSpace(d.Label) &&
            (d.Type == "Text" || d.Options.Count > 0)).ToList();

        var definitions = validDtos.Select(dto => new GameFieldDefinition
        {
            GameId = gameId,
            Key = dto.Key,
            Label = dto.Label,
            Type = Enum.TryParse<FieldType>(dto.Type, out var ft) ? ft : FieldType.Text,
            Options = dto.Options,
            IsFilterable = dto.IsFilterable,
            IsRequired = dto.IsRequired,
            SortOrder = dto.SortOrder
        }).ToList();

        _db.GameFieldDefinitions.AddRange(definitions);
        await _db.SaveChangesAsync();
    }

    public async Task<List<GameFieldDefinition>> GetDefinitionsAsync(Guid gameId)
    {
        return await _db.GameFieldDefinitions
            .Where(d => d.GameId == gameId)
            .OrderBy(d => d.SortOrder)
            .ToListAsync();
    }
}
```

- [ ] **Step 3: Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/
git commit -m "feat: add GameFieldDefinitionService"
```

---

## Task 6: GameSchemaGenerationService

**Files:**
- Create: `apps/api/Services/Interfaces/IGameSchemaGenerationService.cs`
- Create: `apps/api/Services/GameSchemaGenerationService.cs`

- [ ] **Step 1: Create the interface**

Create `apps/api/Services/Interfaces/IGameSchemaGenerationService.cs`:

```csharp
namespace PartyUp.Api.Services.Interfaces;

public interface IGameSchemaGenerationService
{
    Task GenerateForGameAsync(Guid gameId);
}
```

- [ ] **Step 2: Create the implementation**

Create `apps/api/Services/GameSchemaGenerationService.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class GameSchemaGenerationService : IGameSchemaGenerationService
{
    private readonly AppDbContext _db;
    private readonly IAnthropicService _anthropic;
    private readonly IGameFieldDefinitionService _fieldDefinitions;
    private readonly ILogger<GameSchemaGenerationService> _logger;

    public GameSchemaGenerationService(
        AppDbContext db,
        IAnthropicService anthropic,
        IGameFieldDefinitionService fieldDefinitions,
        ILogger<GameSchemaGenerationService> logger)
    {
        _db = db;
        _anthropic = anthropic;
        _fieldDefinitions = fieldDefinitions;
        _logger = logger;
    }

    public async Task GenerateForGameAsync(Guid gameId)
    {
        var game = await _db.Games.FindAsync(gameId);
        if (game == null) return;

        game.SchemaStatus = SchemaStatus.Generating;
        await _db.SaveChangesAsync();

        try
        {
            var dtos = await _anthropic.GenerateFieldDefinitionsAsync(game);
            await _fieldDefinitions.SaveDefinitionsAsync(gameId, dtos);
            game.SchemaStatus = SchemaStatus.Generated;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate schema for game {GameId} ({GameName})", gameId, game.Name);
            game.SchemaStatus = SchemaStatus.Failed;
        }

        await _db.SaveChangesAsync();
    }
}
```

- [ ] **Step 3: Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/
git commit -m "feat: add GameSchemaGenerationService"
```

---

## Task 7: Wire AI generation into UserGameService and register services

**Files:**
- Modify: `apps/api/Services/GameService.cs` — fix missing `_db.Games.Add` bug
- Modify: `apps/api/Services/UserGameService.cs` — inject `IServiceScopeFactory`, fire trigger
- Modify: `apps/api/Program.cs` — register all new services
- Modify: `apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs` — register fakes

- [ ] **Step 1: Fix GetAndPersistGameDetails bug in GameService**

In `apps/api/Services/GameService.cs`, `GetAndPersistGameDetails` creates a `Game` but never calls `_db.Games.Add(game)`. Fix it:

```csharp
    public async Task<Game?> GetAndPersistGameDetails(int externalId)
    {
        var rawgGame = await _rawg.GetGameById(externalId);
        if (rawgGame == null)
            return null;

        var game = new Game
        {
            Name = rawgGame.Name,
            ExternalId = rawgGame.Id,
            ImageUrl = rawgGame.Background_Image,
            Description = rawgGame.Description,
            Website = rawgGame.Website,
            Rating = rawgGame.Rating,
            Platforms = rawgGame.Platforms.Select(p => p.Platform.Name).ToList(),
            SchemaStatus = SchemaStatus.Pending
        };

        _db.Games.Add(game);
        await _db.SaveChangesAsync();
        return game;
    }
```

- [ ] **Step 2: Update UserGameService to fire background generation**

Replace the entire `apps/api/Services/UserGameService.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.UserGame;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Services.Interfaces;

public class UserGameService : IUserGameService
{
    private readonly AppDbContext _db;
    private readonly IGameService _gameService;
    private readonly IServiceScopeFactory _scopeFactory;

    public UserGameService(AppDbContext db, IGameService gameService, IServiceScopeFactory scopeFactory)
    {
        _db = db;
        _gameService = gameService;
        _scopeFactory = scopeFactory;
    }

    public async Task<UserGame> AddGameToUser(Guid userId, AddUserGameRequest request)
    {
        var existingGame = await _gameService.getGameByExternalId(request.ExternalId);
        var isNewGame = existingGame == null;

        if (isNewGame)
            existingGame = await _gameService.GetAndPersistGameDetails(request.ExternalId);

        if (existingGame == null)
            throw new InvalidOperationException("Game not found.");

        var alreadyAdded = await _db.UserGames
            .AnyAsync(ug => ug.UserId == userId && ug.GameId == existingGame.Id);

        if (alreadyAdded)
            throw new InvalidOperationException("Game already added.");

        var userGame = new UserGame
        {
            UserId = userId,
            GameId = existingGame.Id,
            Game = existingGame
        };

        _db.UserGames.Add(userGame);
        await _db.SaveChangesAsync();

        if (isNewGame)
        {
            var gameId = existingGame.Id;
            _ = Task.Run(async () =>
            {
                using var scope = _scopeFactory.CreateScope();
                var generator = scope.ServiceProvider.GetRequiredService<IGameSchemaGenerationService>();
                await generator.GenerateForGameAsync(gameId);
            });
        }

        return userGame;
    }

    public async Task<List<UserGame>> GetUserGames(Guid userId)
    {
        return await _db.UserGames
            .Where(ug => ug.UserId == userId)
            .Include(ug => ug.Game)
            .ToListAsync();
    }

    public async Task<UserGame?> GetUserGameByGameId(Guid userId, Guid gameId)
    {
        return await _db.UserGames
            .Include(ug => ug.Game)
            .FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId);
    }

    public async Task<bool> DeleteUserGame(Guid id, Guid userId)
    {
        var userGame = await _db.UserGames
            .FirstOrDefaultAsync(ug => ug.Id == id && ug.UserId == userId);

        if (userGame == null)
            return false;

        _db.UserGames.Remove(userGame);
        await _db.SaveChangesAsync();
        return true;
    }
}
```

- [ ] **Step 3: Register new services in Program.cs**

In `apps/api/Program.cs`, add after the existing service registrations (before `#endregion`):

```csharp
builder.Services.AddHttpClient("anthropic");
builder.Services.AddScoped<IAnthropicService, AnthropicService>();
builder.Services.AddScoped<IGameFieldDefinitionService, GameFieldDefinitionService>();
builder.Services.AddScoped<IGameSchemaGenerationService, GameSchemaGenerationService>();
builder.Services.AddScoped<IGcsStorageService, GcsStorageService>();
```

Add the using for the interfaces namespace at the top of Program.cs:
```csharp
using PartyUp.Api.Services.Interfaces;
```

- [ ] **Step 4: Register fakes in ApiFactory**

Update `apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs`:

```csharp
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Clients;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Services;
using PartyUp.Api.Services.Interfaces;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Factories;

public class ApiFactory : WebApplicationFactory<Program>
{
    public const string TestConnectionString =
        "Host=localhost;Port=5432;Database=partyup_test;Username=partyup;Password=partyup";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Rawg:ApiKey"] = "ci-test-fake-rawg-key",
                ["Anthropic:ApiKey"] = "ci-test-fake-anthropic-key",
                ["GoogleCloudStorage:BucketName"] = "test-bucket"
            });
        });

        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(TestConnectionString));

            services.AddHttpClient<RawgClient>()
                .ConfigurePrimaryHttpMessageHandler(() => new FakeRawgHandler());

            services.AddHttpClient("anthropic")
                .ConfigurePrimaryHttpMessageHandler(() => new FakeAnthropicHandler());

            // Replace real GCS with a fake that returns a predictable URL
            var gcsDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IGcsStorageService));
            if (gcsDescriptor != null)
                services.Remove(gcsDescriptor);
            services.AddScoped<IGcsStorageService, FakeGcsService>();
        });
    }
}
```

- [ ] **Step 5: Create FakeGcsService**

Create `apps/tests/PartyUp.Api.Tests/Infrastructure/FakeGcsService.cs`:

```csharp
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Tests.Infrastructure;

public class FakeGcsService : IGcsStorageService
{
    public Task<string> UploadAsync(Stream stream, string contentType, string objectName)
        => Task.FromResult($"https://storage.googleapis.com/test-bucket/{objectName}");
}
```

- [ ] **Step 6: Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
dotnet build apps/tests/PartyUp.Api.Tests/PartyUp.Api.Tests.csproj
```

Expected: Both build with 0 errors.

- [ ] **Step 7: Run existing tests to confirm nothing is broken**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All existing tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/ apps/tests/
git commit -m "feat: wire AI schema generation into UserGameService, fix GetAndPersistGameDetails bug"
```

---

## Task 8: GET /api/games/{gameId}/field-definitions endpoint

**Files:**
- Modify: `apps/api/Controllers/GamesController.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Factories/GameFieldDefinitionFactory.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Features/GameFieldDefinitions/GameFieldDefinitionTests.cs`

- [ ] **Step 1: Write the failing test**

Create `apps/tests/PartyUp.Api.Tests/Factories/GameFieldDefinitionFactory.cs`:

```csharp
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Tests.Factories;

public static class GameFieldDefinitionFactory
{
    public static GameFieldDefinition Create(Guid gameId, string key = "server", int sortOrder = 1)
        => new()
        {
            Id = Guid.NewGuid(),
            GameId = gameId,
            Key = key,
            Label = char.ToUpper(key[0]) + key[1..],
            Type = FieldType.Select,
            Options = ["NA", "EU"],
            IsFilterable = true,
            IsRequired = true,
            SortOrder = sortOrder
        };
}
```

Create `apps/tests/PartyUp.Api.Tests/Features/GameFieldDefinitions/GameFieldDefinitionTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.GameFieldDefinitions;

public class GameFieldDefinitionTests : TestBase, IClassFixture<ApiFactory>
{
    public GameFieldDefinitionTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetFieldDefinitions_UnknownGame_Returns404()
    {
        var response = await Client.GetAsync($"/api/games/{Guid.NewGuid()}/field-definitions");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetFieldDefinitions_GameWithNoDefinitions_ReturnsPendingAndEmptyFields()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var game = GameFactory.Create();
        game.SchemaStatus = SchemaStatus.Pending;
        db.Games.Add(game);
        await db.SaveChangesAsync();

        var response = await Client.GetAsync($"/api/games/{game.Id}/field-definitions");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<FieldDefinitionsDto>();
        result!.SchemaStatus.Should().Be("Pending");
        result.Fields.Should().BeEmpty();
    }

    [Fact]
    public async Task GetFieldDefinitions_GeneratedGame_ReturnsFieldsInSortOrder()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var game = GameFactory.Create();
        game.SchemaStatus = SchemaStatus.Generated;
        db.Games.Add(game);
        db.GameFieldDefinitions.Add(GameFieldDefinitionFactory.Create(game.Id, "server", sortOrder: 1));
        db.GameFieldDefinitions.Add(GameFieldDefinitionFactory.Create(game.Id, "alliance", sortOrder: 2));
        await db.SaveChangesAsync();

        var response = await Client.GetAsync($"/api/games/{game.Id}/field-definitions");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<FieldDefinitionsDto>();
        result!.SchemaStatus.Should().Be("Generated");
        result.Fields.Should().HaveCount(2);
        result.Fields[0].Key.Should().Be("server");
        result.Fields[1].Key.Should().Be("alliance");
    }

    private record FieldDefinitionsDto(string SchemaStatus, List<FieldDto> Fields);
    private record FieldDto(string Key, string Label, string Type, List<string> Options, bool IsFilterable, bool IsRequired, int SortOrder);
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "GameFieldDefinitionTests"
```

Expected: FAIL — endpoint does not exist (404 or 405).

- [ ] **Step 3: Add the endpoint to GamesController**

Open `apps/api/Controllers/GamesController.cs` and add the field-definitions action. The controller already has `AppDbContext` or services injected — add `IGameFieldDefinitionService` if not present, or query the DB directly. Add the action:

```csharp
[HttpGet("{gameId:guid}/field-definitions")]
public async Task<IActionResult> GetFieldDefinitions(Guid gameId)
{
    var game = await _db.Games
        .Include(g => g.FieldDefinitions.OrderBy(f => f.SortOrder))
        .FirstOrDefaultAsync(g => g.Id == gameId);

    if (game == null)
        return NotFound();

    var fields = game.SchemaStatus == SchemaStatus.Generated
        ? game.FieldDefinitions.Select(d => new GameFieldDefinitionDto
        {
            Key = d.Key,
            Label = d.Label,
            Type = d.Type.ToString(),
            Options = d.Options,
            IsFilterable = d.IsFilterable,
            IsRequired = d.IsRequired,
            SortOrder = d.SortOrder
        }).ToList()
        : new List<GameFieldDefinitionDto>();

    return Ok(new FieldDefinitionsResponse
    {
        SchemaStatus = game.SchemaStatus.ToString(),
        Fields = fields
    });
}
```

You will also need to inject `AppDbContext` into `GamesController` if it isn't already. Check the constructor and add it if missing:

```csharp
private readonly AppDbContext _db;
// add to constructor: AppDbContext db
// assign: _db = db;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "GameFieldDefinitionTests"
```

Expected: All 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/ apps/tests/
git commit -m "feat: add GET /api/games/{gameId}/field-definitions endpoint"
```

---

## Task 9: Update POST /api/characters to accept GameFields

**Files:**
- Create: `apps/api/Models/DTOs/Character/CharacterFieldValueRequest.cs`
- Create: `apps/api/Models/DTOs/Character/CharacterFieldValueDto.cs`
- Modify: `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs`
- Modify: `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs`
- Modify: `apps/api/Services/CharacterService.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`

- [ ] **Step 1: Create DTOs**

Create `apps/api/Models/DTOs/Character/CharacterFieldValueRequest.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterFieldValueRequest
{
    public string Key { get; set; } = default!;
    public string Value { get; set; } = default!;
}
```

Create `apps/api/Models/DTOs/Character/CharacterFieldValueDto.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Character;

public class CharacterFieldValueDto
{
    public string Key { get; set; } = default!;
    public string Label { get; set; } = default!;
    public string Value { get; set; } = default!;
}
```

- [ ] **Step 2: Add GameFields to CreateCharacterRequest**

Update `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs` — add the property at the end:

```csharp
    public List<CharacterFieldValueRequest> GameFields { get; set; } = [];
```

- [ ] **Step 3: Add GameFields to DiscoverCharacterResponse**

Update `apps/api/Models/DTOs/Character/DiscoverCharacterResponse.cs` — add at the end:

```csharp
    public List<CharacterFieldValueDto> GameFields { get; set; } = [];
```

- [ ] **Step 4: Write the failing test**

Add to `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterTests.cs`:

```csharp
    [Fact]
    public async Task CreateCharacter_WithValidGameFields_SavesFieldValues()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var client = await CreateAuthenticatedClientAsync();

        // Manually create a game with Generated schema + field definition
        var game = GameFactory.Create();
        game.SchemaStatus = PartyUp.Api.Models.Enums.SchemaStatus.Generated;
        db.Games.Add(game);
        var fieldDef = GameFieldDefinitionFactory.Create(game.Id, "server");
        db.GameFieldDefinitions.Add(fieldDef);
        await db.SaveChangesAsync();

        // Create a UserGame for this game
        var userGame = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = game.ExternalId,
            name = game.Name,
            imageUrl = (string?)null
        });
        var ugDto = await userGame.Content.ReadFromJsonAsync<UserGameDto>();

        // Create a character with game-specific field values
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Test Hero",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId = ugDto!.Id,
            gameFields = new[] { new { key = "server", value = "NA" } }
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var saved = await db.CharacterFieldValues
            .Include(cfv => cfv.FieldDefinition)
            .Where(cfv => cfv.FieldDefinition.GameId == game.Id && cfv.Value == "NA")
            .FirstOrDefaultAsync();
        saved.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateCharacter_WithInvalidFieldValue_Returns400()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var client = await CreateAuthenticatedClientAsync();

        var game = GameFactory.Create();
        game.SchemaStatus = PartyUp.Api.Models.Enums.SchemaStatus.Generated;
        db.Games.Add(game);
        db.GameFieldDefinitions.Add(GameFieldDefinitionFactory.Create(game.Id, "server"));
        await db.SaveChangesAsync();

        var userGame = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = game.ExternalId,
            name = game.Name,
            imageUrl = (string?)null
        });
        var ugDto = await userGame.Content.ReadFromJsonAsync<UserGameDto>();

        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Bad Character",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId = ugDto!.Id,
            gameFields = new[] { new { key = "server", value = "INVALID_VALUE" } }
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
```

You will also need to add `using Microsoft.EntityFrameworkCore;` and `using PartyUp.Api.Infrastructure.Data;` to the test file if not already present, and update the `using` for `GameFieldDefinitionFactory`.

- [ ] **Step 5: Run test to verify it fails**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "CreateCharacter_WithValidGameFields"
```

Expected: FAIL.

- [ ] **Step 6: Update CharacterService.CreateCharacterAsync to save field values**

In `apps/api/Services/CharacterService.cs`, update `CreateCharacterAsync`:

```csharp
    public async Task<CharacterResponse?> CreateCharacterAsync(
        Guid userId,
        Guid userGameId,
        CreateCharacterRequest request)
    {
        var userGame = await _db.UserGames
            .Include(ug => ug.Game)
            .FirstOrDefaultAsync(x => x.Id == userGameId && x.UserId == userId);

        if (userGame == null)
            return null;

        // Validate game fields before persisting anything
        if (request.GameFields.Count > 0)
        {
            var definitions = await _db.GameFieldDefinitions
                .Where(d => d.GameId == userGame.GameId)
                .ToDictionaryAsync(d => d.Key);

            foreach (var field in request.GameFields)
            {
                if (!definitions.TryGetValue(field.Key, out var def))
                    continue;

                if (def.Type != Models.Enums.FieldType.Text && !def.Options.Contains(field.Value))
                    throw new ArgumentException($"Invalid value '{field.Value}' for field '{field.Key}'.");
            }
        }

        var character = new Character
        {
            Id = Guid.NewGuid(),
            UserGameId = userGameId,
            Platform = request.Platform,
            PlatformHandle = request.PlatformHandle,
            Name = request.Name,
            ImageUrl = request.ImageUrl,
            Bio = request.Bio,
            MainRole = request.MainRole,
            SecondaryRole = request.SecondaryRole,
            PreferredModes = request.PreferredModes,
            TimeZone = request.TimeZone,
            ActiveTimes = request.ActiveTimes,
            UsesVoiceChat = request.UsesVoiceChat,
            Languages = request.Languages,
            Playstyle = request.Playstyle,
            Rank = request.Rank,
            Region = request.Region,
        };

        _db.Characters.Add(character);

        if (request.GameFields.Count > 0)
        {
            var definitions = await _db.GameFieldDefinitions
                .Where(d => d.GameId == userGame.GameId)
                .ToDictionaryAsync(d => d.Key);

            foreach (var field in request.GameFields)
            {
                if (!definitions.TryGetValue(field.Key, out var def))
                    continue;

                _db.CharacterFieldValues.Add(new CharacterFieldValue
                {
                    CharacterId = character.Id,
                    FieldDefinitionId = def.Id,
                    Value = field.Value
                });
            }
        }

        await _db.SaveChangesAsync();
        return ToResponse(character);
    }
```

- [ ] **Step 7: Update CharactersController to return 400 on ArgumentException**

In `apps/api/Controllers/CharactersController.cs`, wrap the create call to catch validation errors:

```csharp
    [HttpPost]
    public async Task<IActionResult> CreateCharacter([FromBody] CreateCharacterRequest request)
    {
        var userId = GetUserId();
        try
        {
            var character = await _characterService.CreateCharacterAsync(userId, request.UserGameId, request);
            if (character == null)
                return NotFound();
            return CreatedAtAction(nameof(CreateCharacter), character);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "CreateCharacter_WithValidGameFields|CreateCharacter_WithInvalidFieldValue"
```

Expected: Both tests pass.

- [ ] **Step 9: Run all tests to confirm no regressions**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add apps/api/ apps/tests/
git commit -m "feat: update POST /api/characters to accept and validate GameFields"
```

---

## Task 10: Update GET /api/characters/discover with filters

**Files:**
- Modify: `apps/api/Services/CharacterService.cs`
- Modify: `apps/api/Services/Interfaces/ICharacterService.cs`
- Modify: `apps/api/Controllers/CharactersController.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterFieldFilterTests.cs`

- [ ] **Step 1: Write the failing test**

Create `apps/tests/PartyUp.Api.Tests/Features/Characters/CharacterFieldFilterTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Characters;

public class CharacterFieldFilterTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _externalIdCounter = 50_000;

    public CharacterFieldFilterTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Discover_WithFieldFilter_ReturnsOnlyMatchingCharacters()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Create a game with a field definition
        var game = GameFactory.Create();
        game.ExternalId = Interlocked.Increment(ref _externalIdCounter);
        game.SchemaStatus = SchemaStatus.Generated;
        db.Games.Add(game);

        var fieldDef = GameFieldDefinitionFactory.Create(game.Id, "server");
        db.GameFieldDefinitions.Add(fieldDef);
        await db.SaveChangesAsync();

        // User A (the searcher)
        var clientA = await CreateAuthenticatedClientAsync();

        // User B — NA server
        var clientB = await CreateAuthenticatedClientAsync();
        var ugB = await AddUserGameDirectAsync(db, clientB, game.Id);
        var charB = await CreateCharacterWithFieldAsync(db, clientB, ugB, fieldDef, "NA", "UserB_NA");

        // User C — EU server
        var clientC = await CreateAuthenticatedClientAsync();
        var ugC = await AddUserGameDirectAsync(db, clientC, game.Id);
        var charC = await CreateCharacterWithFieldAsync(db, clientC, ugC, fieldDef, "EU", "UserC_EU");

        // User A also adds the game (so discovery context works)
        var ugA = await AddUserGameDirectAsync(db, clientA, game.Id);
        var charA = new Character
        {
            Id = Guid.NewGuid(), UserGameId = ugA, Platform = "PC",
            PlatformHandle = "A", Name = "UserA"
        };
        db.Characters.Add(charA);
        await db.SaveChangesAsync();

        // Discover with server=NA filter — should only return User B
        var response = await clientA.GetAsync($"/api/characters/discover?gameId={game.Id}&server=NA");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var discovered = await response.Content.ReadFromJsonAsync<List<DiscoveredDto>>();
        discovered.Should().ContainSingle(c => c.Name == "UserB_NA");
        discovered.Should().NotContain(c => c.Name == "UserC_EU");
    }

    [Fact]
    public async Task Discover_WithNoFilter_ReturnsAllCharacters()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var game = GameFactory.Create();
        game.ExternalId = Interlocked.Increment(ref _externalIdCounter);
        game.SchemaStatus = SchemaStatus.Generated;
        db.Games.Add(game);
        var fieldDef = GameFieldDefinitionFactory.Create(game.Id, "server");
        db.GameFieldDefinitions.Add(fieldDef);
        await db.SaveChangesAsync();

        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var clientC = await CreateAuthenticatedClientAsync();

        var ugB = await AddUserGameDirectAsync(db, clientB, game.Id);
        await CreateCharacterWithFieldAsync(db, clientB, ugB, fieldDef, "NA", "UserB");

        var ugC = await AddUserGameDirectAsync(db, clientC, game.Id);
        await CreateCharacterWithFieldAsync(db, clientC, ugC, fieldDef, "EU", "UserC");

        var ugA = await AddUserGameDirectAsync(db, clientA, game.Id);
        db.Characters.Add(new Character { Id = Guid.NewGuid(), UserGameId = ugA, Platform = "PC", PlatformHandle = "A", Name = "UserA" });
        await db.SaveChangesAsync();

        var response = await clientA.GetAsync($"/api/characters/discover?gameId={game.Id}");
        var discovered = await response.Content.ReadFromJsonAsync<List<DiscoveredDto>>();
        discovered.Should().HaveCount(2);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static async Task<Guid> AddUserGameDirectAsync(AppDbContext db, HttpClient client, Guid gameId)
    {
        // Register the client's user, then directly insert a UserGame (bypasses RAWG)
        var ug = new UserGame { Id = Guid.NewGuid(), GameId = gameId };

        // We need the userId — extract from a call to /api/auth/me
        var meResponse = await client.GetAsync("/api/auth/me");
        var me = await meResponse.Content.ReadFromJsonAsync<MeDto>();
        ug.UserId = me!.Id;

        db.UserGames.Add(ug);
        await db.SaveChangesAsync();
        return ug.Id;
    }

    private static async Task<Guid> CreateCharacterWithFieldAsync(
        AppDbContext db, HttpClient client, Guid userGameId,
        GameFieldDefinition fieldDef, string value, string name)
    {
        var char_ = new Character
        {
            Id = Guid.NewGuid(), UserGameId = userGameId,
            Platform = "PC", PlatformHandle = name, Name = name
        };
        db.Characters.Add(char_);
        db.CharacterFieldValues.Add(new CharacterFieldValue
        {
            CharacterId = char_.Id, FieldDefinitionId = fieldDef.Id, Value = value
        });
        await db.SaveChangesAsync();
        return char_.Id;
    }

    private record DiscoveredDto(Guid Id, string Name);
    private record MeDto(Guid Id, string Username);
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "CharacterFieldFilterTests"
```

Expected: FAIL — filters are ignored, both characters returned when filter applied.

- [ ] **Step 3: Update ICharacterService to accept filters**

In `apps/api/Services/Interfaces/ICharacterService.cs`, update the signature:

```csharp
Task<List<DiscoverCharacterResponse>> DiscoverCharactersAsync(
    Guid userId, Guid gameId, Dictionary<string, string> filters);
```

- [ ] **Step 4: Update CharacterService.DiscoverCharactersAsync**

Replace the `DiscoverCharactersAsync` method in `apps/api/Services/CharacterService.cs`:

```csharp
    public async Task<List<DiscoverCharacterResponse>> DiscoverCharactersAsync(
        Guid userId, Guid gameId, Dictionary<string, string> filters)
    {
        var myUserGame = await _db.UserGames
            .FirstOrDefaultAsync(ug => ug.UserId == userId && ug.GameId == gameId);

        if (myUserGame == null)
            return [];

        var myCharacterIds = await _db.Characters
            .Where(c => c.UserGameId == myUserGame.Id)
            .Select(c => c.Id)
            .ToListAsync();

        if (myCharacterIds.Count == 0)
            return [];

        var alreadySeenIds = await _db.CharacterInteractions
            .Where(i => myCharacterIds.Contains(i.FromCharacterId))
            .Select(i => i.ToCharacterId)
            .ToListAsync();

        var query = _db.Characters
            .Include(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(c => c.FieldValues).ThenInclude(fv => fv.FieldDefinition)
            .Where(c =>
                c.UserGame.GameId == gameId &&
                c.UserGame.UserId != userId &&
                !alreadySeenIds.Contains(c.Id));

        if (filters.Count > 0)
        {
            var validFilterKeys = await _db.GameFieldDefinitions
                .Where(d => d.GameId == gameId && d.IsFilterable &&
                            d.Type == Models.Enums.FieldType.Select)
                .Select(d => d.Key)
                .ToListAsync();

            foreach (var (key, value) in filters.Where(f => validFilterKeys.Contains(f.Key)))
            {
                query = query.Where(c =>
                    c.FieldValues.Any(fv =>
                        fv.FieldDefinition.Key == key && fv.Value == value));
            }
        }

        return await query.Select(c => new DiscoverCharacterResponse
        {
            Id = c.Id,
            Name = c.Name,
            Platform = c.Platform,
            ImageUrl = c.ImageUrl,
            Bio = c.Bio,
            MainRole = c.MainRole,
            SecondaryRole = c.SecondaryRole,
            PreferredModes = c.PreferredModes,
            UsesVoiceChat = c.UsesVoiceChat,
            Languages = c.Languages,
            Playstyle = c.Playstyle,
            Rank = c.Rank,
            Region = c.Region,
            GameName = c.UserGame.Game.Name,
            GameImageUrl = c.UserGame.Game.ImageUrl,
            GameFields = c.FieldValues.Select(fv => new CharacterFieldValueDto
            {
                Key = fv.FieldDefinition.Key,
                Label = fv.FieldDefinition.Label,
                Value = fv.Value
            }).ToList()
        }).ToListAsync();
    }
```

- [ ] **Step 5: Update CharactersController.DiscoverCharacters to extract filters from query**

Update the discover action in `apps/api/Controllers/CharactersController.cs`:

```csharp
    [HttpGet("discover")]
    public async Task<IActionResult> DiscoverCharacters([FromQuery] Guid gameId)
    {
        var userId = GetUserId();
        var reservedKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "gameId" };
        var filters = Request.Query
            .Where(q => !reservedKeys.Contains(q.Key))
            .ToDictionary(q => q.Key, q => q.Value.ToString());

        var characters = await _characterService.DiscoverCharactersAsync(userId, gameId, filters);
        return Ok(characters);
    }
```

- [ ] **Step 6: Run filter tests to verify they pass**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "CharacterFieldFilterTests"
```

Expected: Both tests pass.

- [ ] **Step 7: Run all tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/api/ apps/tests/
git commit -m "feat: add field-based filtering to discover endpoint"
```

---

## Task 11: GcsStorageService and POST /api/characters/image

**Files:**
- Create: `apps/api/Services/Interfaces/IGcsStorageService.cs`
- Create: `apps/api/Services/GcsStorageService.cs`
- Modify: `apps/api/Controllers/CharactersController.cs`
- Modify: `apps/api/Models/DTOs/Character/UploadImageResponse.cs` (new)

- [ ] **Step 1: Create IGcsStorageService**

Create `apps/api/Services/Interfaces/IGcsStorageService.cs`:

```csharp
namespace PartyUp.Api.Services.Interfaces;

public interface IGcsStorageService
{
    Task<string> UploadAsync(Stream stream, string contentType, string objectName);
}
```

- [ ] **Step 2: Create GcsStorageService**

Create `apps/api/Services/GcsStorageService.cs`:

```csharp
using Google.Cloud.Storage.V1;
using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Services;

public class GcsStorageService : IGcsStorageService
{
    private readonly StorageClient _storageClient;
    private readonly string _bucketName;

    public GcsStorageService(IConfiguration config)
    {
        _storageClient = StorageClient.Create();
        _bucketName = config["GoogleCloudStorage:BucketName"]
            ?? throw new InvalidOperationException("GoogleCloudStorage:BucketName is not configured.");
    }

    public async Task<string> UploadAsync(Stream stream, string contentType, string objectName)
    {
        await _storageClient.UploadObjectAsync(_bucketName, objectName, contentType, stream);
        return $"https://storage.googleapis.com/{_bucketName}/{objectName}";
    }
}
```

- [ ] **Step 3: Create the response DTO**

Create `apps/api/Models/DTOs/Character/UploadImageResponse.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Character;

public record UploadImageResponse(string Url);
```

- [ ] **Step 4: Add the image upload endpoint to CharactersController**

In `apps/api/Controllers/CharactersController.cs`, inject `IGcsStorageService` and add the action:

```csharp
    [HttpPost("image")]
    [Authorize]
    public async Task<ActionResult<UploadImageResponse>> UploadImage(IFormFile file)
    {
        const long maxBytes = 5 * 1024 * 1024;
        if (file.Length > maxBytes)
            return BadRequest("File must be under 5MB.");

        var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowed.Contains(file.ContentType))
            return BadRequest("Only jpg, png, and webp images are supported.");

        var ext = Path.GetExtension(file.FileName).TrimStart('.');
        var objectName = $"characters/{Guid.NewGuid()}/{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.{ext}";

        using var stream = file.OpenReadStream();
        var url = await _gcsStorage.UploadAsync(stream, file.ContentType, objectName);

        return Ok(new UploadImageResponse(url));
    }
```

- [ ] **Step 5: Verify build**

```bash
dotnet build apps/api/PartyUp.Api.csproj
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 6: Run all tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests
```

Expected: All tests pass (GCS calls go through FakeGcsService in tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/ apps/tests/
git commit -m "feat: add GCS storage service and POST /api/characters/image"
```

---

## Task 12: Frontend API client updates

**Files:**
- Create: `apps/web/src/api/endpoints/fieldDefinitions.ts`
- Modify: `apps/web/src/api/endpoints/characters.ts`
- Modify: `apps/web/src/components/character-wizard/types.ts`

- [ ] **Step 1: Create field definitions API client**

Create `apps/web/src/api/endpoints/fieldDefinitions.ts`:

```typescript
import { client } from '../client';

export type FieldType = 'Select' | 'MultiSelect' | 'Text';
export type SchemaStatus = 'Pending' | 'Generating' | 'Generated' | 'Failed';

export interface GameFieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  options: string[];
  isFilterable: boolean;
  isRequired: boolean;
  sortOrder: number;
}

export interface FieldDefinitionsResponse {
  schemaStatus: SchemaStatus;
  fields: GameFieldDefinition[];
}

export async function getFieldDefinitions(gameId: string): Promise<FieldDefinitionsResponse> {
  return client.get<FieldDefinitionsResponse>(`/games/${gameId}/field-definitions`);
}
```

- [ ] **Step 2: Add image upload and gameFields to characters API client**

Open `apps/web/src/api/endpoints/characters.ts` and add:

```typescript
// Add this import at the top if API_BASE isn't already imported
// (check the existing client.ts for the base URL pattern)

export interface CharacterFieldValueRequest {
  key: string;
  value: string;
}

export interface CharacterFieldValueDto {
  key: string;
  label: string;
  value: string;
}

// Add gameFields to the CreateCharacterRequest type if one exists,
// or ensure the POST body includes gameFields when calling the API.
// In the existing createCharacter function, add gameFields to the payload.

export async function uploadCharacterImage(file: File, token: string): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${import.meta.env.VITE_API_BASE ?? 'http://localhost:5288/api'}/characters/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) throw new Error('Image upload failed');
  return response.json();
}
```

Check `apps/web/src/api/client.ts` to confirm the correct `API_BASE` variable name and use it consistently.

- [ ] **Step 3: Add gameFields to CharacterFormData**

Open `apps/web/src/components/character-wizard/types.ts` and add `gameFields` to the form data type:

```typescript
// Find the CharacterFormData type/interface and add:
gameFields: Record<string, string>;
```

Update the default/initial form data value wherever it's initialized to include `gameFields: {}`.

- [ ] **Step 4: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/ apps/web/src/components/character-wizard/types.ts
git commit -m "feat: add field definitions API client and gameFields to form types"
```

---

## Task 13: DynamicGameplayStep component

**Files:**
- Create: `apps/web/src/components/character-wizard/DynamicGameplayStep.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/character-wizard/DynamicGameplayStep.tsx`:

```tsx
import type { GameFieldDefinition } from '../../api/endpoints/fieldDefinitions';

interface Props {
  fields: GameFieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function DynamicGameplayStep({ fields, values, onChange }: Props) {
  return (
    <div className="space-y-5">
      {fields.map(field => (
        <div key={field.key}>
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>

          {field.type === 'Select' && (
            <select
              value={values[field.key] ?? ''}
              onChange={e => onChange(field.key, e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select {field.label}…</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}

          {field.type === 'MultiSelect' && (
            <div className="flex flex-wrap gap-2">
              {field.options.map(opt => {
                const selected = (values[field.key] ?? '')
                  .split('|')
                  .filter(Boolean)
                  .includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const current = (values[field.key] ?? '').split('|').filter(Boolean);
                      const next = selected
                        ? current.filter(v => v !== opt)
                        : [...current, opt];
                      onChange(field.key, next.join('|'));
                    }}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      selected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {field.type === 'Text' && (
            <input
              type="text"
              value={values[field.key] ?? ''}
              onChange={e => onChange(field.key, e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder={field.label}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/character-wizard/DynamicGameplayStep.tsx
git commit -m "feat: add DynamicGameplayStep component"
```

---

## Task 14: Update CreateCharacterWizard to use dynamic schema

**Files:**
- Create: `apps/web/src/hooks/useFieldDefinitions.ts`
- Modify: `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx`

- [ ] **Step 1: Create useFieldDefinitions hook**

Create `apps/web/src/hooks/useFieldDefinitions.ts`:

```typescript
import { useState, useEffect } from 'react';
import { getFieldDefinitions, type FieldDefinitionsResponse } from '../api/endpoints/fieldDefinitions';

const MAX_POLLS = 10;
const POLL_MS = 3000;

export function useFieldDefinitions(gameId: string) {
  const [data, setData] = useState<FieldDefinitionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function fetchOnce() {
      const result = await getFieldDefinitions(gameId);
      if (cancelled) return;
      setData(result);

      if (result.schemaStatus === 'Pending' || result.schemaStatus === 'Generating') {
        attempts++;
        if (attempts < MAX_POLLS) {
          timer = setTimeout(fetchOnce, POLL_MS);
          return;
        }
        // Treat as failed after max polls
        setData({ schemaStatus: 'Failed', fields: [] });
      }
      setIsLoading(false);
    }

    fetchOnce().catch(() => {
      if (!cancelled) {
        setData({ schemaStatus: 'Failed', fields: [] });
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [gameId]);

  return { data, isLoading };
}
```

- [ ] **Step 2: Update CreateCharacterWizard**

Open `apps/web/src/components/character-wizard/CreateCharacterWizard.tsx`.

At the top, add the imports:
```tsx
import { useFieldDefinitions } from '../../hooks/useFieldDefinitions';
import { DynamicGameplayStep } from './DynamicGameplayStep';
```

Inside the component, before the return, add:
```tsx
const { data: schema, isLoading: schemaLoading } = useFieldDefinitions(gameId);
// gameId must be passed as a prop — check what prop brings the game context and use it
```

Find where the wizard's `gameFields` state is set (or add it if not yet present):
```tsx
const [gameFields, setGameFields] = useState<Record<string, string>>({});
const handleGameFieldChange = (key: string, value: string) =>
  setGameFields(prev => ({ ...prev, [key]: value }));
```

In the step that previously showed `GameplayStep` (step 2), replace with:
```tsx
{schemaLoading && (
  <p className="text-sm text-gray-500 py-8 text-center">
    Setting up character fields for this game…
  </p>
)}
{!schemaLoading && schema?.schemaStatus === 'Generated' && (
  <DynamicGameplayStep
    fields={schema.fields}
    values={gameFields}
    onChange={handleGameFieldChange}
  />
)}
{!schemaLoading && schema?.schemaStatus !== 'Generated' && (
  <GameplayStep {/* existing generic step props */} />
)}
```

When the wizard submits, include `gameFields` in the create character request payload:
```tsx
gameFields: Object.entries(gameFields).map(([key, value]) => ({ key, value })),
```

- [ ] **Step 3: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no type errors.

- [ ] **Step 4: Start dev server and manually test the flow**

```bash
npm run dev
```

Add a new game. Observe the loading state during schema generation (will be fast in dev since `FakeAnthropicHandler` is not used in the running app — ensure a real API key is set in `appsettings.Development.json`). Once Generated, verify the dynamic form renders with the game-specific fields.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/ apps/web/src/components/character-wizard/
git commit -m "feat: update CreateCharacterWizard to render dynamic game-specific fields"
```

---

## Task 15: IdentityStep image file picker

**Files:**
- Modify: `apps/web/src/components/character-wizard/IdentityStep.tsx`

- [ ] **Step 1: Replace ImageUrl text input with file picker**

Open `apps/web/src/components/character-wizard/IdentityStep.tsx`.

Find the `ImageUrl` text input field and replace it with:

```tsx
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be under 5MB');
    return;
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    alert('Only jpg, png, and webp images are supported');
    return;
  }

  try {
    const token = localStorage.getItem('token') ?? ''; // adjust to match your auth token storage
    const { url } = await uploadCharacterImage(file, token);
    onChange('imageUrl', url); // adjust field name to match your form state
  } catch {
    alert('Image upload failed. Please try again.');
  }
};

// Replace the ImageUrl text input with:
<div>
  <label className="block text-sm font-medium mb-1">Character Image</label>
  <input
    type="file"
    accept="image/jpeg,image/png,image/webp"
    onChange={handleFileChange}
    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
  />
  {formData.imageUrl && (
    <img src={formData.imageUrl} alt="Preview" className="mt-2 h-24 w-24 rounded-full object-cover" />
  )}
</div>
```

Import `uploadCharacterImage` at the top of the file:
```tsx
import { uploadCharacterImage } from '../../api/endpoints/characters';
```

- [ ] **Step 2: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 3: Manually test image upload in browser**

Start dev server, navigate to character creation, upload an image. Verify the preview appears and the URL is stored in form state.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/character-wizard/IdentityStep.tsx
git commit -m "feat: replace ImageUrl text input with GCS-backed file picker"
```

---

## Task 16: DiscoveryFilters component and DiscoveryPanel integration

**Files:**
- Create: `apps/web/src/components/DiscoveryFilters.tsx`
- Modify: `apps/web/src/components/DiscoveryPanel.tsx`

- [ ] **Step 1: Create DiscoveryFilters component**

Create `apps/web/src/components/DiscoveryFilters.tsx`:

```tsx
import type { GameFieldDefinition } from '../api/endpoints/fieldDefinitions';

interface Props {
  fields: GameFieldDefinition[];
  filters: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function DiscoveryFilters({ fields, filters, onChange }: Props) {
  const filterableFields = fields.filter(f => f.isFilterable && f.type === 'Select');

  if (filterableFields.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg mb-4 border border-gray-200">
      {filterableFields.map(field => (
        <select
          key={field.key}
          value={filters[field.key] ?? ''}
          onChange={e => onChange(field.key, e.target.value)}
          className="text-sm rounded-md border border-gray-300 px-2 py-1"
        >
          <option value="">All {field.label}s</option>
          {field.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Integrate DiscoveryFilters into DiscoveryPanel**

Open `apps/web/src/components/DiscoveryPanel.tsx`.

Add imports:
```tsx
import { DiscoveryFilters } from './DiscoveryFilters';
import { useFieldDefinitions } from '../hooks/useFieldDefinitions';
```

Inside the component, add filter state and schema fetching:
```tsx
const [filters, setFilters] = useState<Record<string, string>>({});
const { data: schema } = useFieldDefinitions(gameId); // gameId is already a prop
const handleFilterChange = (key: string, value: string) =>
  setFilters(prev => ({ ...prev, [key]: value }));
```

Update the discover API call to pass filters as query params:
```tsx
// When fetching characters, build the query string:
const params = new URLSearchParams({ gameId });
Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
// Then fetch: /api/characters/discover?{params}
```

Re-fetch the discovery queue when `filters` changes — add `filters` to the dependency array of whatever `useEffect` fetches characters.

Render the filter bar above the card stack:
```tsx
{schema?.schemaStatus === 'Generated' && (
  <DiscoveryFilters
    fields={schema.fields}
    filters={filters}
    onChange={handleFilterChange}
  />
)}
```

- [ ] **Step 3: Verify TypeScript build**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 4: Manually test filtering in browser**

Start dev server. In the discovery view for a game with Generated schema, change a filter dropdown. Verify the card stack re-fetches with only matching characters.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/
git commit -m "feat: add discovery filter bar with game-specific field filters"
```

---

## Task 17: Scale seeder

**Files:**
- Create: `apps/tools/PartyUp.SeedRunner/HardcodedSchemas.cs`
- Create: `apps/tools/PartyUp.SeedRunner/ScaleSeeder.cs`
- Modify: `apps/tools/PartyUp.SeedRunner/Program.cs`

- [ ] **Step 1: Create hardcoded schemas**

Create `apps/tools/PartyUp.SeedRunner/HardcodedSchemas.cs`:

```csharp
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;

namespace PartyUp.SeedRunner;

public static class HardcodedSchemas
{
    public static List<GameFieldDefinition> ForEso(Guid gameId) =>
    [
        new() { GameId = gameId, Key = "server", Label = "Server", Type = FieldType.Select, Options = ["NA", "EU"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { GameId = gameId, Key = "alliance", Label = "Alliance", Type = FieldType.Select, Options = ["Ebonheart Pact", "Aldmeri Dominion", "Daggerfall Covenant"], IsFilterable = true, IsRequired = true, SortOrder = 2 },
        new() { GameId = gameId, Key = "role", Label = "Role", Type = FieldType.Select, Options = ["Tank", "Healer", "DPS", "Flex"], IsFilterable = true, IsRequired = false, SortOrder = 3 },
        new() { GameId = gameId, Key = "cp_level", Label = "Champion Points", Type = FieldType.Select, Options = ["0-160", "160-300", "300-600", "600-1000", "1000+"], IsFilterable = false, IsRequired = false, SortOrder = 4 },
    ];

    public static List<GameFieldDefinition> ForFfxiv(Guid gameId) =>
    [
        new() { GameId = gameId, Key = "data_center", Label = "Data Center", Type = FieldType.Select, Options = ["Crystal", "Aether", "Primal", "Chaos", "Light", "Elemental", "Gaia", "Mana"], IsFilterable = true, IsRequired = true, SortOrder = 1 },
        new() { GameId = gameId, Key = "role", Label = "Role", Type = FieldType.Select, Options = ["Tank", "Healer", "DPS"], IsFilterable = true, IsRequired = false, SortOrder = 2 },
        new() { GameId = gameId, Key = "content_focus", Label = "Content Focus", Type = FieldType.Select, Options = ["Savage Raiding", "Ultimate", "Casual", "Crafting/Gathering", "Roleplay", "Exploration"], IsFilterable = true, IsRequired = false, SortOrder = 3 },
    ];

    public static List<GameFieldDefinition>? TryGetForGame(string gameName, Guid gameId)
    {
        if (gameName.Contains("Elder Scrolls Online", StringComparison.OrdinalIgnoreCase))
            return ForEso(gameId);
        if (gameName.Contains("Final Fantasy XIV", StringComparison.OrdinalIgnoreCase) ||
            gameName.Contains("FFXIV", StringComparison.OrdinalIgnoreCase))
            return ForFfxiv(gameId);
        return null;
    }
}
```

- [ ] **Step 2: Create ScaleSeeder**

Create `apps/tools/PartyUp.SeedRunner/ScaleSeeder.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.Enums;

namespace PartyUp.SeedRunner;

public class ScaleSeeder
{
    private readonly AppDbContext _db;
    private readonly Random _rng = new();

    public ScaleSeeder(AppDbContext db)
    {
        _db = db;
    }

    public async Task SeedAsync(string gameName, int userCount)
    {
        var game = await _db.Games
            .Include(g => g.FieldDefinitions)
            .FirstOrDefaultAsync(g => g.Name == gameName);

        if (game == null)
        {
            Console.WriteLine($"Game '{gameName}' not found in DB. Creating with hardcoded schema.");
            game = new Game
            {
                Id = Guid.NewGuid(),
                ExternalId = _rng.Next(900_000, 999_999),
                Name = gameName,
                SchemaStatus = SchemaStatus.Generated
            };
            _db.Games.Add(game);
            await _db.SaveChangesAsync();

            var schema = HardcodedSchemas.TryGetForGame(gameName, game.Id);
            if (schema == null)
            {
                Console.WriteLine($"No hardcoded schema for '{gameName}'. SchemaStatus set to Failed.");
                game.SchemaStatus = SchemaStatus.Failed;
            }
            else
            {
                _db.GameFieldDefinitions.AddRange(schema);
                game.FieldDefinitions = schema;
            }
            await _db.SaveChangesAsync();
        }

        if (game.SchemaStatus != SchemaStatus.Generated || game.FieldDefinitions.Count == 0)
        {
            Console.WriteLine($"Game '{gameName}' has no field definitions. Ensure SchemaStatus=Generated.");
            return;
        }

        Console.WriteLine($"Seeding {userCount} users for '{gameName}'...");
        var characters = new List<Character>();

        for (var i = 1; i <= userCount; i++)
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = $"testuser{i}_{Guid.NewGuid():N[..6]}",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!")
            };
            _db.Users.Add(user);

            var userGame = new UserGame { Id = Guid.NewGuid(), UserId = user.Id, GameId = game.Id };
            _db.UserGames.Add(userGame);

            var character = new Character
            {
                Id = Guid.NewGuid(),
                UserGameId = userGame.Id,
                Platform = "PC",
                PlatformHandle = $"player_{i}",
                Name = $"Character_{i}"
            };
            _db.Characters.Add(character);

            foreach (var fieldDef in game.FieldDefinitions.Where(f => f.Options.Count > 0))
            {
                _db.CharacterFieldValues.Add(new CharacterFieldValue
                {
                    CharacterId = character.Id,
                    FieldDefinitionId = fieldDef.Id,
                    Value = fieldDef.Options[_rng.Next(fieldDef.Options.Count)]
                });
            }

            characters.Add(character);

            if (i % 20 == 0)
            {
                await _db.SaveChangesAsync();
                Console.WriteLine($"  Created {i}/{userCount} users...");
            }
        }

        await _db.SaveChangesAsync();
        Console.WriteLine("Seeding interactions...");
        await SeedInteractionsAsync(characters);
        Console.WriteLine($"Done. {userCount} users seeded for '{gameName}'.");
    }

    private async Task SeedInteractionsAsync(List<Character> characters)
    {
        var interactions = new List<CharacterInteraction>();
        var matches = new List<CharacterMatch>();
        var liked = new HashSet<(Guid, Guid)>();

        foreach (var from in characters)
        {
            // Each character swipes on ~60% of others
            var targets = characters
                .Where(c => c.Id != from.Id)
                .OrderBy(_ => _rng.Next())
                .Take((int)(characters.Count * 0.6))
                .ToList();

            foreach (var to in targets)
            {
                var type = _rng.NextDouble() < 0.5
                    ? InteractionType.Like
                    : InteractionType.Dislike;

                interactions.Add(new CharacterInteraction
                {
                    Id = Guid.NewGuid(),
                    FromCharacterId = from.Id,
                    ToCharacterId = to.Id,
                    Type = type,
                    CreatedAt = DateTime.UtcNow
                });

                if (type == InteractionType.Like)
                {
                    // Check if the target already liked this character (mutual match)
                    if (liked.Contains((to.Id, from.Id)))
                    {
                        var (a, b) = from.Id.CompareTo(to.Id) < 0
                            ? (from.Id, to.Id)
                            : (to.Id, from.Id);

                        matches.Add(new CharacterMatch
                        {
                            Id = Guid.NewGuid(),
                            CharacterAId = a,
                            CharacterBId = b,
                            MatchedAt = DateTime.UtcNow
                        });
                    }
                    liked.Add((from.Id, to.Id));
                }
            }
        }

        _db.CharacterInteractions.AddRange(interactions);
        _db.CharacterMatches.AddRange(matches);
        await _db.SaveChangesAsync();
        Console.WriteLine($"  Created {interactions.Count} interactions and {matches.Count} matches.");
    }
}
```

- [ ] **Step 3: Update SeedRunner Program.cs to handle Scale mode**

Open `apps/tools/PartyUp.SeedRunner/Program.cs` and add the Scale branch. The existing program parses the first arg as "A" or "B". Add handling for "Scale":

```csharp
// At the top of the arg parsing logic, before the existing switch/if:
if (args.Length > 0 && args[0] == "Scale")
{
    var gameName = args.SkipWhile(a => a != "--game").Skip(1).FirstOrDefault()
        ?? throw new ArgumentException("--game <name> is required for Scale mode");
    var userCount = int.Parse(args.SkipWhile(a => a != "--users").Skip(1).FirstOrDefault() ?? "50");

    var seeder = new ScaleSeeder(db); // db is the AppDbContext configured by the existing setup
    await seeder.SeedAsync(gameName, userCount);
    return;
}
```

- [ ] **Step 4: Verify build**

```bash
dotnet build apps/tools/PartyUp.SeedRunner
```

Expected: Build succeeded, 0 errors.

- [ ] **Step 5: Test the scale seeder against the dev database**

Make sure Docker DB is running, then:

```bash
dotnet run --project apps/tools/PartyUp.SeedRunner -- Scale --game "Elder Scrolls Online" --users 20
```

Expected output:
```
Game 'Elder Scrolls Online' not found in DB. Creating with hardcoded schema.
Seeding 20 users for 'Elder Scrolls Online'...
  Created 20/20 users...
  Created N interactions and M matches.
Done. 20 users seeded for 'Elder Scrolls Online'.
```

- [ ] **Step 6: Commit**

```bash
git add apps/tools/
git commit -m "feat: add scale seeder with hardcoded ESO and FFXIV schemas"
```

---

## Self-Review Checklist (already applied)

- **Spec coverage:** All five spec sections covered — data model (Tasks 2–3), AI generation (Tasks 4–7), API (Tasks 8–11), frontend (Tasks 12–16), seeding (Task 17). ✓
- **Anthropic console setup:** Documented in Task 1 config steps and in the spec. ✓
- **Bug fix:** `GetAndPersistGameDetails` missing `_db.Games.Add(game)` fixed in Task 7. ✓
- **Pipe separator for MultiSelect:** Used in `DynamicGameplayStep` and consistent with spec. ✓
- **Polling timeout:** 10 attempts × 3s = 30s cap, then falls back to Failed. Implemented in `useFieldDefinitions`. ✓
- **Image upload path:** Uses server-generated UUID, not characterId. Consistent across Task 11 and Task 15. ✓
- **Filters only on Select fields:** `DiscoverCharactersAsync` explicitly restricts to `FieldType.Select` when applying filter clauses. ✓
- **Type consistency:** `GameFieldDefinitionDto` used in both `AnthropicService` return type and `GameFieldDefinitionsController`. `CharacterFieldValueDto` used in both `DiscoverCharacterResponse` and service. ✓
