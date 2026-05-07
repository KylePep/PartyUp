using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models.DTOs.CharacterMatch;

namespace PartyUp.Api.Services;

public class CharacterMatchService : ICharacterMatchService
{
    private readonly AppDbContext _db;

    public CharacterMatchService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<CharacterMatchDto>> GetMatchesAsync(Guid userId, Guid? gameId)
    {
        var query = _db.CharacterMatches
            .Include(m => m.CharacterA).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Include(m => m.CharacterB).ThenInclude(c => c.UserGame).ThenInclude(ug => ug.Game)
            .Where(m =>
                m.CharacterA.UserGame.UserId == userId ||
                m.CharacterB.UserGame.UserId == userId);

        if (gameId.HasValue)
            query = query.Where(m =>
                (m.CharacterA.UserGame.UserId == userId && m.CharacterA.UserGame.GameId == gameId.Value) ||
                (m.CharacterB.UserGame.UserId == userId && m.CharacterB.UserGame.GameId == gameId.Value));

        var matches = await query.ToListAsync();

        return matches.Select(m =>
        {
            var isMineA = m.CharacterA.UserGame.UserId == userId;
            var mine = isMineA ? m.CharacterA : m.CharacterB;
            var theirs = isMineA ? m.CharacterB : m.CharacterA;

            return new CharacterMatchDto
            {
                MatchId = m.Id,
                MatchedAt = m.MatchedAt,
                MyCharacter = ToSummary(mine),
                TheirCharacter = ToSummary(theirs),
                GameId = mine.UserGame.GameId,
                GameName = mine.UserGame.Game.Name
            };
        }).ToList();
    }

    private static CharacterSummaryDto ToSummary(PartyUp.Api.Models.Character c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Bio = c.Bio,
        Playstyle = c.Playstyle,
        Rank = c.Rank,
        Region = c.Region
    };
}
