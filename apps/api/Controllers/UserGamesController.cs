using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.UserGame;

[ApiController]
[Route("api/user-games")]
[Authorize]
public class UserGamesController : ControllerBase
{
  private readonly IUserGameService _service;

  public UserGamesController(IUserGameService service)
  {
    _service = service;
  }

  [HttpPost]
  public async Task<IActionResult> AddGame([FromBody] AddUserGameRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    var added = await _service.AddGameToUser(userId, request);

    if (!added)
      return Conflict(new { message = "Game already in your collection." });

    return Ok(new { });
  }

  [HttpGet]
  public async Task<IActionResult> GetUserGames()
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var games = await _service.GetUserGames(userId);

    return Ok(games);
  }

  [HttpDelete("{id}")]
  public async Task<IActionResult> DeleteUserGame(Guid id)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    var deleted = await _service.DeleteUserGame(id, userId);

    if (!deleted)
      return NotFound();

    return NoContent();
  }
}
