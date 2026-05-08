using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.Character;

[ApiController]
[Route("api/characters")]
[Authorize]
public class CharactersController : ControllerBase
{
  private readonly ICharacterService _characterService;

  public CharactersController(ICharacterService characterService)
  {
    _characterService = characterService;
  }

  [HttpGet]
  public async Task<IActionResult> GetMyCharacters()
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _characterService.GetAllCharactersForUserAsync(userId);
    return Ok(result);
  }

  [HttpGet("{userGameId}/userGame")]
  public async Task<IActionResult> GetMyCharacterByUserGameId(Guid userGameId)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _characterService.GetCharactersForUserGameAsync(userId, userGameId);
    return Ok(result);
  }

  [HttpPost]
  public async Task<IActionResult> CreateCharacter([FromBody] CreateCharacterRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _characterService.CreateCharacterAsync(userId, request.UserGameId, request);

    if (result == null)
      return NotFound("UserGame not found or does not belong to you.");

    return CreatedAtAction(nameof(GetMyCharacters), result);
  }

  [HttpGet("discover")]
  public async Task<IActionResult> Discover([FromQuery] Guid gameId)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _characterService.DiscoverCharactersAsync(userId, gameId);
    return Ok(result);
  }
}
