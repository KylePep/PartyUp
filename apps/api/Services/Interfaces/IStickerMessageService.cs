using PartyUp.Api.Models.DTOs.StickerMessage;

namespace PartyUp.Api.Services.Interfaces;

public interface IStickerMessageService
{
    Task<List<StickerMessageDto>> GetByMatchAsync(Guid matchId, Guid userId);
    Task<StickerMessageDto> SendAsync(Guid matchId, Guid userId, string emoji);
}
