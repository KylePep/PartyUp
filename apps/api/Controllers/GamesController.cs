using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.Game;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/games")]
public class GamesController : ControllerBase
{
  private readonly IGameService _service;
  private readonly IGameFieldDefinitionService _fieldDefinitionService;
  private readonly IServiceScopeFactory _scopeFactory;

  public GamesController(IGameService service, IGameFieldDefinitionService fieldDefinitionService, IServiceScopeFactory scopeFactory)
  {
    _service = service;
    _fieldDefinitionService = fieldDefinitionService;
    _scopeFactory = scopeFactory;
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
        SortOrder = d.SortOrder
      }).ToList()
    };

    return Ok(response);
  }

  [Authorize]
  [HttpPost("{id:guid}/regenerate-schema")]
  public async Task<IActionResult> RegenerateSchema(Guid id)
  {
    var game = await _service.GetGameByDbId(id);
    if (game == null)
      return NotFound();

    _ = Task.Run(async () =>
    {
      await using var scope = _scopeFactory.CreateAsyncScope();
      var generator = scope.ServiceProvider.GetRequiredService<IGameSchemaGenerationService>();
      await generator.GenerateForGameAsync(id);
    });

    return Accepted();
  }
}
