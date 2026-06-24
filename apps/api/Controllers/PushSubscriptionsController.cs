using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.PushSubscription;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/push-subscriptions")]
public class PushSubscriptionsController : ControllerBase
{
    private readonly IPushNotificationService _push;

    public PushSubscriptionsController(IPushNotificationService push)
    {
        _push = push;
    }

    [HttpGet("vapid-public-key")]
    public IActionResult GetVapidPublicKey() =>
        Ok(new { publicKey = _push.GetVapidPublicKey() });

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Register([FromBody] PushSubscriptionRequest request)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        await _push.RegisterAsync(userId, request.Endpoint, request.P256dh, request.Auth);
        return Ok();
    }

    [Authorize]
    [HttpDelete]
    public async Task<IActionResult> Unregister([FromBody] PushSubscriptionRequest request)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        await _push.UnregisterAsync(userId, request.Endpoint);
        return NoContent();
    }
}
