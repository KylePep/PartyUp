using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.CharacterMatch;

[ApiController]
[Route("api/character-matches")]
[Authorize]
public class CharacterMatchesController : ControllerBase
{
    private readonly ICharacterMatchService _service;

    public CharacterMatchesController(ICharacterMatchService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<CharacterMatchDto>>> GetMatches(
        [FromQuery] Guid? gameId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _service.GetMatchesAsync(userId, gameId, page, pageSize);
        return Ok(result);
    }
}
