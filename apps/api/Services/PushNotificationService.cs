using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Services.Interfaces;
using WebPush;

namespace PartyUp.Api.Services;

public class VapidOptions
{
    public string PublicKey { get; set; } = "";
    public string PrivateKey { get; set; } = "";
    public string Subject { get; set; } = "";
}

public class PushNotificationService : IPushNotificationService
{
    private readonly AppDbContext _db;
    private readonly VapidDetails _vapidDetails;
    private readonly string _publicKey;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(
        AppDbContext db,
        IOptions<VapidOptions> options,
        ILogger<PushNotificationService> logger)
    {
        _db = db;
        var v = options.Value;
        _vapidDetails = new VapidDetails(v.Subject, v.PublicKey, v.PrivateKey);
        _publicKey = v.PublicKey;
        _logger = logger;
    }

    public string GetVapidPublicKey() => _publicKey;

    public async Task RegisterAsync(Guid userId, string endpoint, string p256dh, string auth)
    {
        var existing = await _db.UserPushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == endpoint);

        if (existing is not null)
        {
            existing.P256dh = p256dh;
            existing.Auth = auth;
        }
        else
        {
            _db.UserPushSubscriptions.Add(new UserPushSubscription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Endpoint = endpoint,
                P256dh = p256dh,
                Auth = auth,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
    }

    public async Task UnregisterAsync(Guid userId, string endpoint)
    {
        var subscription = await _db.UserPushSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == endpoint);

        if (subscription is null) return;

        _db.UserPushSubscriptions.Remove(subscription);
        await _db.SaveChangesAsync();
    }

    public async Task SendToUserAsync(Guid userId, string title, string body, object? data = null)
    {
        var subscriptions = await _db.UserPushSubscriptions
            .Where(s => s.UserId == userId)
            .ToListAsync();

        if (subscriptions.Count == 0) return;

        var payload = JsonSerializer.Serialize(new { title, body, data });
        var staleIds = new List<Guid>();

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSubscription = new PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                var client = new WebPushClient();
                await client.SendNotificationAsync(pushSubscription, payload, _vapidDetails);
            }
            catch (WebPushException ex) when (ex.StatusCode == HttpStatusCode.Gone)
            {
                staleIds.Add(sub.Id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Push notification failed for subscription {Id}", sub.Id);
            }
        }

        if (staleIds.Count > 0)
        {
            await _db.UserPushSubscriptions
                .Where(s => staleIds.Contains(s.Id))
                .ExecuteDeleteAsync();
        }
    }
}
