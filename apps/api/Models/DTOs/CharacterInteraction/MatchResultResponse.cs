namespace PartyUp.Api.Models.DTOs.CharacterInteraction;

public class MatchResultResponse
{
    public bool IsMatch { get; set; }
    public Guid? MatchId { get; set; }
    public MatchCharacterPayload? MyCharacter { get; set; }
    public MatchCharacterPayload? TheirCharacter { get; set; }
    public string? GameName { get; set; }
    public DateTime? MatchedAt { get; set; }
}

public class MatchCharacterPayload
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? ImageUrl { get; set; }
}
