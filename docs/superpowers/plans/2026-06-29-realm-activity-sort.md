# Realm Activity Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Order `GET /api/user-games` results by most recent activity (swipe, match, or sticker message) so the home page and Realms binder always surface the realm the user last touched.

**Architecture:** Replace the `OrderBy(CreatedAt)` in `UserGameService.GetUserGames` with a two-stage approach: fetch all realms with three correlated activity subqueries, then sort in-memory by the max of those timestamps and `CreatedAt`. No schema change, no migration, no frontend change.

**Tech Stack:** ASP.NET Core 8, EF Core 8, PostgreSQL, xUnit + FluentAssertions (integration tests, real DB)

## Global Constraints

- Do not add a DB migration — this is a query-only change
- Do not modify `IUserGameService`, `UserGamesController`, or `UserGameResponse` — the interface and DTO are unchanged
- Do not add new files — edit the two existing files listed below
- All tests are integration tests hitting a real DB via `WebApplicationFactory<Program>` — no mocking

---

### Task 1: Sort realms by last activity

**Files:**
- Modify: `apps/api/Services/UserGameService.cs` — replace `GetUserGames` query
- Modify: `apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs` — add 3 ordering tests + private helpers

**Interfaces:**
- Produces: `GetUserGames(userId, page, pageSize)` — same signature, same return type `PagedResult<UserGameResponse>`, results now ordered by `LastActivityAt` descending

---

- [ ] **Step 1: Write the three failing tests**

Add to the bottom of the `UserGameTests` class (before the closing `}`), above the existing private record declarations.

Add these private helpers immediately after the `GetUserGames_Page2_ReturnsRemainder` test and before the record declarations:

```csharp
[Fact]
public async Task GetUserGames_RealmWithRecentInteraction_SortsFirst()
{
    var client = await CreateAuthenticatedClientAsync();
    var otherClient = await CreateAuthenticatedClientAsync();

    // Realm A created first (older CreatedAt)
    var idA = Interlocked.Increment(ref _gameCounter);
    var ugA = await AddRealmAsync(client, idA);

    // Realm B created second (newer CreatedAt — would normally sort first)
    var idB = Interlocked.Increment(ref _gameCounter);
    _ = await AddRealmAsync(client, idB);

    // Give realm B a character to like against, owned by another user on the same game
    var ugOther = await AddRealmAsync(otherClient, idA);
    var charOther = await CreateCharacterAsync(otherClient, ugOther.Id);

    // Add a character to realm A and swipe — this makes realm A's LastActivityAt newer than B's CreatedAt
    var charA = await CreateCharacterAsync(client, ugA.Id);
    await client.PostAsJsonAsync("/api/character-interactions", new
    {
        fromCharacterId = charA,
        toCharacterId = charOther,
        type = "Like"
    });

    var response = await client.GetAsync("/api/user-games?pageSize=50");
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();

    result!.Items.First().Id.Should().Be(ugA.Id);
}

[Fact]
public async Task GetUserGames_RealmWithRecentMatch_SortsFirst()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();

    // Realm A: created first on both accounts
    var extId = Interlocked.Increment(ref _gameCounter);
    var ugA = await AddRealmAsync(clientA, extId);
    var ugB = await AddRealmAsync(clientB, extId);

    // Realm C: created after realm A (would normally sort before A)
    var idC = Interlocked.Increment(ref _gameCounter);
    _ = await AddRealmAsync(clientA, idC);

    // Mutual like in realm A → MatchedAt is newer than ugC.CreatedAt
    var charA = await CreateCharacterAsync(clientA, ugA.Id);
    var charB = await CreateCharacterAsync(clientB, ugB.Id);
    await MutualLikeAsync(clientA, charA, clientB, charB);

    var response = await clientA.GetAsync("/api/user-games?pageSize=50");
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();

    result!.Items.First().Id.Should().Be(ugA.Id);
}

[Fact]
public async Task GetUserGames_RealmWithRecentMessage_SortsFirst()
{
    var clientA = await CreateAuthenticatedClientAsync();
    var clientB = await CreateAuthenticatedClientAsync();

    // Realm A: created first on both accounts
    var extId = Interlocked.Increment(ref _gameCounter);
    var ugA = await AddRealmAsync(clientA, extId);
    var ugB = await AddRealmAsync(clientB, extId);

    // Realm C: created after realm A (would normally sort before A)
    var idC = Interlocked.Increment(ref _gameCounter);
    _ = await AddRealmAsync(clientA, idC);

    // Create a match in realm A, then send a sticker — SentAt is newer than ugC.CreatedAt
    var charA = await CreateCharacterAsync(clientA, ugA.Id);
    var charB = await CreateCharacterAsync(clientB, ugB.Id);
    await MutualLikeAsync(clientA, charA, clientB, charB);

    var matchRes = await clientA.GetAsync("/api/character-matches");
    var matches = await matchRes.Content.ReadFromJsonAsync<PagedResultDto<MatchIdDto>>();
    var matchId = matches!.Items.First().MatchId;

    await clientA.PostAsJsonAsync($"/api/sticker-messages/{matchId}", new { emoji = "🎮" });

    var response = await clientA.GetAsync("/api/user-games?pageSize=50");
    var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();

    result!.Items.First().Id.Should().Be(ugA.Id);
}

// ── helpers ────────────────────────────────────────────────────────────────

private async Task<UserGameDto> AddRealmAsync(HttpClient client, int externalId)
{
    var response = await client.PostAsJsonAsync("/api/user-games", new
    {
        externalId,
        name = $"Game {externalId}",
        imageUrl = (string?)null
    });
    response.EnsureSuccessStatusCode();
    return (await response.Content.ReadFromJsonAsync<AddGameResultDto>())!.UserGame;
}

private async Task<Guid> CreateCharacterAsync(HttpClient client, Guid userGameId)
{
    var response = await client.PostAsJsonAsync("/api/characters", new
    {
        name = "TestCharacter",
        platform = "PC",
        platformHandle = "TestHandle",
        userGameId
    });
    response.EnsureSuccessStatusCode();
    return (await response.Content.ReadFromJsonAsync<CharIdDto>())!.Id;
}

private async Task MutualLikeAsync(HttpClient clientA, Guid charA, HttpClient clientB, Guid charB)
{
    await clientA.PostAsJsonAsync("/api/character-interactions", new
    {
        fromCharacterId = charA,
        toCharacterId = charB,
        type = "Like"
    });
    await clientB.PostAsJsonAsync("/api/character-interactions", new
    {
        fromCharacterId = charB,
        toCharacterId = charA,
        type = "Like"
    });
}
```

