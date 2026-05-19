namespace PartyUp.Api.Models.DTOs.Game;

public class GameFieldDefinitionDto
{
    public Guid Id { get; set; }
    public string Key { get; set; } = default!;
    public string Label { get; set; } = default!;
    public string Type { get; set; } = default!;
    public List<string> Options { get; set; } = [];
    public bool IsFilterable { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
}
