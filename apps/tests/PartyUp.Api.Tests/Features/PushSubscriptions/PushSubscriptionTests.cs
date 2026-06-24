using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.PushSubscriptions;

public class PushSubscriptionTests : TestBase, IClassFixture<ApiFactory>
{
    public PushSubscriptionTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetVapidPublicKey_ReturnsOkWithKey()
    {
        var response = await Client.GetAsync("/api/push-subscriptions/vapid-public-key");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<VapidKeyResponse>();
        body!.PublicKey.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Register_Unauthenticated_ReturnsUnauthorized()
    {
        var response = await Client.PostAsJsonAsync("/api/push-subscriptions", new
        {
            endpoint = "https://fcm.example.com/test",
            p256dh = "test-p256dh",
            auth = "test-auth"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Register_Authenticated_ReturnsOk()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PostAsJsonAsync("/api/push-subscriptions", new
        {
            endpoint = "https://fcm.example.com/test",
            p256dh = "test-p256dh",
            auth = "test-auth"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Unregister_Unauthenticated_ReturnsUnauthorized()
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/push-subscriptions")
        {
            Content = JsonContent.Create(new { endpoint = "https://fcm.example.com/test" })
        };
        var response = await Client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Unregister_Authenticated_ReturnsNoContent()
    {
        var client = await CreateAuthenticatedClientAsync();
        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/push-subscriptions")
        {
            Content = JsonContent.Create(new { endpoint = "https://fcm.example.com/test" })
        };
        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private record VapidKeyResponse(string PublicKey);
}
