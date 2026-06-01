# User Profile & Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `UserProfile` model (display name + JSONB preferences), rename `Username` → `Email` on `User`, expose profile/password endpoints, and build a settings page in the existing settings tab.

**Architecture:** `User` stays auth-only (email + password hash). A 1:1 `UserProfile` table owns display name and a typed JSONB `UserPreferences` blob. Three new API endpoints handle profile reads/writes; password change lives in `AuthController`. The frontend settings page uses `BinderLayout` with account/security on the left and preferences on the right.

**Tech Stack:** ASP.NET Core 8, EF Core + Npgsql, BCrypt.Net, xUnit + FluentAssertions (tests), React + TypeScript + Vite, Tailwind CSS

---

## File Map

### Backend — Modified
- `apps/api/Models/User.cs` — rename `Username` → `Email`
- `apps/api/Models/DTOs/Auth/AuthResponse.cs` — rename `Username` → `Email`
- `apps/api/Models/DTOs/Auth/RegisterRequest.cs` — rename + add `[EmailAddress]`
- `apps/api/Models/DTOs/Auth/LoginRequest.cs` — rename `Username` → `Email`
- `apps/api/Services/Interfaces/IAuthService.cs` — rename params, add `GetByIdAsync`, add `ChangePasswordAsync`
- `apps/api/Services/AuthService.cs` — rename references, create `UserProfile` on register, implement new methods
- `apps/api/Controllers/AuthController.cs` — rename references, update `/me`, add `PUT /password`, inject `IProfileService`
- `apps/api/Infrastructure/Data/DbContext.cs` — add `UserProfiles` DbSet + JSONB configuration
- `apps/api/Program.cs` — register `IProfileService`

### Backend — New
- `apps/api/Models/UserPreferences.cs`
- `apps/api/Models/UserProfile.cs`
- `apps/api/Models/DTOs/Auth/ChangePasswordRequest.cs`
- `apps/api/Models/DTOs/Profile/ProfileResponse.cs`
- `apps/api/Models/DTOs/Profile/UpdateProfileRequest.cs`
- `apps/api/Models/DTOs/Profile/UpdatePreferencesRequest.cs`
- `apps/api/Services/Interfaces/IProfileService.cs`
- `apps/api/Services/ProfileService.cs`
- `apps/api/Controllers/ProfileController.cs`

### Migration — Auto-generated
- `apps/api/Migrations/<timestamp>_AddUserProfile.cs`

### Tests — Modified
- `apps/tests/PartyUp.Api.Tests/Features/Auth/AuthTests.cs` — update `username` → `email` in all payloads
- `apps/tests/PartyUp.Api.Tests/Infrastructure/TestBase.cs` — rename param + JSON body

### Tests — New
- `apps/tests/PartyUp.Api.Tests/Features/Auth/PasswordChangeTests.cs`
- `apps/tests/PartyUp.Api.Tests/Features/Profile/ProfileTests.cs`

### Frontend — Modified
- `apps/web/src/api/client.ts` — add `apiPatch`, fix `clearAuth` (remove `username` key)
- `apps/web/src/api/endpoints/auth.ts` — rename `username` → `email`, add profile types, add `changePassword`
- `apps/web/src/context/AuthContext.tsx` — rename `username` → `email`, add `profile` to `CurrentUser`
- `apps/web/src/pages/LandingPage.tsx` — update `login(username, token)` → `login(email, token)` call site
- `apps/web/src/App.tsx` — add `/settings` route

### Frontend — New
- `apps/web/src/api/endpoints/profileEndpoints.ts`
- `apps/web/src/hooks/useProfile.ts`
- `apps/web/src/pages/SettingsPage.tsx`

---

## Task 1: Rename Username → Email (Backend)

**Files:**
- Modify: `apps/api/Models/User.cs`
- Modify: `apps/api/Models/DTOs/Auth/AuthResponse.cs`
- Modify: `apps/api/Models/DTOs/Auth/RegisterRequest.cs`
- Modify: `apps/api/Models/DTOs/Auth/LoginRequest.cs`
- Modify: `apps/api/Services/Interfaces/IAuthService.cs`
- Modify: `apps/api/Services/AuthService.cs`
- Modify: `apps/api/Controllers/AuthController.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/Auth/AuthTests.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Infrastructure/TestBase.cs`

- [ ] **Step 1: Update User model**

Replace entire `apps/api/Models/User.cs`:

```csharp
namespace PartyUp.Api.Models;

public class User
{
  public Guid Id { get; set; }
  public string Email { get; set; } = string.Empty;
  public string PasswordHash { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Update Auth DTOs**

Replace `apps/api/Models/DTOs/Auth/AuthResponse.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Auth;

public class AuthResponse
{
  public string Token { get; set; } = string.Empty;
  public string Email { get; set; } = string.Empty;
}
```

Replace `apps/api/Models/DTOs/Auth/RegisterRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.Auth;

