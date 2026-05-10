using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;
using Xunit;

namespace PartyUp.Api.Tests.Features.Config;

public class CorsTests : TestBase, IClassFixture<ApiFactory>
{
    public CorsTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task AllowedOrigin_ReturnsCorsHeader()
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/health");
        request.Headers.Add("Origin", "http://localhost:5173");
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await Client.SendAsync(request);

        Assert.True(
            response.Headers.Contains("Access-Control-Allow-Origin"),
            "Expected Access-Control-Allow-Origin header to be present");
        Assert.Equal(
            "http://localhost:5173",
            response.Headers.GetValues("Access-Control-Allow-Origin").First());
    }

    [Fact]
    public async Task UnknownOrigin_DoesNotReturnCorsHeader()
    {
        var request = new HttpRequestMessage(HttpMethod.Options, "/api/health");
        request.Headers.Add("Origin", "https://evil.example.com");
        request.Headers.Add("Access-Control-Request-Method", "GET");

        var response = await Client.SendAsync(request);

        Assert.False(
            response.Headers.Contains("Access-Control-Allow-Origin"),
            "Expected no Access-Control-Allow-Origin header for unknown origin");
    }
}
