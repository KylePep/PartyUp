using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/games")]
public class GamesController : ControllerBase
{
  private readonly IGameService _service;

  public GamesController(IGameService service)
  {
    _service = service;
  }

  [HttpGet]
  public async Task<IActionResult> Search([FromQuery] string q)
  {
    var games = await _service.SearchGames(q);
    return Ok(games);
  }

  [HttpGet("{id}")]
  public async Task<IActionResult> GetById(int id)
  {
    var game = await _service.GetGameById(id);
    if (game == null)
      return NotFound();

    return Ok(game);
  }
}