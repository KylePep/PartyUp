using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Profile;

public class ProfileTests : TestBase, IClassFixture<ApiFactory>
{
    public ProfileTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetProfile_ReturnsDefaultProfile()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/profile");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await response.Content.ReadFromJsonAsync<ProfileResult>();
        profile!.DisplayName.Should().BeNull();
        profile.Preferences.Should().NotBeNull();
        profile.Preferences!.DarkMode.Should().BeFalse();
        profile.Preferences.NotificationsEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task GetProfile_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/profile");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateProfile_SetsDisplayName()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PatchAsJsonAsync("/api/profile", new
        {
            displayName = "Kyle"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await response.Content.ReadFromJsonAsync<ProfileResult>();
        profile!.DisplayName.Should().Be("Kyle");
    }

    [Fact]
    public async Task UpdateProfile_WithInvalidEmail_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PatchAsJsonAsync("/api/profile", new
        {
            email = "not-an-email"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateProfile_WithDuplicateEmail_Returns400()
    {
        await CreateAuthenticatedClientAsync(email: "existing@example.com");
        var client = await CreateAuthenticatedClientAsync(email: "other@example.com");

        var response = await client.PatchAsJsonAsync("/api/profile", new
        {
            email = "existing@example.com"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdatePreferences_SetsDarkMode()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PatchAsJsonAsync("/api/profile/preferences", new
        {
            darkMode = true
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var prefs = await response.Content.ReadFromJsonAsync<PreferencesResult>();
        prefs!.DarkMode.Should().BeTrue();
        prefs.NotificationsEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task UpdatePreferences_WithoutAuth_Returns401()
    {
        var response = await Client.PatchAsJsonAsync("/api/profile/preferences", new
        {
            darkMode = true
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetProfile_WhenProfileMissing_CreatesAndReturnsDefault()
    {
        var client = await CreateAuthenticatedClientAsync();
        await DeleteAllProfilesAsync();

        var response = await client.GetAsync("/api/profile");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await response.Content.ReadFromJsonAsync<ProfileResult>();
        profile!.DisplayName.Should().BeNull();
        profile.Preferences!.DarkMode.Should().BeFalse();
        profile.Preferences.NotificationsEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateProfile_WhenProfileMissing_CreatesProfileAndUpdates()
    {
        var client = await CreateAuthenticatedClientAsync();
        await DeleteAllProfilesAsync();

        var response = await client.PatchAsJsonAsync("/api/profile", new { displayName = "Ghost" });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await response.Content.ReadFromJsonAsync<ProfileResult>();
        profile!.DisplayName.Should().Be("Ghost");
    }

    [Fact]
    public async Task UpdatePreferences_WhenProfileMissing_CreatesProfileAndUpdates()
    {
        var client = await CreateAuthenticatedClientAsync();
        await DeleteAllProfilesAsync();

        var response = await client.PatchAsJsonAsync("/api/profile/preferences", new { darkMode = true });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var prefs = await response.Content.ReadFromJsonAsync<PreferencesResult>();
        prefs!.DarkMode.Should().BeTrue();
    }

    private async Task DeleteAllProfilesAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.UserProfiles.RemoveRange(db.UserProfiles);
        await db.SaveChangesAsync();
    }

    private record PreferencesResult(bool DarkMode, bool NotificationsEnabled);
    private record ProfileResult(string? DisplayName, PreferencesResult? Preferences);
}
