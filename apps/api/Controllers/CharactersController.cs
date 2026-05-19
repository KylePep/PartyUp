using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.Character;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/characters")]
[Authorize]
public class CharactersController : ControllerBase
{
  private readonly ICharacterService _characterService;
  private readonly IGcsStorageService _gcs;

  public CharactersController(ICharacterService characterService, IGcsStorageService gcs)
  {
    _characterService = characterService;
    _gcs = gcs;
  }

  [HttpGet]
  public async Task<IActionResult> GetMyCharacters()
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _characterService.GetAllCharactersForUserAsync(userId);
    return Ok(result);
  }

  [HttpGet("{userGameId}/userGame")]
  public async Task<IActionResult> GetMyCharacterByUserGameId(Guid userGameId)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _characterService.GetCharactersForUserGameAsync(userId, userGameId);
    return Ok(result);
  }

  [HttpPost]
  public async Task<IActionResult> CreateCharacter([FromBody] CreateCharacterRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var result = await _characterService.CreateCharacterAsync(userId, request.UserGameId, request);

    if (result == null)
      return NotFound("UserGame not found or does not belong to you.");

    return CreatedAtAction(nameof(GetMyCharacters), result);
  }

  [HttpPost("image")]
  public async Task<IActionResult> UploadImage(IFormFile file)
  {
    if (file == null || file.Length == 0)
      return BadRequest("No file provided.");

    var objectName = $"characters/{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
    using var stream = file.OpenReadStream();
    var url = await _gcs.UploadAsync(stream, file.ContentType, objectName);
    return Ok(new UploadImageResponse { Url = url });
  }

  [HttpGet("discover")]
  public async Task<IActionResult> Discover([FromQuery] Guid gameId)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var filters = Request.Query
      .Where(kv => kv.Key != "gameId")
      .ToDictionary(kv => kv.Key, kv => kv.Value.ToString());
    var result = await _characterService.DiscoverCharactersAsync(userId, gameId, filters);
    return Ok(result);
  }
}
