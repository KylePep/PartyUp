using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Characters;

public class CharacterUpdateDeleteTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _gameCounter = 60_000;

    public CharacterUpdateDeleteTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task UpdateCharacter_ReturnsNoContent()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);
        var character = await CreateCharacterAsync(client, userGame.Id);

        var response = await client.PutAsJsonAsync(
            $"/api/characters/{userGame.Id}/{character.Id}",
            new { name = "Updated Name" });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UpdateCharacter_PersistsChanges()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);
        var character = await CreateCharacterAsync(client, userGame.Id);

        await client.PutAsJsonAsync(
            $"/api/characters/{userGame.Id}/{character.Id}",
            new { name = "Updated Name", bio = "New bio" });

        var all = await client.GetFromJsonAsync<PagedResultDto<CharacterDto>>("/api/characters");
        all!.Items.Should().ContainSingle(c => c.Name == "Updated Name");
    }

    [Fact]
    public async Task UpdateCharacter_WithImageFocalPoint_PersistsChange()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);
        var character = await CreateCharacterAsync(client, userGame.Id);

        await client.PutAsJsonAsync(
            $"/api/characters/{userGame.Id}/{character.Id}",
            new { name = "Focal Update", imageFocalX = 100, imageFocalY = 0 });

        var all = await client.GetFromJsonAsync<PagedResultDto<CharacterWithFocalDto>>("/api/characters");
        all!.Items.Should().ContainSingle(c =>
            c.Name == "Focal Update" &&
            c.ImageFocalX == 100 &&
            c.ImageFocalY == 0);
    }

    [Fact]
    public async Task UpdateCharacter_OnAnotherUsersCharacter_ReturnsNotFound()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var userGameB = await AddGameAsync(clientB);
        var characterB = await CreateCharacterAsync(clientB, userGameB.Id);

        var response = await clientA.PutAsJsonAsync(
            $"/api/characters/{userGameB.Id}/{characterB.Id}",
            new { name = "Stolen Name" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteCharacter_ReturnsNoContent()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);
        var character = await CreateCharacterAsync(client, userGame.Id);

        var response = await client.DeleteAsync($"/api/characters/{userGame.Id}/{character.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task DeleteCharacter_RemovesCharacterFromList()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);
        var character = await CreateCharacterAsync(client, userGame.Id);

        await client.DeleteAsync($"/api/characters/{userGame.Id}/{character.Id}");

        var all = await client.GetFromJsonAsync<PagedResultDto<CharacterDto>>("/api/characters");
        all!.Items.Should().NotContain(c => c.Id == character.Id);
    }

    [Fact]
    public async Task DeleteCharacter_WithImageUrl_RemovesCharacter()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);

        // Create character with an imageUrl
        var createResponse = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Image Character",
            platform = "PC",
            platformHandle = "ImageHandle",
            userGameId = userGame.Id,
            imageUrl = "https://storage.googleapis.com/test-bucket/characters/test-image.jpg"
        });
        createResponse.EnsureSuccessStatusCode();
        var character = await createResponse.Content.ReadFromJsonAsync<CharacterDto>();

        var deleteResponse = await client.DeleteAsync($"/api/characters/{userGame.Id}/{character!.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var all = await client.GetFromJsonAsync<PagedResultDto<CharacterDto>>("/api/characters");
        all!.Items.Should().NotContain(c => c.Id == character.Id);
    }

    [Fact]
    public async Task DeleteCharacter_OnAnotherUsersCharacter_ReturnsNotFound()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        var userGameB = await AddGameAsync(clientB);
        var characterB = await CreateCharacterAsync(clientB, userGameB.Id);

        var response = await clientA.DeleteAsync($"/api/characters/{userGameB.Id}/{characterB.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateCharacter_WithEmptyName_ReturnsBadRequest()
    {
        var client = await CreateAuthenticatedClientAsync();
        var userGame = await AddGameAsync(client);
        var character = await CreateCharacterAsync(client, userGame.Id);

        var response = await client.PutAsJsonAsync(
            $"/api/characters/{userGame.Id}/{character.Id}",
            new { name = "" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

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

    private async Task<CharacterDto> CreateCharacterAsync(HttpClient client, Guid userGameId)
    {
        var response = await client.PostAsJsonAsync("/api/characters", new
        {
            name = "Test Character",
            platform = "PC",
            platformHandle = "TestHandle",
            userGameId
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<CharacterDto>())!;
    }

    private record PagedResultDto<T>(List<T> Items, int TotalCount, int Page, int PageSize);
    private record UserGameDto(Guid Id, Guid UserId, Guid GameId, string GameName);
    private record AddGameResultDto(UserGameDto UserGame);
    private record CharacterDto(Guid Id, string Name, Guid UserGameId);
    private record CharacterWithFocalDto(Guid Id, string Name, int? ImageFocalX, int? ImageFocalY);
}
