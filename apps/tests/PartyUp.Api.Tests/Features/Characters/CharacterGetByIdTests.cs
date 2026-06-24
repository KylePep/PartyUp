using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Characters;

public class CharacterGetByIdTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 50_000;

    public CharacterGetByIdTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetCharacterById_ReturnsCharacter_WhenOwned()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);

        var createResponse = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Solo Hero",
            platform = "PC",
            platformHandle = "SoloHandle",
            userGameId = userGame.Id,
            preferredModes = Array.Empty<string>()
        });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<CharacterIdDto>();

        var response = await client.GetAsync($"/api/characters/{created!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var character = await response.Content.ReadFromJsonAsync<CharacterNameDto>();
        character!.Name.Should().Be("Solo Hero");
    }

    [Fact]
    public async Task GetCharacterById_Returns404_WhenOwnedByOtherUser()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var userGameB = await AddGameAsync(clientB);
        var createResponse = await clientB.PostAsJsonAsync("/api/characters", new
        {
            name = "Their Hero",
            platform = "PC",
            platformHandle = "TheirHandle",
            userGameId = userGameB.Id,
            preferredModes = Array.Empty<string>()
        });
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<CharacterIdDto>();

        var response = await clientA.GetAsync($"/api/characters/{created!.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetCharacterById_Returns401_WhenUnauthenticated()
    {
        var response = await Client.GetAsync($"/api/characters/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<UserGameDto> AddGameAsync(HttpClient client)
    {
        var id = Interlocked.Increment(ref _gameCounter);
        var response = await client.PostAsJsonAsync("/api/user-games", new
        {
            externalId = id,
            name = $"Game {id}",
            imageUrl = (string?)null
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AddGameResultDto>())!.UserGame;
    }

    private record UserGameDto(Guid Id, Guid UserId, Guid GameId, string GameName);
    private record AddGameResultDto(UserGameDto UserGame);
    private record CharacterIdDto(Guid Id);
    private record CharacterNameDto(string Name);
}
