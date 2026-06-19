namespace PartyUp.Api.Models;

public class StickerMessage
{
    public Guid Id { get; set; }
    public Guid MatchId { get; set; }
    public CharacterMatch Match { get; set; } = default!;
    public Guid SenderCharacterId { get; set; }
    public Character SenderCharacter { get; set; } = default!;
    public string Emoji { get; set; } = default!;
    public DateTime SentAt { get; set; }
}
