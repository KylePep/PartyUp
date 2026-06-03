using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace PartyUp.Api.Hubs;

public class UserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User?.FindFirstValue(ClaimTypes.NameIdentifier);
}
