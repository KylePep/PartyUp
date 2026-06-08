using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.UserGame;

public record AddUserGameRequest(
    [Required] int ExternalId,
    [Required][StringLength(200, MinimumLength = 1)] string Name,
    [StringLength(500)] string? ImageUrl
);
