using PartyUp.Api.Models.DTOs.Character;

namespace PartyUp.Api.Models.DTOs.CharacterMatch;

public class CharacterMatchDto
{
    public Guid MatchId { get; set; }
    public DateTime MatchedAt { get; set; }
    public CharacterSummaryDto MyCharacter { get; set; } = default!;
    public CharacterResponse TheirCharacter { get; set; } = default!;
    public Guid GameId { get; set; }
    public string GameName { get; set; } = default!;
    public string? GameImageUrl { get; set; }
    public bool IsNew { get; set; }
}

public class CharacterSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? ImageUrl { get; set; }
    public string? Bio { get; set; }
    public string? AdditionalNotes { get; set; }
    public string PlatformHandle { get; set; } = default!;
    public List<CharacterFieldValueDto> GameFields { get; set; } = [];
}
