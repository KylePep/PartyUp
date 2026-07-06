using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.UserGames;

public class UserGameTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 30_000;

    public UserGameTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task AddGame_ReturnsUserGame()
    {
        var client = await CreateAuthenticatedClientAsync();
        var id = Interlocked.Increment(ref _gameCounter);

        var response = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<AddGameResultDto>();
        result!.UserGame.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task GetUserGames_ReturnsOwnGames()
    {
        var client = await CreateAuthenticatedClientAsync();
        var id = Interlocked.Increment(ref _gameCounter);

        await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });

        var response = await client.GetAsync("/api/user-games");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();
        result!.Items.Should().ContainSingle();
    }

    [Fact]
    public async Task DeleteUserGame_RemovesGame()
    {
        var client = await CreateAuthenticatedClientAsync();
        var id = Interlocked.Increment(ref _gameCounter);

        var addResponse = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });
        var addResult = (await addResponse.Content.ReadFromJsonAsync<AddGameResultDto>())!;

        var deleteResponse = await client.DeleteAsync($"/api/user-games/{addResult.UserGame.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await client.GetAsync("/api/user-games");
        var result = await getResponse.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();
        result!.Items.Should().BeEmpty();
    }

    [Fact]
    public async Task AddGame_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = 1,
            name = "Test Game",
            imageUrl = (string?)null
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUserGames_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/user-games");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUserGames_DoesNotReturnOtherUsersGames()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var idA = Interlocked.Increment(ref _gameCounter);
        var idB = Interlocked.Increment(ref _gameCounter);

        await clientA.PostAsJsonAsync("/api/user-games", new
        {
            externalId = idA,
            name = $"Game {idA}",
            imageUrl = (string?)null
        });

        await clientB.PostAsJsonAsync("/api/user-games", new
        {
            externalId = idB,
            name = $"Game {idB}",
            imageUrl = (string?)null
        });

        var response = await clientA.GetAsync("/api/user-games");
        var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();

        result!.Items.Should().ContainSingle();
    }

  [Fact]
  public async Task GetUserGameByGameId_ReturnsDetailResponse()
  {
    var client = await CreateAuthenticatedClientAsync();
    var id = Interlocked.Increment(ref _gameCounter);

    var addResponse = await client.PostAsJsonAsync("/api/user-games", new
    {
      externalId = id,
      name = $"Game {id}",
      imageUrl = (string?)null
    });
    addResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    var addResult = await addResponse.Content.ReadFromJsonAsync<AddGameResultDto>();

    var detailResponse = await client.GetAsync($"/api/user-games/{addResult!.UserGame.GameId}/game");

    detailResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    var detail = await detailResponse.Content.ReadFromJsonAsync<UserGameDetailDto>();
    detail!.GameName.Should().Be($"Game {id}");
    detail.Platforms.Should().NotBeNull();
  }

  [Fact]
  public async Task AddGame_AtLimit_ReturnsConflict()
  {
      var client = await CreateAuthenticatedClientAsync();

      // Add 24 games
      for (var i = 0; i < 24; i++)
      {
          var id = Interlocked.Increment(ref _gameCounter);
          var r = await client.PostAsJsonAsync("/api/user-games", new
          {
              externalId = id,
              name = $"Game {id}",
              imageUrl = (string?)null
          });
          r.EnsureSuccessStatusCode();
      }

      // 25th game — should be rejected
      var eleventh = Interlocked.Increment(ref _gameCounter);
      var response = await client.PostAsJsonAsync("/api/user-games", new
      {
          externalId = eleventh,
          name = $"Game {eleventh}",
          imageUrl = (string?)null
      });

      response.StatusCode.Should().Be(HttpStatusCode.Conflict);
      var body = await response.Content.ReadFromJsonAsync<RealmLimitErrorDto>();
      body!.Message.Should().Contain("Realm limit");
  }

  [Fact]
  public async Task AddGame_WithEmptyName_ReturnsBadRequest()
  {
      var client = await CreateAuthenticatedClientAsync();

      var response = await client.PostAsJsonAsync("/api/user-games", new
      {
          externalId = 99999,
          name = "",
          imageUrl = (string?)null
      });

      response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
  }

    [Fact]
    public async Task GetUserGames_AfterMutualMatch_HasNewMatchCount()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();
        var externalId = Interlocked.Increment(ref _gameCounter);

        var ugAResponse = await clientA.PostAsJsonAsync("/api/user-games", new
        {
            externalId,
            name = $"Game {externalId}",
            imageUrl = (string?)null
        });
        ugAResponse.EnsureSuccessStatusCode();
        var ugA = (await ugAResponse.Content.ReadFromJsonAsync<AddCountResultDto>())!.UserGame;

        var ugBResponse = await clientB.PostAsJsonAsync("/api/user-games", new
        {
            externalId,
            name = $"Game {externalId}",
            imageUrl = (string?)null
        });
        ugBResponse.EnsureSuccessStatusCode();
        var ugB = (await ugBResponse.Content.ReadFromJsonAsync<AddCountResultDto>())!.UserGame;

        var charARes = await clientA.PostAsJsonAsync("/api/characters", new
        {
            name = "A",
            platform = "PC",
            platformHandle = "HandleA",
            userGameId = ugA.Id
        });
        var charA = (await charARes.Content.ReadFromJsonAsync<CharIdDto>())!.Id;

        var charBRes = await clientB.PostAsJsonAsync("/api/characters", new
        {
            name = "B",
            platform = "PC",
            platformHandle = "HandleB",
            userGameId = ugB.Id
        });
        var charB = (await charBRes.Content.ReadFromJsonAsync<CharIdDto>())!.Id;

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

        var gamesRes = await clientA.GetAsync("/api/user-games");
        var result = await gamesRes.Content.ReadFromJsonAsync<PagedResultDto<UserGameWithCountDto>>();
        result!.Items.Should().ContainSingle(g => g.Id == ugA.Id && g.NewMatchCount == 1);
    }

  [Fact]
  public async Task GetUserGames_ReturnsPaginatedResult()
  {
      var client = await CreateAuthenticatedClientAsync();

      // Add 8 games (well within the 24-game realm limit)
      for (var i = 0; i < 8; i++)
      {
          var id = Interlocked.Increment(ref _gameCounter);
          var r = await client.PostAsJsonAsync("/api/user-games", new
          {
              externalId = id,
              name = $"Game {id}",
              imageUrl = (string?)null
          });
          r.EnsureSuccessStatusCode();
      }

      var response = await client.GetAsync("/api/user-games?page=1&pageSize=5");
      response.StatusCode.Should().Be(HttpStatusCode.OK);

      var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();
      result!.TotalCount.Should().Be(8);
      result.Page.Should().Be(1);
      result.PageSize.Should().Be(5);
      result.Items.Should().HaveCount(5);
  }

  [Fact]
  public async Task GetUserGames_Page2_ReturnsRemainder()
  {
      var client = await CreateAuthenticatedClientAsync();

      for (var i = 0; i < 8; i++)
      {
          var id = Interlocked.Increment(ref _gameCounter);
          var r = await client.PostAsJsonAsync("/api/user-games", new
          {
              externalId = id,
              name = $"Game {id}",
              imageUrl = (string?)null
          });
          r.EnsureSuccessStatusCode();
      }

      var response = await client.GetAsync("/api/user-games?page=2&pageSize=5");
      response.StatusCode.Should().Be(HttpStatusCode.OK);

      var result = await response.Content.ReadFromJsonAsync<PagedResultDto<UserGameDto>>();
      result!.TotalCount.Should().Be(8);
      result.Page.Should().Be(2);
      result.Items.Should().HaveCount(3);
  }

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

      // Give realm A a character to like against, owned by another user on the same game
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

  private record PagedResultDto<T>(IEnumerable<T> Items, int TotalCount, int Page, int PageSize);

  private record UserGameDto(Guid Id, Guid UserId, Guid GameId, string GameName);

  private record AddGameResultDto(UserGameDto UserGame);
  private record AddCountResultDto(UserGameWithCountDto UserGame);
  private record UserGameWithCountDto(Guid Id, Guid GameId, string GameName, int NewMatchCount);
  private record CharIdDto(Guid Id);

  private record RealmLimitErrorDto(string Message);
  private record MatchIdDto(Guid MatchId);

  private record UserGameDetailDto(
    Guid Id,
    Guid UserId,
    Guid GameId,
    string GameName,
    string? GameImageUrl,
    string? Description,
    string? Website,
    double Rating,
    List<string> Platforms);
}
