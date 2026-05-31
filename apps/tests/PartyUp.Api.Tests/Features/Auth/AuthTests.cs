using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Auth;

public class AuthTests : TestBase, IClassFixture<ApiFactory>
{
    public AuthTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Register_ReturnsToken()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "test@example.com",
            password = "Password123!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResult>();
        auth!.Token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "test@example.com",
            password = "Password123!"
        });

        var response = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "test@example.com",
            password = "WrongPassword!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ReturnsBadRequest()
    {
        await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "dupe@example.com",
            password = "Password123!"
        });

        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "dupe@example.com",
            password = "Password123!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Me_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Register_WithShortPassword_ReturnsBadRequest()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "valid@example.com",
            password = "abc"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithInvalidEmail_ReturnsBadRequest()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "not-an-email",
            password = "ValidPass1!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private record AuthResult(string Token, string Email);
}
