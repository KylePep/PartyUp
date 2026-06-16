using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Auth;

public class MeAdminTests : TestBase, IClassFixture<ApiFactory>
{
    public MeAdminTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Me_RegularUser_ReturnsIsAdminFalse()
    {
        var client = await CreateAuthenticatedClientAsync();
        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<MeResponse>();
        body!.IsAdmin.Should().BeFalse();
    }

    [Fact]
    public async Task Me_AdminUser_ReturnsIsAdminTrue()
    {
        var client = await CreateAdminClientAsync();
        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<MeResponse>();
        body!.IsAdmin.Should().BeTrue();
    }

    private record MeResponse(Guid Id, string Email, bool IsAdmin);
}
