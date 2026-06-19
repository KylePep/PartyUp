using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.StickerMessage;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/sticker-messages")]
[Authorize]
public class StickerMessagesController : ControllerBase
{
    private readonly IStickerMessageService _service;

    public StickerMessagesController(IStickerMessageService service)
    {
        _service = service;
    }

    [HttpGet("{matchId:guid}")]
    public async Task<ActionResult<List<StickerMessageDto>>> GetByMatch(Guid matchId)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        try
        {
            return Ok(await _service.GetByMatchAsync(matchId, userId));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpPost("{matchId:guid}")]
    public async Task<ActionResult<StickerMessageDto>> Send(
        Guid matchId, [FromBody] SendStickerRequest request)
    {
        if (this.GetUserId() is not Guid userId) return Unauthorized();
        try
        {
            return Ok(await _service.SendAsync(matchId, userId, request.Emoji));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}

public record SendStickerRequest(string Emoji);
