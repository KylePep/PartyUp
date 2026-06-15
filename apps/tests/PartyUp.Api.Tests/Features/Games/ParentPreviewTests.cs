using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Games;

public class ParentPreviewTests : TestBase, IClassFixture<ApiFactory>
{
    private static int _idCounter = 92_000;

    public ParentPreviewTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task ParentPreview_GameWithParent_ReturnsBothGames()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/games/parent-preview?externalId=91001");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<ParentPreviewDto>();
        result!.SelectedGame.ExternalId.Should().Be(91001);
        result.SelectedGame.Name.Should().Be("Game 91001");
        result.ParentGame.Should().NotBeNull();
        result.ParentGame!.ExternalId.Should().Be(91000);
        result.ParentGame.Name.Should().Be("Game 91000");
    }

    [Fact]
    public async Task ParentPreview_GameWithoutParent_ReturnsNullParentGame()
    {
        var client = await CreateAuthenticatedClientAsync();
        var id = Interlocked.Increment(ref _idCounter);

        var response = await client.GetAsync($"/api/games/parent-preview?externalId={id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<ParentPreviewDto>();
        result!.SelectedGame.ExternalId.Should().Be(id);
        result.ParentGame.Should().BeNull();
    }

    [Fact]
    public async Task ParentPreview_RealmCount_ReflectsExistingUserGames()
    {
        var clientA = await CreateAuthenticatedClientAsync();
        var clientB = await CreateAuthenticatedClientAsync();

        // clientA adds 91001 → redirected to 91000; clientB adds 91000 directly
        await clientA.PostAsJsonAsync("/api/user-games", new
        {
            externalId = 91001,
            name = "Game 91001",
            imageUrl = (string?)null
        });
        await clientB.PostAsJsonAsync("/api/user-games", new
        {
            externalId = 91000,
            name = "Game 91000",
            imageUrl = (string?)null
        });

        var client = await CreateAuthenticatedClientAsync();
        var response = await client.GetAsync("/api/games/parent-preview?externalId=91001");
        var result = await response.Content.ReadFromJsonAsync<ParentPreviewDto>();

        result!.SelectedGame.RealmCount.Should().Be(0); // no one in 91001 directly
        result.ParentGame!.RealmCount.Should().Be(2);   // clientA + clientB in 91000
    }

    [Fact]
    public async Task ParentPreview_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/games/parent-preview?externalId=91001");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private record ParentPreviewDto(GamePreviewItemDto SelectedGame, GamePreviewItemDto? ParentGame);
    private record GamePreviewItemDto(int ExternalId, string Name, string? ImageUrl, int RealmCount);
}
