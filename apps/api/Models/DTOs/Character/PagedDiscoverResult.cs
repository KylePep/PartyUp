namespace PartyUp.Api.Models.DTOs.Character;

public class PagedDiscoverResult
{
    public List<DiscoverCharacterResponse> Items { get; set; } = [];
    public bool HasMore { get; set; }
    public int TotalCount { get; set; }
}
