namespace PartyUp.Api.Models.DTOs.CharacterMatch;

public class CharacterMatchDto
{
    public Guid MatchId { get; set; }
    public DateTime MatchedAt { get; set; }
    public CharacterSummaryDto MyCharacter { get; set; } = default!;
    public CharacterSummaryDto TheirCharacter { get; set; } = default!;
    public Guid GameId { get; set; }
    public string GameName { get; set; } = default!;
}

public class CharacterSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? Bio { get; set; }
    public string? Playstyle { get; set; }
    public string? Rank { get; set; }
    public string? Region { get; set; }
}
