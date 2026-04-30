using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/games")]
public class GamesController : ControllerBase
{
  private readonly IGameService _service;
  private readonly IConfiguration _configuration;

  public GamesController(IGameService service, IConfiguration configuration)
  {
    _service = service;
    _configuration = configuration;
  }


  [HttpGet]
  public async Task<IActionResult> Search(
      [FromQuery] string q = "",
      [FromQuery] int page = 1,
      [FromQuery] List<int>? genres = null,
      [FromQuery] List<string>? tags = null)
  {
    var games = await _service.SearchGames(q, page, genres, tags);
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