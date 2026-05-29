using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models;
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
    try
    {
      var result = await _service.AddGameToUser(userId, request);
      return Ok(new
      {
        userGame = ToResponse(result.UserGame),
        redirected = result.Redirected,
        message = result.Message
      });
    }
    catch (InvalidOperationException ex)
    {
      return Conflict(new { message = ex.Message });
    }
  }

  [HttpGet]
  public async Task<IActionResult> GetUserGames()
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var games = await _service.GetUserGames(userId);
    return Ok(games.Select(ToResponse));
  }

  [HttpGet("{gameId}/game")]
  public async Task<IActionResult> GetUserGameByGameId(Guid gameId)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var userGame = await _service.GetUserGameByGameId(userId, gameId);
    if (userGame == null)
      return NotFound();
    return Ok(ToDetailResponse(userGame));
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

  private static UserGameResponse ToResponse(UserGame ug) => new()
  {
    Id = ug.Id,
    UserId = ug.UserId,
    GameId = ug.GameId,
    GameName = ug.Game.Name,
    GameImageUrl = ug.Game.ImageUrl,
    CreatedAt = ug.CreatedAt
  };

  private static UserGameDetailResponse ToDetailResponse(UserGame ug) => new()
  {
    Id = ug.Id,
    UserId = ug.UserId,
    GameId = ug.GameId,
    GameName = ug.Game.Name,
    GameImageUrl = ug.Game.ImageUrl,
    Description = ug.Game.Description,
    Website = ug.Game.Website,
    Rating = ug.Game.Rating,
    Platforms = ug.Game.Platforms
  };
}
