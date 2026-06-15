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
  public async Task AddGame_Addition_RedirectsToParent()
  {
      var client = await CreateAuthenticatedClientAsync();

      // 91001 is wired in FakeRawgHandler to have parent_game = 91000
      var response = await client.PostAsJsonAsync("/api/user-games", new
      {
          externalId = 91001,
          name = "Game 91001",
          imageUrl = (string?)null
      });

      response.StatusCode.Should().Be(HttpStatusCode.OK);
      var result = await response.Content.ReadFromJsonAsync<AddGameResultDto>();
      result!.Redirected.Should().BeTrue();
      result.Message.Should().Contain("Game 91001");
      result.Message.Should().Contain("Game 91000");
      result.UserGame.GameName.Should().Be("Game 91000");
  }

  [Fact]
  public async Task AddGame_StaleRecord_StillRedirectsToParent()
  {
      // Arrange: two independent users so we can add 91001 twice
      var clientA = await CreateAuthenticatedClientAsync();
      var clientB = await CreateAuthenticatedClientAsync();

      // clientA adds the addition first — this persists the Game record for 91001
      // in the DB (with ParentExternalId correctly set via the parent-games endpoint)
      // and creates a UserGame pointing at the parent 91000.
      var firstAdd = await clientA.PostAsJsonAsync("/api/user-games", new
      {
          externalId = 91001,
          name = "Game 91001",
          imageUrl = (string?)null
      });
      firstAdd.EnsureSuccessStatusCode();

      // clientB now adds the same DLC — the Game row for 91001 is already in the
      // DB. TryPopulateParentExternalId should handle the stale-record path and
      // the redirect to 91000 should still occur.
      var secondAdd = await clientB.PostAsJsonAsync("/api/user-games", new
      {
          externalId = 91001,
          name = "Game 91001",
          imageUrl = (string?)null
      });

      secondAdd.StatusCode.Should().Be(HttpStatusCode.OK);
      var result = await secondAdd.Content.ReadFromJsonAsync<AddGameResultDto>();
      result!.Redirected.Should().BeTrue();
      result.UserGame.GameName.Should().Be("Game 91000");
  }

  [Fact]
  public async Task AddGame_CanonicalGame_NotRedirected()
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
      result!.Redirected.Should().BeFalse();
      result.Message.Should().BeNull();
  }

  [Fact]
  public async Task AddGame_WithSkipParentRedirect_DoesNotRedirect()
  {
      var client = await CreateAuthenticatedClientAsync();

      // 91001 has parent 91000, but skipParentRedirect=true means we add 91001 directly
      var response = await client.PostAsJsonAsync("/api/user-games", new
      {
          externalId = 91001,
          name = "Game 91001",
          imageUrl = (string?)null,
          skipParentRedirect = true
      });

      response.StatusCode.Should().Be(HttpStatusCode.OK);
      var result = await response.Content.ReadFromJsonAsync<AddGameResultDto>();
      result!.Redirected.Should().BeFalse();
      result.UserGame.GameName.Should().Be("Game 91001");
  }

  [Fact]
  public async Task AddGame_TwoUsersSelectDifferentEditions_BothInParentPool()
  {
      var clientA = await CreateAuthenticatedClientAsync();
      var clientB = await CreateAuthenticatedClientAsync();

      // clientA selects the addition (91001), clientB selects the canonical (91000)
      var responseA = await clientA.PostAsJsonAsync("/api/user-games", new
      {
          externalId = 91001,
          name = "Game 91001",
          imageUrl = (string?)null
      });
      var responseB = await clientB.PostAsJsonAsync("/api/user-games", new
      {
          externalId = 91000,
          name = "Game 91000",
          imageUrl = (string?)null
      });

      responseA.StatusCode.Should().Be(HttpStatusCode.OK);
      responseB.StatusCode.Should().Be(HttpStatusCode.OK);

      var resultA = await responseA.Content.ReadFromJsonAsync<AddGameResultDto>();
      var resultB = await responseB.Content.ReadFromJsonAsync<AddGameResultDto>();

      // Both should be enrolled in the same game (91000)
      resultA!.UserGame.GameName.Should().Be("Game 91000");
      resultB!.UserGame.GameName.Should().Be("Game 91000");
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

  private record PagedResultDto<T>(IEnumerable<T> Items, int TotalCount, int Page, int PageSize);

  private record UserGameDto(Guid Id, Guid UserId, Guid GameId, string GameName);

  private record AddGameResultDto(bool Redirected, string? Message, UserGameDto UserGame);
  private record AddCountResultDto(bool Redirected, string? Message, UserGameWithCountDto UserGame);
  private record UserGameWithCountDto(Guid Id, Guid GameId, string GameName, int NewMatchCount);
  private record CharIdDto(Guid Id);

  private record RealmLimitErrorDto(string Message);

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
