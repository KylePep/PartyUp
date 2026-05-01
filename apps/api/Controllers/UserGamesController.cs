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
}