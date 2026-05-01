using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models;

[ApiController]
[Route("api/user-games")]
public class UserGamesController : ControllerBase
{
  private readonly IUserGameService _service;

  public UserGamesController(IUserGameService service)
  {
    _service = service;
  }

  [HttpPost]
  public async Task<IActionResult> AddGame([FromBody] Game game)
  {
    var userId = new Guid();

    await _service.AddGameToUser(userId, game);

    return Ok();
  }

  [HttpGet]
  public async Task<IActionResult> GetUserGames()
  {
    var userId = new Guid();
    var games = await _service.GetUserGames(userId);

    return Ok(games);
  }

  [HttpDelete("{id}")]
  public async Task<IActionResult> DeleteUserGame(Guid id)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    var deleted = await _service.DeleteUserGame(
      id,
      userId
    );

    if (!deleted)
      return NotFound();

    return NoContent();
  }
}