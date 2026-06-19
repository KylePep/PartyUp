namespace PartyUp.Api.Models.DTOs.StickerMessage;

public class StickerMessageDto
{
    public Guid Id { get; set; }
    public Guid MatchId { get; set; }
    public Guid SenderCharacterId { get; set; }
    public string Emoji { get; set; } = default!;
    public DateTime SentAt { get; set; }
}
