using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs;
using PartyUp.Api.Models.DTOs.UserGame;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/user-games")]
[Authorize]
public class UserGamesController : ControllerBase
{
  private readonly IUserGameService _service;
  private readonly IMatchNotificationService _matchNotifications;

  public UserGamesController(IUserGameService service, IMatchNotificationService matchNotifications)
  {
    _service = service;
    _matchNotifications = matchNotifications;
  }

  [HttpPost]
  public async Task<IActionResult> AddGame([FromBody] AddUserGameRequest request)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    try
    {
      var result = await _service.AddGameToUser(userId, request);
      var ug = result.UserGame;
      return Ok(new
      {
        userGame = new UserGameResponse
        {
          Id = ug.Id,
          UserId = ug.UserId,
          GameId = ug.GameId,
          GameName = ug.Game.Name,
          GameImageUrl = ug.Game.ImageUrl,
          CreatedAt = ug.CreatedAt,
          NewMatchCount = 0
        },
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
  public async Task<IActionResult> GetUserGames([FromQuery] int page = 1, [FromQuery] int pageSize = 12)
  {
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 50) pageSize = 12;

    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var result = await _service.GetUserGames(userId, page, pageSize);
    var ids = result.Items.Select(g => g.Id).ToList();
    var counts = await _matchNotifications.GetNewMatchCountsByUserGameAsync(userId, ids);

    var items = result.Items.Select(g =>
    {
      g.NewMatchCount = counts.GetValueOrDefault(g.Id, 0);
      return g;
    });
    return Ok(new PagedResult<UserGameResponse>(items, result.TotalCount, result.Page, result.PageSize));
  }

  [HttpGet("{gameId}/game")]
  public async Task<IActionResult> GetUserGameByGameId(Guid gameId)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var userGame = await _service.GetUserGameByGameId(userId, gameId);
    if (userGame == null)
      return NotFound();
    return Ok(userGame);
  }

  [HttpDelete("{id}")]
  public async Task<IActionResult> DeleteUserGame(Guid id)
  {
    if (this.GetUserId() is not Guid userId) return Unauthorized();
    var deleted = await _service.DeleteUserGame(id, userId);
    if (!deleted)
      return NotFound();
    return NoContent();
  }
}