public class RegisterRequest
{
    [Required]
    [EmailAddress]
    [StringLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}
```

Replace `apps/api/Models/DTOs/Auth/LoginRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.Auth;

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
```

- [ ] **Step 3: Update IAuthService**

Replace `apps/api/Services/Interfaces/IAuthService.cs`:

```csharp
using PartyUp.Api.Models;

public interface IAuthService
{
  Task<User?> Register(string email, string password);
  Task<string?> Login(string email, string password, IConfiguration config);
  Task<User?> GetByIdAsync(Guid userId);
  Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
}
```

- [ ] **Step 4: Update AuthService**

Replace entire `apps/api/Services/AuthService.cs`:

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PartyUp.Api.Models;
using PartyUp.Api.Infrastructure.Data;

public class AuthService : IAuthService
{
  private readonly AppDbContext _context;

  public AuthService(AppDbContext context)
  {
    _context = context;
  }

  public async Task<User?> Register(string email, string password)
  {
    var exists = await _context.Users.AnyAsync(x => x.Email == email);
    if (exists) return null;

    var user = new User
    {
      Email = email,
      PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
    };

    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    return user;
  }

  public async Task<string?> Login(string email, string password, IConfiguration config)
  {
    var user = await _context.Users.FirstOrDefaultAsync(x => x.Email == email);
    if (user == null) return null;

    var valid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
    if (!valid) return null;

    return GenerateJwt(user, config);
  }

  public async Task<User?> GetByIdAsync(Guid userId)
  {
    return await _context.Users.FindAsync(userId);
  }

  public async Task<bool> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
  {
    var user = await _context.Users.FindAsync(userId);
    if (user == null) return false;

    var valid = BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash);
    if (!valid) return false;

    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
    await _context.SaveChangesAsync();
    return true;
  }

  private string GenerateJwt(User user, IConfiguration config)
  {
    var key = new SymmetricSecurityKey(
      Encoding.UTF8.GetBytes(config["Jwt:key"]!)
    );

    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    var claims = new[]
    {
      new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
      new Claim(ClaimTypes.Name, user.Email)
    };

    var token = new JwtSecurityToken(
      issuer: config["Jwt:Issuer"],
      audience: config["Jwt:Audience"],
      claims: claims,
      expires: DateTime.UtcNow.AddHours(2),
      signingCredentials: creds
    );

    return new JwtSecurityTokenHandler().WriteToken(token);
  }
}
```

- [ ] **Step 5: Update AuthController**

Replace entire `apps/api/Controllers/AuthController.cs` (temporary — `/me` will be updated again in Task 5 once `IProfileService` exists, for now it reads from JWT claims):

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PartyUp.Api.Models.DTOs.Auth;
using System.Security.Claims;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
  private readonly IAuthService _auth;

  public AuthController(IAuthService auth)
  {
    _auth = auth;
  }

  [EnableRateLimiting("auth")]
  [HttpPost("register")]
  public async Task<IActionResult> Register(RegisterRequest request, IConfiguration config)
  {
    var user = await _auth.Register(request.Email, request.Password);
    if (user == null)
      return BadRequest("Email already registered");

    var token = await _auth.Login(request.Email, request.Password, config);
    return Ok(new AuthResponse { Token = token!, Email = user.Email });
  }

  [EnableRateLimiting("auth")]
  [HttpPost("login")]
  public async Task<IActionResult> Login(LoginRequest request, IConfiguration config)
  {
    var token = await _auth.Login(request.Email, request.Password, config);
    if (token == null)
      return Unauthorized();

    return Ok(new AuthResponse { Token = token, Email = request.Email });
  }

  [Authorize]
  [HttpGet("me")]
  public async Task<IActionResult> Me()
  {
    var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (idClaim == null) return Unauthorized();

    var userId = Guid.Parse(idClaim);
    var user = await _auth.GetByIdAsync(userId);
    if (user == null) return Unauthorized();

    return Ok(new { id = user.Id, email = user.Email, profile = (object?)null });
  }
}
```

- [ ] **Step 6: Update AuthTests**

Replace entire `apps/tests/PartyUp.Api.Tests/Features/Auth/AuthTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Auth;

public class AuthTests : TestBase, IClassFixture<ApiFactory>
{
    public AuthTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task Register_ReturnsToken()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "test@example.com",
            password = "Password123!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AuthResult>();
        auth!.Token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "test@example.com",
            password = "Password123!"
        });

        var response = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "test@example.com",
            password = "WrongPassword!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ReturnsBadRequest()
    {
        await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "dupe@example.com",
            password = "Password123!"
        });

        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "dupe@example.com",
            password = "Password123!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Me_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Register_WithShortPassword_ReturnsBadRequest()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "valid@example.com",
            password = "abc"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_WithInvalidEmail_ReturnsBadRequest()
    {
        var response = await Client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "not-an-email",
            password = "ValidPass1!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private record AuthResult(string Token, string Email);
}
```

- [ ] **Step 7: Update TestBase**

Replace entire `apps/tests/PartyUp.Api.Tests/Infrastructure/TestBase.cs`:

```csharp
using System.Net.Http.Headers;
using System.Net.Http.Json;
using PartyUp.Api.Tests.Factories;

