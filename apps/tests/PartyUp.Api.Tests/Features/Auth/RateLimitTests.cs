using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Auth;

public class RateLimitTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public RateLimitTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Login_ExceedingRateLimit_Returns429()
    {
        // Override the auth rate limit to 2 so we can trigger it with 3 requests
        var lowLimitFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["RateLimit:AuthPermitLimit"] = "2"
                });
            });
        });

        var client = lowLimitFactory.CreateClient();

        HttpResponseMessage? last = null;
        for (int i = 0; i < 3; i++)
        {
            last = await client.PostAsJsonAsync("/api/auth/login", new
            {
                username = "nonexistent",
                password = "wrong"
            });
        }
        last!.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }
}
