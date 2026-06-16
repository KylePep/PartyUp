using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models.DTOs.Admin;
using PartyUp.Api.Services.Interfaces;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("games")]
    public async Task<IActionResult> GetGames()
    {
        var games = await _db.Games
            .OrderBy(g => g.Name)
            .Select(g => new AdminGameResponse
            {
                Id = g.Id,
                Name = g.Name,
                ImageUrl = g.ImageUrl,
                SchemaStatus = g.SchemaStatus.ToString(),
                FieldDefinitionCount = g.FieldDefinitions.Count
            })
            .ToListAsync();

        return Ok(games);
    }

    [HttpPost("games/{id:guid}/regenerate-schema")]
    public async Task<IActionResult> RegenerateSchema(Guid id, [FromServices] IServiceScopeFactory scopeFactory)
    {
        var game = await _db.Games.FindAsync(id);
        if (game == null)
            return NotFound();

        _ = Task.Run(async () =>
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            try
            {
                var generator = scope.ServiceProvider.GetRequiredService<IGameSchemaGenerationService>();
                await generator.GenerateForGameAsync(id, force: true);
            }
            catch (Exception ex)
            {
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<AdminController>>();
                logger.LogError(ex, "Admin schema generation failed for game {GameId}", id);
            }
        });

        return Accepted();
    }
}
