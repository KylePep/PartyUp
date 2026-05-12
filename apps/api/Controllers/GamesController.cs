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
  public async Task<IActionResult> Search(
      [FromQuery] string q = "",
      [FromQuery] int page = 1,
      [FromQuery] List<int>? genres = null,
      [FromQuery] bool? exclude_additions = null,
      [FromQuery] List<string>? tags = null)
  {
    var result = await _service.SearchGames(q, page, genres, exclude_additions, tags);
    return Ok(result);
  }

  [HttpGet("{id:int}/rawg")]
  public async Task<IActionResult> GetById(int id)
  {
    var game = await _service.GetGameById(id);
    if (game == null)
      return NotFound();
    return Ok(game);
  }

  [HttpGet("{id:guid}")]
  public async Task<IActionResult> GetByDbId(Guid id)
  {
    var game = await _service.GetGameByDbId(id);
    if (game == null)
      return NotFound();
    return Ok(game);
  }
}
