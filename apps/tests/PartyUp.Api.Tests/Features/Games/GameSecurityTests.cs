using System.Net;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Games;

public class GameSecurityTests : TestBase, IClassFixture<ApiFactory>
{
    public GameSecurityTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GameSearch_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/games?q=halo");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GameSearch_WithAuth_Returns200()
    {
        var authClient = await CreateAuthenticatedClientAsync();
        var response = await authClient.GetAsync("/api/games?q=halo");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GameByDbId_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync($"/api/games/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task FieldDefinitions_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync($"/api/games/{Guid.NewGuid()}/field-definitions");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PopularGames_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/games/popular");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
