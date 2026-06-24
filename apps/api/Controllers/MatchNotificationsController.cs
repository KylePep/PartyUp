using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/match-notifications")]
[Authorize]
public class MatchNotificationsController : ControllerBase
{
    private readonly IMatchNotificationService _service;

    public MatchNotificationsController(IMatchNotificationService service)
    {
        _service = service;
    }

    [HttpGet("has-unread")]
    public async Task<IActionResult> HasUnread()
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        var hasUnread = await _service.HasUnreadAsync(userId);
        return Ok(new { hasUnread });
    }

    [HttpPost("{matchId}/viewed")]
    public async Task<IActionResult> MarkViewed(Guid matchId)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        await _service.MarkViewedAsync(matchId, userId);
        return NoContent();
    }
}
