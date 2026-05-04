namespace PartyUp.Api.Models.DTOs.UserGame;

public record AddUserGameRequest(int ExternalId, string Name, string? ImageUrl);
