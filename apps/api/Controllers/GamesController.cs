using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PartyUp.Api.Models.DTOs.Game;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/games")]
public class GamesController : ControllerBase
{
  private readonly IGameService _service;
  private readonly IGameFieldDefinitionService _fieldDefinitionService;
  private readonly ILogger<GamesController> _logger;

  public GamesController(IGameService service, IGameFieldDefinitionService fieldDefinitionService, ILogger<GamesController> logger)
  {
    _service = service;
    _fieldDefinitionService = fieldDefinitionService;
    _logger = logger;
  }

  [Authorize]
  [EnableRateLimiting("game-search")]
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

  [Authorize]
  [EnableRateLimiting("game-search")]
  [HttpGet("{id:int}/rawg")]
  public async Task<IActionResult> GetById(int id)
  {
    var game = await _service.GetGameById(id);
    if (game == null)
      return NotFound();
    return Ok(game);
  }

  [Authorize]
  [EnableRateLimiting("game-search")]
  [HttpGet("{id:guid}")]
  public async Task<IActionResult> GetByDbId(Guid id)
  {
    var game = await _service.GetGameByDbId(id);
    if (game == null)
      return NotFound();
    return Ok(game);
  }

  [Authorize]
  [EnableRateLimiting("game-search")]
  [HttpGet("{id:guid}/field-definitions")]
  public async Task<IActionResult> GetFieldDefinitions(Guid id)
  {
    var game = await _service.GetGameByDbId(id);
    if (game == null)
      return NotFound();

    var definitions = await _fieldDefinitionService.GetDefinitionsAsync(id);

    var response = new FieldDefinitionsResponse
    {
      SchemaStatus = game.SchemaStatus.ToString(),
      Fields = definitions.Select(d => new GameFieldDefinitionDto
      {
        Id = d.Id,
        Key = d.Key,
        Label = d.Label,
        Type = d.Type.ToString(),
        Options = d.Options,
        IsFilterable = d.IsFilterable,
        IsRequired = d.IsRequired,
        SortOrder = d.SortOrder,
        CommonField = d.CommonField
      }).ToList()
    };

    return Ok(response);
  }

  [Authorize]
  [HttpGet("popular")]
  public async Task<IActionResult> GetPopular([FromQuery] int limit = 6)
  {
    if (limit < 1 || limit > 20) limit = 6;
    var result = await _service.GetPopularGames(limit);
    return Ok(result);
  }

  [Authorize]
  [EnableRateLimiting("game-search")]
  [HttpGet("parent-preview")]
  public async Task<IActionResult> GetParentPreview([FromQuery] int externalId)
  {
    var result = await _service.GetParentPreview(externalId);
    if (result == null)
      return NotFound();
    return Ok(result);
  }

}
