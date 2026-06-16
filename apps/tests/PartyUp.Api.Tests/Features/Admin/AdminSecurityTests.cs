using System.Net;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Admin;

public class AdminSecurityTests : TestBase, IClassFixture<ApiFactory>
{
    public AdminSecurityTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetGames_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/admin/games");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetGames_AsRegularUser_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync();
        var response = await client.GetAsync("/api/admin/games");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task RegenerateSchema_WithoutAuth_Returns401()
    {
        var response = await Client.PostAsync($"/api/admin/games/{Guid.NewGuid()}/regenerate-schema", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RegenerateSchema_AsRegularUser_Returns403()
    {
        var client = await CreateAuthenticatedClientAsync();
        var response = await client.PostAsync($"/api/admin/games/{Guid.NewGuid()}/regenerate-schema", null);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
