using PartyUp.Api.Models.Enums;

namespace PartyUp.Api.Models;

public class GameFieldDefinition
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GameId { get; set; }
    public string Key { get; set; } = default!;
    public string Label { get; set; } = default!;
    public FieldType Type { get; set; }
    public List<string> Options { get; set; } = [];
    public bool IsFilterable { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
    public string? CommonField { get; set; }
}
