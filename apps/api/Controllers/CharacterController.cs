using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models.DTOs.Character;

[ApiController]
[Route("api/usergames/{userGameId:guid}/characters")]
[Authorize]
public class CharactersController : ControllerBase
{
  private readonly ICharacterService _characterService;

  public CharactersController(ICharacterService characterService)
  {
    _characterService = characterService;
  }

  [HttpPost]
  public async Task<IActionResult> CreateCharacter(
      Guid userGameId,
      [FromBody] CreateCharacterRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    var result = await _characterService.CreateCharacterAsync(userId, userGameId, request);

    if (result == null)
      return NotFound("UserGame not found");

    return CreatedAtAction(
        nameof(GetCharacters),
        new { userGameId },
        result);
  }

  [HttpGet]
  public async Task<IActionResult> GetCharacters(Guid userGameId)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    var result = await _characterService.GetCharactersForUserGameAsync(userId, userGameId);

    return Ok(result);
  }
}