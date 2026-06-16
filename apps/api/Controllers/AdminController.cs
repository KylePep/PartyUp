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
}
