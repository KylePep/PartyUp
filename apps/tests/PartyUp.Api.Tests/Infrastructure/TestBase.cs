using System.Net.Http.Headers;
using System.Net.Http.Json;
using PartyUp.Api.Tests.Factories;

namespace PartyUp.Api.Tests.Infrastructure;

public abstract class TestBase : IAsyncLifetime
{
    protected readonly ApiFactory Factory;
    protected readonly HttpClient Client;

    protected TestBase(ApiFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
    }

    public async Task InitializeAsync() => await DatabaseReset.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    protected async Task<HttpClient> CreateAuthenticatedClientAsync(
        string? email = null,
        string password = "Password123!")
    {
        email ??= $"user_{Guid.NewGuid():N}@test.com";

        var client = Factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password
        });
        response.EnsureSuccessStatusCode();

        var auth = await response.Content.ReadFromJsonAsync<AuthResult>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.Token);

        return client;
    }

    private record AuthResult(string Token, string Email);
}