Also add these two record declarations alongside the existing ones at the bottom of the class:

```csharp
private record MatchIdDto(Guid MatchId);
```

(`UserGameDto` already exists in the class — reuse it.)

- [ ] **Step 2: Run the tests to confirm they fail**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~GetUserGames_RealmWithRecentInteraction_SortsFirst|FullyQualifiedName~GetUserGames_RealmWithRecentMatch_SortsFirst|FullyQualifiedName~GetUserGames_RealmWithRecentMessage_SortsFirst" --no-build -v n
```

Expected: 3 FAIL — the items come back in creation order, not activity order.

- [ ] **Step 3: Replace `GetUserGames` in `UserGameService.cs`**

Replace the entire `GetUserGames` method (lines 78–102 in the current file):

```csharp
public async Task<PagedResult<UserGameResponse>> GetUserGames(Guid userId, int page, int pageSize)
{
    var rawItems = await _db.UserGames
        .Where(ug => ug.UserId == userId)
        .Select(ug => new
        {
            Id = ug.Id,
            UserId = ug.UserId,
            GameId = ug.GameId,
            GameName = ug.Game.Name,
            GameImageUrl = ug.Game.ImageUrl,
            CreatedAt = ug.CreatedAt,
            LatestInteraction = _db.CharacterInteractions
                .Where(ci => _db.Characters
                    .Where(c => c.UserGameId == ug.Id)
                    .Select(c => c.Id)
                    .Contains(ci.FromCharacterId))
                .Select(ci => (DateTime?)ci.CreatedAt)
                .Max(),
            LatestMatch = _db.CharacterMatches
                .Where(cm =>
                    _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterAId) ||
                    _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterBId))
                .Select(cm => (DateTime?)cm.MatchedAt)
                .Max(),
            LatestMessage = _db.StickerMessages
                .Where(sm => _db.CharacterMatches
                    .Where(cm =>
                        _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterAId) ||
                        _db.Characters.Where(c => c.UserGameId == ug.Id).Select(c => c.Id).Contains(cm.CharacterBId))
                    .Select(cm => cm.Id)
                    .Contains(sm.MatchId))
                .Select(sm => (DateTime?)sm.SentAt)
                .Max()
        })
        .ToListAsync();

    var totalCount = rawItems.Count;

    var items = rawItems
        .Select(x =>
        {
            var lastActivityAt = new[] { x.LatestInteraction, x.LatestMatch, x.LatestMessage }
                .Where(d => d.HasValue)
                .Select(d => d!.Value)
                .Append(x.CreatedAt)
                .Max();
            return (Item: x, LastActivityAt: lastActivityAt);
        })
        .OrderByDescending(x => x.LastActivityAt)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(x => new UserGameResponse
        {
            Id = x.Item.Id,
            UserId = x.Item.UserId,
            GameId = x.Item.GameId,
            GameName = x.Item.GameName,
            GameImageUrl = x.Item.GameImageUrl,
            CreatedAt = x.Item.CreatedAt,
            NewMatchCount = 0
        })
        .ToList();

    return new PagedResult<UserGameResponse>(items, totalCount, page, pageSize);
}
```

- [ ] **Step 4: Run all UserGame tests to confirm everything passes**

```
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~UserGameTests" -v n
```

Expected: all tests PASS, including the three new ordering tests and all pre-existing tests (`GetUserGames_ReturnsPaginatedResult`, `GetUserGames_Page2_ReturnsRemainder`, `GetUserGames_DoesNotReturnOtherUsersGames`, etc.).

If `GetUserGames_ReturnsPaginatedResult` or `GetUserGames_Page2_ReturnsRemainder` fail, the issue is likely that `totalCount` is computed before pagination in the new implementation — double-check that `rawItems.Count` is used for `totalCount` and pagination is applied to `rawItems` after the in-memory sort.

- [ ] **Step 5: Run the full test suite**

```
dotnet test apps/tests/PartyUp.Api.Tests -v n
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```
git add apps/api/Services/UserGameService.cs apps/tests/PartyUp.Api.Tests/Features/UserGames/UserGameTests.cs
git commit -m "feat: sort realms by most recent activity on home page and binder"
```
