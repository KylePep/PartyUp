namespace PartyUp.Api.Models.DTOs.Admin;

public class AdminGameResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string SchemaStatus { get; set; } = string.Empty;
    public int FieldDefinitionCount { get; set; }
}
