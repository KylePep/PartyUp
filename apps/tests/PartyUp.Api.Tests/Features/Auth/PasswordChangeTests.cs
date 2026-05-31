using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Auth;

public class PasswordChangeTests : TestBase, IClassFixture<ApiFactory>
{
    public PasswordChangeTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task ChangePassword_WithValidCredentials_Returns200()
    {
        var client = await CreateAuthenticatedClientAsync(
            email: "user@example.com",
            password: "OldPassword1!");

        var response = await client.PutAsJsonAsync("/api/auth/password", new
        {
            currentPassword = "OldPassword1!",
            newPassword = "NewPassword2!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync(email: "user@example.com");

        var response = await client.PutAsJsonAsync("/api/auth/password", new
        {
            currentPassword = "WrongPassword!",
            newPassword = "NewPassword2!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ChangePassword_WithoutAuth_Returns401()
    {
        var response = await Client.PutAsJsonAsync("/api/auth/password", new
        {
            currentPassword = "Password123!",
            newPassword = "NewPassword2!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ChangePassword_NewPasswordTooShort_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync(email: "user@example.com");

        var response = await client.PutAsJsonAsync("/api/auth/password", new
        {
            currentPassword = "Password123!",
            newPassword = "short"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ChangePassword_AfterChange_OldPasswordNoLongerWorks()
    {
        var client = await CreateAuthenticatedClientAsync(
            email: "user@example.com",
            password: "OldPassword1!");

        await client.PutAsJsonAsync("/api/auth/password", new
        {
            currentPassword = "OldPassword1!",
            newPassword = "NewPassword2!"
        });

        var loginResponse = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "user@example.com",
            password = "OldPassword1!"
        });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
