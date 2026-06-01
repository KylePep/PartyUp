using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.Character;

[ApiController]
[Route("api/character-interactions")]
[Authorize]
public class CharacterInteractionController : ControllerBase
{
    private readonly ICharacterInteractionService _service;

    public CharacterInteractionController(ICharacterInteractionService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<ActionResult<MatchResponse>> RecordInteraction([FromBody] CharacterInteractionRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var result = await _service.RecordInteractionAsync(request, userId);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet("pending")]
    public async Task<ActionResult<List<DiscoverCharacterResponse>>> GetPendingLikes([FromQuery] Guid characterId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        try
        {
            var result = await _service.GetPendingLikesAsync(characterId, userId);
            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}
