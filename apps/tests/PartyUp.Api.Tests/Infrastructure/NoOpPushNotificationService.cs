using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Tests.Infrastructure;

public class NoOpPushNotificationService : IPushNotificationService
{
    public string GetVapidPublicKey() => "test-vapid-public-key";
    public Task RegisterAsync(Guid userId, string endpoint, string p256dh, string auth) => Task.CompletedTask;
    public Task UnregisterAsync(Guid userId, string endpoint) => Task.CompletedTask;
    public Task SendToUserAsync(Guid userId, string title, string body, object? data = null) => Task.CompletedTask;
}
