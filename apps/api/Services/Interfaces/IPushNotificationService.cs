namespace PartyUp.Api.Services.Interfaces;

public interface IPushNotificationService
{
    string GetVapidPublicKey();
    Task RegisterAsync(Guid userId, string endpoint, string p256dh, string auth);
    Task UnregisterAsync(Guid userId, string endpoint);
    Task SendToUserAsync(Guid userId, string title, string body, object? data = null);
}
