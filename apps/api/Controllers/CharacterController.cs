using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Models.DTOs.Character;

[ApiController]
[Route("api/usergames/{userGameId:guid}/characters")]
[Authorize]
public class UserGameCharactersController : ControllerBase
{
  private readonly ICharacterService _characterService;

  public UserGameCharactersController(ICharacterService characterService)
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

  [HttpPut("{characterId:guid}")]
  public async Task<IActionResult> UpdateCharacter(
         Guid userGameId,
         Guid characterId,
         [FromBody] UpdateCharacterRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    var updated = await _characterService.UpdateCharacterAsync(
        userId,
        userGameId,
        characterId,
        request);

    if (!updated)
      return NotFound();

    return NoContent();
  }

  [HttpDelete("{characterId:guid}")]
  public async Task<IActionResult> DeleteCharacter(
      Guid userGameId,
      Guid characterId)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    var deleted = await _characterService.DeleteCharacterAsync(
        userId,
        userGameId,
        characterId);

    if (!deleted)
      return NotFound();

    return NoContent();
  }

}