namespace PartyUp.Api.Tests.Infrastructure;

public abstract class TestBase : IAsyncLifetime
{
    protected readonly ApiFactory Factory;
    protected readonly HttpClient Client;

    protected TestBase(ApiFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
    }

    public async Task InitializeAsync() => await DatabaseReset.ResetAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    protected async Task<HttpClient> CreateAuthenticatedClientAsync(
        string? email = null,
        string password = "Password123!")
    {
        email ??= $"user_{Guid.NewGuid():N}@test.com";

        var client = Factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            password
        });
        response.EnsureSuccessStatusCode();

        var auth = await response.Content.ReadFromJsonAsync<AuthResult>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", auth!.Token);

        return client;
    }

    private record AuthResult(string Token, string Email);
}
```

- [ ] **Step 8: Run all existing tests to verify they pass**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AuthTests" -v
```

Expected: All 6 auth tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/api/Models/User.cs \
  apps/api/Models/DTOs/Auth/AuthResponse.cs \
  apps/api/Models/DTOs/Auth/RegisterRequest.cs \
  apps/api/Models/DTOs/Auth/LoginRequest.cs \
  apps/api/Services/Interfaces/IAuthService.cs \
  apps/api/Services/AuthService.cs \
  apps/api/Controllers/AuthController.cs \
  apps/tests/PartyUp.Api.Tests/Features/Auth/AuthTests.cs \
  apps/tests/PartyUp.Api.Tests/Infrastructure/TestBase.cs
git commit -m "refactor: rename Username to Email on User model and auth flow"
```

---

## Task 2: Add UserProfile Model + Migration

**Files:**
- Create: `apps/api/Models/UserPreferences.cs`
- Create: `apps/api/Models/UserProfile.cs`
- Modify: `apps/api/Infrastructure/Data/DbContext.cs`

- [ ] **Step 1: Create UserPreferences class**

Create `apps/api/Models/UserPreferences.cs`:

```csharp
namespace PartyUp.Api.Models;

public class UserPreferences
{
    public bool DarkMode { get; set; } = false;
    public bool NotificationsEnabled { get; set; } = false;
}
```

- [ ] **Step 2: Create UserProfile model**

Create `apps/api/Models/UserProfile.cs`:

```csharp
namespace PartyUp.Api.Models;

