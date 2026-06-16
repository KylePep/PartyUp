using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs;
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
  public async Task<ActionResult<PagedResult<CharacterResponse>>> GetMyCharacters(
      [FromQuery] int page = 1,
      [FromQuery] int pageSize = 12)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var result = await _characterService.GetAllCharactersForUserAsync(userId, page, pageSize);
    return Ok(result);
  }

  [HttpGet("{userGameId}/userGame")]
  public async Task<IActionResult> GetMyCharacterByUserGameId(Guid userGameId)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var result = await _characterService.GetCharactersForUserGameAsync(userId, userGameId);
    return Ok(result);
  }

  [HttpGet("{id}")]
  public async Task<IActionResult> GetMyCharacterById(Guid id)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var result = await _characterService.GetCharacterByIdAsync(userId, id);
    return result is null ? NotFound() : Ok(result);
  }

  [HttpPost]
  public async Task<IActionResult> CreateCharacter([FromBody] CreateCharacterRequest request)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    try
    {
      var result = await _characterService.CreateCharacterAsync(userId, request.UserGameId, request);

      if (result == null)
        return NotFound("UserGame not found or does not belong to you.");

      return CreatedAtAction(nameof(GetMyCharacters), result);
    }
    catch (InvalidOperationException ex)
    {
      return Conflict(new { message = ex.Message });
    }
  }

  private static readonly Dictionary<string, string> AllowedImageTypes = new()
  {
      ["image/jpeg"] = ".jpg",
      ["image/png"] = ".png",
      ["image/webp"] = ".webp"
  };

  [HttpPost("image")]
  [RequestSizeLimit(5_242_880)] // 5 MB
  public async Task<IActionResult> UploadImage(IFormFile file)
  {
    if (file == null || file.Length == 0)
      return BadRequest("No file provided.");

    if (!AllowedImageTypes.TryGetValue(file.ContentType, out var extension))
      return BadRequest("Only JPEG, PNG, and WebP images are allowed.");

    var objectName = $"characters/{Guid.NewGuid()}{extension}";
    using var stream = file.OpenReadStream();
    var url = await _gcs.UploadAsync(stream, file.ContentType, objectName);
    return Ok(new UploadImageResponse { Url = url });
  }

  [HttpPut("{userGameId}/{id}")]
  public async Task<IActionResult> UpdateCharacter(Guid userGameId, Guid id, [FromBody] UpdateCharacterRequest request)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var updated = await _characterService.UpdateCharacterAsync(userId, userGameId, id, request);
    return updated ? NoContent() : NotFound();
  }

  [HttpDelete("{userGameId}/{id}")]
  public async Task<IActionResult> DeleteCharacter(Guid userGameId, Guid id)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var deleted = await _characterService.DeleteCharacterAsync(userId, userGameId, id);
    return deleted ? NoContent() : NotFound();
  }

  [HttpGet("discover")]
  public async Task<IActionResult> Discover(
    [FromQuery] Guid gameId,
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 20)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var platformFilters = Request.Query["platform"]
      .Where(v => v != null).Select(v => v!).ToList();
    var filters = Request.Query
      .Where(kv => kv.Key != "gameId" && kv.Key != "platform" && kv.Key != "page" && kv.Key != "pageSize")
      .ToDictionary(kv => kv.Key, kv => kv.Value.ToString());
    var result = await _characterService.DiscoverCharactersAsync(userId, gameId, filters, platformFilters, page, pageSize);
    return Ok(result);
  }
}
