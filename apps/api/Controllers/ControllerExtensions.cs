using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

public static class ControllerExtensions
{
    public static Guid? GetUserId(this ControllerBase controller)
    {
        var claim = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return claim != null ? Guid.Parse(claim) : null;
    }
}