public class UserProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string? DisplayName { get; set; }
    public UserPreferences Preferences { get; set; } = new();
}
```

- [ ] **Step 3: Update DbContext**

Add `UserProfiles` DbSet after `Users` on line 16:

```csharp
public DbSet<UserProfile> UserProfiles { get; set; }
```

Add at the end of `OnModelCreating`, before the closing brace:

```csharp
var preferencesComparer = new ValueComparer<UserPreferences>(
    (a, b) => JsonSerializer.Serialize(a, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(b, (JsonSerializerOptions?)null),
    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null).GetHashCode(),
    v => JsonSerializer.Deserialize<UserPreferences>(JsonSerializer.Serialize(v, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)!);

modelBuilder.Entity<UserProfile>(e =>
{
    e.HasOne(p => p.User)
        .WithOne()
        .HasForeignKey<UserProfile>(p => p.UserId)
        .OnDelete(DeleteBehavior.Cascade);

    e.HasIndex(p => p.UserId).IsUnique();

    e.Property(p => p.DisplayName).HasMaxLength(50);

    e.Property(p => p.Preferences)
        .HasConversion(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<UserPreferences>(v, (JsonSerializerOptions?)null) ?? new UserPreferences())
        .HasColumnType("jsonb")
        .Metadata.SetValueComparer(preferencesComparer);
});
```

Also add `using PartyUp.Api.Models;` at the top of DbContext.cs if `UserPreferences` is not already resolved (it should be, since it's in the same namespace as other models already imported).

- [ ] **Step 4: Generate migration**

```bash
dotnet ef migrations add AddUserProfile --project apps/api
```

Expected: New migration file created in `apps/api/Migrations/`.

- [ ] **Step 5: Apply migration**

```bash
dotnet ef database update --project apps/api
```

Expected: `Done.`

- [ ] **Step 6: Commit**

```bash
git add apps/api/Models/UserPreferences.cs \
  apps/api/Models/UserProfile.cs \
  apps/api/Infrastructure/Data/DbContext.cs \
  apps/api/Migrations/
git commit -m "feat: add UserProfile model with JSONB preferences"
```

---

## Task 3: Create UserProfile on Registration

**Files:**
- Modify: `apps/api/Services/AuthService.cs`

- [ ] **Step 1: Update Register method to create UserProfile**

In `AuthService.cs`, replace the `Register` method:

```csharp
public async Task<User?> Register(string email, string password)
{
    var exists = await _context.Users.AnyAsync(x => x.Email == email);
    if (exists) return null;

    var user = new User
    {
        Email = email,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(password)
    };

    _context.Users.Add(user);
    await _context.SaveChangesAsync();

    var profile = new UserProfile { UserId = user.Id };
    _context.UserProfiles.Add(profile);
    await _context.SaveChangesAsync();

    return user;
}
```

- [ ] **Step 2: Run auth tests to verify registration still works**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~AuthTests" -v
```

Expected: All 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/api/Services/AuthService.cs
git commit -m "feat: create UserProfile automatically on user registration"
```

---

## Task 4: Write Failing Profile Integration Tests

**Files:**
- Create: `apps/tests/PartyUp.Api.Tests/Features/Profile/ProfileTests.cs`

- [ ] **Step 1: Create test file**

Create `apps/tests/PartyUp.Api.Tests/Features/Profile/ProfileTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Profile;

public class ProfileTests : TestBase, IClassFixture<ApiFactory>
{
    public ProfileTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task GetProfile_ReturnsDefaultProfile()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.GetAsync("/api/profile");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await response.Content.ReadFromJsonAsync<ProfileResult>();
        profile!.DisplayName.Should().BeNull();
        profile.Preferences.Should().NotBeNull();
        profile.Preferences!.DarkMode.Should().BeFalse();
        profile.Preferences.NotificationsEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task GetProfile_WithoutAuth_Returns401()
    {
        var response = await Client.GetAsync("/api/profile");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateProfile_SetsDisplayName()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PatchAsJsonAsync("/api/profile", new
        {
            displayName = "Kyle"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await response.Content.ReadFromJsonAsync<ProfileResult>();
        profile!.DisplayName.Should().Be("Kyle");
    }

    [Fact]
    public async Task UpdateProfile_WithInvalidEmail_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PatchAsJsonAsync("/api/profile", new
        {
            email = "not-an-email"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateProfile_WithDuplicateEmail_Returns400()
    {
        await CreateAuthenticatedClientAsync(email: "existing@example.com");
        var client = await CreateAuthenticatedClientAsync(email: "other@example.com");

        var response = await client.PatchAsJsonAsync("/api/profile", new
        {
            email = "existing@example.com"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdatePreferences_SetsDarkMode()
    {
        var client = await CreateAuthenticatedClientAsync();

        var response = await client.PatchAsJsonAsync("/api/profile/preferences", new
        {
            darkMode = true
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var prefs = await response.Content.ReadFromJsonAsync<PreferencesResult>();
        prefs!.DarkMode.Should().BeTrue();
        prefs.NotificationsEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task UpdatePreferences_WithoutAuth_Returns401()
    {
        var response = await Client.PatchAsJsonAsync("/api/profile/preferences", new
        {
            darkMode = true
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private record PreferencesResult(bool DarkMode, bool NotificationsEnabled);
    private record ProfileResult(string? DisplayName, PreferencesResult? Preferences);
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~ProfileTests" -v
```

Expected: All 7 tests fail with connection refused or 404 (controller not yet implemented).

---

## Task 5: Implement ProfileService + ProfileController + Update /me

**Files:**
- Create: `apps/api/Models/DTOs/Profile/ProfileResponse.cs`
- Create: `apps/api/Models/DTOs/Profile/UpdateProfileRequest.cs`
- Create: `apps/api/Models/DTOs/Profile/UpdatePreferencesRequest.cs`
- Create: `apps/api/Services/Interfaces/IProfileService.cs`
- Create: `apps/api/Services/ProfileService.cs`
- Create: `apps/api/Controllers/ProfileController.cs`
- Modify: `apps/api/Program.cs`
- Modify: `apps/api/Controllers/AuthController.cs`

- [ ] **Step 1: Create Profile DTOs**

Create `apps/api/Models/DTOs/Profile/ProfileResponse.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Profile;

public class ProfileResponse
{
    public string? DisplayName { get; set; }
    public PreferencesResponse Preferences { get; set; } = new();
}

public class PreferencesResponse
{
    public bool DarkMode { get; set; }
    public bool NotificationsEnabled { get; set; }
}
```

Create `apps/api/Models/DTOs/Profile/UpdateProfileRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.Profile;

public class UpdateProfileRequest
{
    [EmailAddress]
    [StringLength(254)]
    public string? Email { get; set; }

    [StringLength(50)]
    public string? DisplayName { get; set; }
}
```

Create `apps/api/Models/DTOs/Profile/UpdatePreferencesRequest.cs`:

```csharp
namespace PartyUp.Api.Models.DTOs.Profile;

public class UpdatePreferencesRequest
{
    public bool? DarkMode { get; set; }
    public bool? NotificationsEnabled { get; set; }
}
```

- [ ] **Step 2: Create IProfileService**

Create `apps/api/Services/Interfaces/IProfileService.cs`:

```csharp
using PartyUp.Api.Models.DTOs.Profile;

public interface IProfileService
{
    Task<ProfileResponse?> GetProfileAsync(Guid userId);
    Task<(ProfileResponse? Profile, bool EmailConflict)> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<PreferencesResponse?> UpdatePreferencesAsync(Guid userId, UpdatePreferencesRequest request);
}
```

- [ ] **Step 3: Create ProfileService**

Create `apps/api/Services/ProfileService.cs`:

```csharp
using Microsoft.EntityFrameworkCore;
using PartyUp.Api.Infrastructure.Data;
using PartyUp.Api.Models;
using PartyUp.Api.Models.DTOs.Profile;

public class ProfileService : IProfileService
{
    private readonly AppDbContext _context;

    public ProfileService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ProfileResponse?> GetProfileAsync(Guid userId)
    {
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null) return null;

        return ToResponse(profile);
    }

    public async Task<(ProfileResponse? Profile, bool EmailConflict)> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null) return (null, false);

        if (request.Email != null)
        {
            var emailTaken = await _context.Users
                .AnyAsync(u => u.Email == request.Email && u.Id != userId);
            if (emailTaken) return (null, true);

            var user = await _context.Users.FindAsync(userId);
            if (user != null) user.Email = request.Email;
        }

        if (request.DisplayName != null)
            profile.DisplayName = request.DisplayName;

        await _context.SaveChangesAsync();
        return (ToResponse(profile), false);
    }

    public async Task<PreferencesResponse?> UpdatePreferencesAsync(Guid userId, UpdatePreferencesRequest request)
    {
        var profile = await _context.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null) return null;

        profile.Preferences = new UserPreferences
        {
            DarkMode = request.DarkMode ?? profile.Preferences.DarkMode,
            NotificationsEnabled = request.NotificationsEnabled ?? profile.Preferences.NotificationsEnabled
        };

        await _context.SaveChangesAsync();

        return new PreferencesResponse
        {
            DarkMode = profile.Preferences.DarkMode,
            NotificationsEnabled = profile.Preferences.NotificationsEnabled
        };
    }

    private static ProfileResponse ToResponse(PartyUp.Api.Models.UserProfile profile) => new()
    {
        DisplayName = profile.DisplayName,
        Preferences = new PreferencesResponse
        {
            DarkMode = profile.Preferences.DarkMode,
            NotificationsEnabled = profile.Preferences.NotificationsEnabled
        }
    };
}
```

- [ ] **Step 4: Create ProfileController**

Create `apps/api/Controllers/ProfileController.cs`:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PartyUp.Api.Models.DTOs.Profile;
using System.Security.Claims;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var profile = await _profileService.GetProfileAsync(userId);
        if (profile == null) return NotFound();
        return Ok(profile);
    }

    [HttpPatch]
    public async Task<IActionResult> UpdateProfile(UpdateProfileRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var (profile, emailConflict) = await _profileService.UpdateProfileAsync(userId, request);
        if (emailConflict) return BadRequest("Email already registered");
        if (profile == null) return NotFound();
        return Ok(profile);
    }

    [HttpPatch("preferences")]
    public async Task<IActionResult> UpdatePreferences(UpdatePreferencesRequest request)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var preferences = await _profileService.UpdatePreferencesAsync(userId, request);
        if (preferences == null) return NotFound();
        return Ok(preferences);
    }
}
```

- [ ] **Step 5: Register IProfileService in Program.cs**

Add after the `IAuthService` registration line (line 30):

```csharp
builder.Services.AddScoped<IProfileService, ProfileService>();
```

- [ ] **Step 6: Update AuthController.Me() to include profile**

In `apps/api/Controllers/AuthController.cs`, update the constructor to inject `IProfileService` and update the `Me` action:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PartyUp.Api.Models.DTOs.Auth;
using System.Security.Claims;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
  private readonly IAuthService _auth;
  private readonly IProfileService _profileService;

  public AuthController(IAuthService auth, IProfileService profileService)
  {
    _auth = auth;
    _profileService = profileService;
  }

  [EnableRateLimiting("auth")]
  [HttpPost("register")]
  public async Task<IActionResult> Register(RegisterRequest request, IConfiguration config)
  {
    var user = await _auth.Register(request.Email, request.Password);
    if (user == null)
      return BadRequest("Email already registered");

    var token = await _auth.Login(request.Email, request.Password, config);
    return Ok(new AuthResponse { Token = token!, Email = user.Email });
  }

  [EnableRateLimiting("auth")]
  [HttpPost("login")]
  public async Task<IActionResult> Login(LoginRequest request, IConfiguration config)
  {
    var token = await _auth.Login(request.Email, request.Password, config);
    if (token == null)
      return Unauthorized();

    return Ok(new AuthResponse { Token = token, Email = request.Email });
  }

  [Authorize]
  [HttpGet("me")]
  public async Task<IActionResult> Me()
  {
    var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (idClaim == null) return Unauthorized();

    var userId = Guid.Parse(idClaim);
    var user = await _auth.GetByIdAsync(userId);
    if (user == null) return Unauthorized();

    var profile = await _profileService.GetProfileAsync(userId);
    return Ok(new { id = user.Id, email = user.Email, profile });
  }

  [Authorize]
  [EnableRateLimiting("auth")]
  [HttpPut("password")]
  public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var success = await _auth.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
    if (!success)
      return BadRequest("Current password is incorrect");

    return Ok();
  }
}
```

Note: `ChangePasswordRequest` is created in Task 7. For now the file won't compile until that DTO exists — complete Task 6 and 7 before building.

- [ ] **Step 7: Run profile tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~ProfileTests" -v
```

Expected: All 7 profile tests pass.

- [ ] **Step 8: Run all tests to verify nothing broken**

```bash
dotnet test apps/tests/PartyUp.Api.Tests -v
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/api/Models/DTOs/Profile/ \
  apps/api/Services/Interfaces/IProfileService.cs \
  apps/api/Services/ProfileService.cs \
  apps/api/Controllers/ProfileController.cs \
  apps/api/Controllers/AuthController.cs \
  apps/api/Program.cs
git commit -m "feat: add ProfileService and ProfileController with GET/PATCH endpoints"
```

---

## Task 6: Write Failing ChangePassword Tests

**Files:**
- Create: `apps/tests/PartyUp.Api.Tests/Features/Auth/PasswordChangeTests.cs`

- [ ] **Step 1: Create test file**

Create `apps/tests/PartyUp.Api.Tests/Features/Auth/PasswordChangeTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Auth;

public class PasswordChangeTests : TestBase, IClassFixture<ApiFactory>
{
    public PasswordChangeTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task ChangePassword_WithValidCredentials_Returns200()
    {
        var client = await CreateAuthenticatedClientAsync(
            email: "user@example.com",
            password: "OldPassword1!");

        var response = await client.PutAsJsonAsync("/api/auth/password", new
        {
            currentPassword = "OldPassword1!",
            newPassword = "NewPassword2!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync(email: "user@example.com");

        var response = await client.PutAsJsonAsync("/api/auth/password", new
        {
            currentPassword = "WrongPassword!",
            newPassword = "NewPassword2!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ChangePassword_WithoutAuth_Returns401()
    {
        var response = await Client.PutAsJsonAsync("/api/auth/password", new
        {
            currentPassword = "Password123!",
            newPassword = "NewPassword2!"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ChangePassword_NewPasswordTooShort_Returns400()
    {
        var client = await CreateAuthenticatedClientAsync(email: "user@example.com");

        var response = await client.PutAsJsonAsync("/api/auth/password", new
        {
            currentPassword = "Password123!",
            newPassword = "short"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ChangePassword_AfterChange_OldPasswordNoLongerWorks()
    {
        var client = await CreateAuthenticatedClientAsync(
            email: "user@example.com",
            password: "OldPassword1!");

        await client.PutAsJsonAsync("/api/auth/password", new
        {
            currentPassword = "OldPassword1!",
            newPassword = "NewPassword2!"
        });

        var loginResponse = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "user@example.com",
            password = "OldPassword1!"
        });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~PasswordChangeTests" -v
```

Expected: Tests fail — `ChangePasswordRequest` DTO and endpoint don't exist yet.

---

## Task 7: Implement ChangePassword

**Files:**
- Create: `apps/api/Models/DTOs/Auth/ChangePasswordRequest.cs`

(Note: `ChangePasswordAsync` was already added to `IAuthService` and `AuthService` in Task 1, and the `PUT /auth/password` endpoint was added to `AuthController` in Task 5.)

- [ ] **Step 1: Create ChangePasswordRequest DTO**

Create `apps/api/Models/DTOs/Auth/ChangePasswordRequest.cs`:

```csharp
using System.ComponentModel.DataAnnotations;

namespace PartyUp.Api.Models.DTOs.Auth;

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Run ChangePassword tests**

```bash
dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~PasswordChangeTests" -v
```

Expected: All 5 tests pass.

- [ ] **Step 3: Run full test suite**

```bash
dotnet test apps/tests/PartyUp.Api.Tests -v
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/Models/DTOs/Auth/ChangePasswordRequest.cs \
  apps/tests/PartyUp.Api.Tests/Features/Auth/PasswordChangeTests.cs
git commit -m "feat: add ChangePassword endpoint with integration tests"
```

---

## Task 8: Frontend — Update Auth Layer

**Files:**
- Modify: `apps/web/src/api/client.ts`
- Modify: `apps/web/src/api/endpoints/auth.ts`
- Modify: `apps/web/src/context/AuthContext.tsx`

- [ ] **Step 1: Add apiPatch and fix clearAuth in client.ts**

In `apps/web/src/api/client.ts`, update `clearAuth` (line 25-28) to remove `email` key instead of `username`:

```typescript
function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("email");
}
```

Add `apiPatch` after the `apiPut` function (after line 96):

```typescript
export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });

  return handleResponse<T>(res);
}
```

- [ ] **Step 2: Update auth.ts**

Replace entire `apps/web/src/api/endpoints/auth.ts`:

```typescript
import { apiPost, apiGet, apiPut } from "../client";

export type UserPreferences = {
  darkMode: boolean;
  notificationsEnabled: boolean;
};

export type UserProfileData = {
  displayName: string | null;
  preferences: UserPreferences;
};

export type CurrentUser = {
  id: string;
  email: string;
  profile: UserProfileData;
};

export async function login(email: string, password: string): Promise<string> {
  const data = await apiPost<{ token: string }>("/auth/login", { email, password });
  return data.token;
}

export async function register(email: string, password: string): Promise<void> {
  await apiPost("/auth/register", { email, password });
}

export async function getMe(): Promise<CurrentUser> {
  return apiGet<CurrentUser>("/auth/me");
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiPut<void>("/auth/password", { currentPassword, newPassword });
}
```

- [ ] **Step 3: Update AuthContext.tsx**

Replace entire `apps/web/src/context/AuthContext.tsx`:

```typescript
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMe, type CurrentUser } from "../api/endpoints/auth";
import { UnauthorizedError } from "../api/client";

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unreachable" }
  | { status: "unauthenticated" };

type AuthContextValue = {
  state: AuthState;
  login: (email: string, token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    localStorage.getItem("token") ? { status: "loading" } : { status: "unauthenticated" }
  );

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    getMe()
      .then((user) => setState({ status: "authenticated", user }))
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          setState({ status: "unauthenticated" });
        } else {
          setState({ status: "unreachable" });
        }
      });
  }, []);

  async function login(email: string, token: string) {
    localStorage.setItem("token", token);
    try {
      const user = await getMe();
      setState({ status: "authenticated", user });
    } catch (err) {
      localStorage.removeItem("token");
      throw err;
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setState({ status: "unauthenticated" });
  }

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 4: Find and fix all call sites of the old login/register signatures**

Run in the terminal to find all frontend files referencing `username`:

```bash
grep -r "username" apps/web/src --include="*.tsx" --include="*.ts" -l
```

For each file found, update `username` → `email` in the call to `login()` or `register()`. The most common call site is `LandingPage.tsx` — find where it calls `login(username, token)` or `register(username, password)` and update the argument name and any local variable names accordingly.

- [ ] **Step 5: Build the frontend to verify no TypeScript errors**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/api/client.ts \
  apps/web/src/api/endpoints/auth.ts \
  apps/web/src/context/AuthContext.tsx
git add apps/web/src/pages/LandingPage.tsx  # if changed
git commit -m "refactor: rename username to email in frontend auth layer"
```

---

## Task 9: Frontend — Profile Data Layer

**Files:**
- Create: `apps/web/src/api/endpoints/profileEndpoints.ts`
- Create: `apps/web/src/hooks/useProfile.ts`

- [ ] **Step 1: Create profileEndpoints.ts**

Create `apps/web/src/api/endpoints/profileEndpoints.ts`:

```typescript
import { apiGet, apiPatch } from "../client";
import type { UserProfileData, UserPreferences } from "./auth";

export type UpdateProfileRequest = {
  email?: string;
  displayName?: string;
};

export type UpdatePreferencesRequest = {
  darkMode?: boolean;
  notificationsEnabled?: boolean;
};

export async function getProfile(): Promise<UserProfileData> {
  return apiGet<UserProfileData>("/profile");
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfileData> {
  return apiPatch<UserProfileData>("/profile", data);
}

export async function updatePreferences(data: UpdatePreferencesRequest): Promise<UserPreferences> {
  return apiPatch<UserPreferences>("/profile/preferences", data);
}
```

- [ ] **Step 2: Create useProfile.ts**

Create `apps/web/src/hooks/useProfile.ts`:

```typescript
import { useState, useEffect } from "react";
import {
  getProfile,
  updateProfile,
  updatePreferences,
  type UpdateProfileRequest,
  type UpdatePreferencesRequest,
} from "../api/endpoints/profileEndpoints";
import type { UserProfileData, UserPreferences } from "../api/endpoints/auth";

export function useProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleUpdateProfile(data: UpdateProfileRequest): Promise<void> {
    const updated = await updateProfile(data);
    setProfile(updated);
  }

  async function handleUpdatePreferences(data: UpdatePreferencesRequest): Promise<void> {
    const updated = await updatePreferences(data);
    setProfile((prev) => (prev ? { ...prev, preferences: updated } : null));
  }

  return {
    profile,
    isLoading,
    updateProfile: handleUpdateProfile,
    updatePreferences: handleUpdatePreferences,
  };
}
```

- [ ] **Step 3: Build to verify types**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/api/endpoints/profileEndpoints.ts \
  apps/web/src/hooks/useProfile.ts
git commit -m "feat: add profile API endpoints and useProfile hook"
```

---

## Task 10: Frontend — SettingsPage + Route

**Files:**
- Create: `apps/web/src/pages/SettingsPage.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create SettingsPage.tsx**

Create `apps/web/src/pages/SettingsPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import BinderLayout from "../components/layout/BinderLayout";
import { useProfile } from "../hooks/useProfile";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../api/endpoints/auth";
import { HttpError } from "../api/client";

export default function SettingsPage() {
  const { state } = useAuth();
  const { profile, isLoading, updateProfile, updatePreferences } = useProfile();

  const currentEmail =
    state.status === "authenticated" ? state.user.email : "";

  const [email, setEmail] = useState(currentEmail);
  const [displayName, setDisplayName] = useState("");
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
    }
  }, [profile]);

  useEffect(() => {
    setEmail(currentEmail);
  }, [currentEmail]);

  async function handleAccountSave(e: React.FormEvent) {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(false);
    setAccountSaving(true);
    try {
      await updateProfile({
        email: email !== currentEmail ? email : undefined,
        displayName: displayName || undefined,
      });
      setAccountSuccess(true);
    } catch (err) {
      setAccountError(err instanceof HttpError ? err.message : "Failed to save");
    } finally {
      setAccountSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof HttpError ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  const leftContent = (
    <div className="p-6 space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
        <form onSubmit={handleAccountSave} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Optional"
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          {accountError && <p className="text-red-400 text-sm">{accountError}</p>}
          {accountSuccess && <p className="text-green-400 text-sm">Saved</p>}
          <button
            type="submit"
            disabled={accountSaving || isLoading}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded"
          >
            {accountSaving ? "Saving…" : "Save Account"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Security</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-400 text-sm">Password changed</p>}
          <button
            type="submit"
            disabled={passwordSaving}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded"
          >
            {passwordSaving ? "Changing…" : "Change Password"}
          </button>
        </form>
      </section>
    </div>
  );

  const rightContent = (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Preferences</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Dark Mode</p>
            <p className="text-xs text-gray-400">Toggle the app theme</p>
          </div>
          <button
            role="switch"
            aria-checked={profile?.preferences.darkMode ?? false}
            onClick={() =>
              updatePreferences({ darkMode: !(profile?.preferences.darkMode ?? false) })
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              profile?.preferences.darkMode ? "bg-blue-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                profile?.preferences.darkMode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between opacity-50">
          <div>
            <p className="text-sm text-white">Notifications</p>
            <p className="text-xs text-gray-400">Coming soon</p>
          </div>
          <button
            role="switch"
            aria-checked={false}
            disabled
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600 cursor-not-allowed"
          >
            <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <BinderLayout
      barColor="#374151"
      activeTab="Settings"
      leftContent={leftContent}
      rightContent={rightContent}
    />
  );
}
```

- [ ] **Step 2: Add /settings route to App.tsx**

In `apps/web/src/App.tsx`, add the import after line 10 (the `GamesPage` import):

```typescript
import SettingsPage from "./pages/SettingsPage";
```

Add the route inside `<SignedInLayout>`, after the `/games` route:

```tsx
<Route path="/settings" element={<SettingsPage />} />
```

The `SignedInLayout` routes block should look like:

```tsx
<Route element={<SignedInLayout />}>
  <Route path="/home" element={<HomePage />} />
  <Route path="/realm/:gameId" element={<RealmPage />} />
  <Route path="/characters" element={<CharactersPage />} />
  <Route path="/matches" element={<MatchesPage />} />
  <Route path="/games" element={<GamesPage />} />
  <Route path="/settings" element={<SettingsPage />} />
</Route>
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
npm run build --prefix apps/web
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/SettingsPage.tsx \
  apps/web/src/App.tsx
git commit -m "feat: add SettingsPage with account, security, and preferences sections"
```

---

## Self-Review Notes

- **Spec coverage:** All requirements covered — email rename, UserProfile 1:1 model, JSONB preferences, GET/PATCH /api/profile, PATCH /api/profile/preferences, PUT /api/auth/password, SettingsPage with BinderLayout activeTab="Settings", left=account+security, right=preferences.
- **TDD:** Profile tests written in Task 4 before implementation in Task 5. ChangePassword tests written in Task 6 before DTO added in Task 7. Auth rename tests updated before running.
- **Type consistency:** `UserProfileData` used in auth.ts matches `UserProfile` response shape from backend (`displayName`, `preferences`). `PreferencesResponse` backend type maps to `UserPreferences` frontend type. `ProfileResponse` → `UserProfileData` shape is consistent throughout.
- **No placeholders:** All steps contain complete code.
