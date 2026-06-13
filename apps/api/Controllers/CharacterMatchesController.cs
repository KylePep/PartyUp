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

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CharacterMatchDto>> GetMatchById(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var match = await _service.GetMatchByIdAsync(userId, id);
        return match is null ? NotFound() : Ok(match);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<CharacterMatchDto>>> GetMatches(
        [FromQuery] Guid? gameId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _service.GetMatchesAsync(userId, gameId, search, page, pageSize);
        return Ok(result);
    }
}
