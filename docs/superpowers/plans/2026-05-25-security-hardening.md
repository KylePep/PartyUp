# PartyUp Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden PartyUp against API abuse, protect RAWG/Anthropic/GCS from unauthenticated or unlimited access, and close the most critical vulnerabilities before a public LinkedIn showcase.

**Architecture:** Add ASP.NET Core 8 built-in rate limiting middleware with per-policy granularity; gate all RAWG-proxy endpoints behind JWT auth; set JWT issuer/audience for tighter token validation; sanitize HTML in the React frontend with DOMPurify; add file-type and size guards on image upload; add data-annotation validation to auth and character DTOs; validate character-interaction ownership server-side.

**Tech Stack:** ASP.NET Core 8 (built-in `Microsoft.AspNetCore.RateLimiting`), React 18 + TypeScript, `dompurify` + `@types/dompurify`, xUnit + FluentAssertions integration tests.

---

## PRE-WORK (Manual — Do This Before Writing Any Code)

> The Anthropic API key `sk-ant-api03-s_WkpEFSE3pbFOwCdNIBHBm1rKE7-...` is committed in git history across 6 commits that have been pushed to `github.com/KylePep/FantaZDB`.

- [ ] **Step 1: Revoke the exposed Anthropic key**

  Go to https://console.anthropic.com → API Keys → delete the key ending in `vzfixwAA`.

- [ ] **Step 2: Generate a new Anthropic API key**

  Copy the new key value. Never paste it into a tracked file.

- [ ] **Step 3: Update the key in your production environment**

  On your EC2 instance, update the environment variable or secrets manager entry that holds `Anthropic:ApiKey`. Do NOT put the new key in `appsettings.Development.json`.

- [ ] **Step 4: Verify the file stays gitignored**

  `appsettings.Development.json` is already in `.gitignore` (line 48). Confirm the file does not appear in `git status` output. If it does, run:
  ```bash
  git rm --cached apps/api/appsettings.Development.json
  ```

- [ ] **Step 5: Create branch for implementation**
  ```bash
  git checkout -b feat-security-hardening
  ```

---

## File Map

| File | Change |
|------|--------|
| `apps/api/Program.cs` | Add rate limiting services + middleware; enable JWT issuer/audience validation |
| `apps/api/appsettings.json` | Add `Jwt:Issuer`, `Jwt:Audience` defaults |
| `apps/api/Services/AuthService.cs` | Set issuer + audience on generated JWT tokens |
| `apps/api/Controllers/GamesController.cs` | Add `[Authorize]` to Search, GetById, GetByDbId, GetFieldDefinitions; add rate-limiting attributes |
| `apps/api/Controllers/AuthController.cs` | Add rate-limiting attribute to login/register |
| `apps/api/Controllers/CharactersController.cs` | Add file-type/size validation to `UploadImage` |
| `apps/api/Controllers/CharacterInteractionController.cs` | Pass `userId` from claims to service |
| `apps/api/Services/Interfaces/ICharacterInteractionService.cs` | Add `userId` param to interface method |
| `apps/api/Services/CharacterInteractionService.cs` | Validate ownership of `FromCharacterId` |
| `apps/api/Models/DTOs/Auth/RegisterRequest.cs` | Add `[Required]`, `[StringLength]` annotations |
| `apps/api/Models/DTOs/Auth/LoginRequest.cs` | Add `[Required]` annotations |
| `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs` | Add `[StringLength]` to string fields |
| `apps/web/src/pages/RealmPage.tsx` | Sanitize `dangerouslySetInnerHTML` with DOMPurify |
| `apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs` | Add `Jwt:Issuer` + `Jwt:Audience` to in-memory config |
| `apps/tests/PartyUp.Api.Tests/Features/Auth/AuthTests.cs` | Add validation tests |
| `apps/tests/PartyUp.Api.Tests/Features/Games/GameSecurityTests.cs` | New: verify game search requires auth |
| `apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/CharacterInteractionTests.cs` | Add ownership test |

---

## Task 1: Rate Limiting Middleware

**Files:**
- Modify: `apps/api/Program.cs`

- [ ] **Step 1: Write the failing test** (rate limit on login)

  Add to `apps/tests/PartyUp.Api.Tests/Features/Auth/AuthTests.cs`:

  ```csharp
  [Fact]
  public async Task Login_ExceedingRateLimit_Returns429()
  {
      // Send 6 login attempts rapidly — limit is 5/min per IP
      HttpResponseMessage? last = null;
      for (int i = 0; i < 6; i++)
      {
          last = await Client.PostAsJsonAsync("/api/auth/login", new
          {
              username = "nonexistent",
              password = "wrong"
          });
      }
      last!.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
  }
  ```

- [ ] **Step 2: Run test to confirm it fails**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~Login_ExceedingRateLimit"
  ```

  Expected: FAIL — the 6th request returns 401 (not 429) because rate limiting doesn't exist yet.

- [ ] **Step 3: Add rate limiting to Program.cs**

  Add these usings at the top of `apps/api/Program.cs`:
  ```csharp
  using System.Threading.RateLimiting;
  using Microsoft.AspNetCore.RateLimiting;
  using System.Security.Claims;
  ```

  Add the following block in the `#region Services` section, after the last `AddScoped` line and before the closing `#endregion`:

  ```csharp
  builder.Services.AddRateLimiter(options =>
  {
      // Auth endpoints: 5 attempts per minute per IP (brute-force guard)
      options.AddPolicy("auth", context =>
          RateLimitPartition.GetFixedWindowLimiter(
              partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
              factory: _ => new FixedWindowRateLimiterOptions
              {
                  PermitLimit = 5,
                  Window = TimeSpan.FromMinutes(1),
                  QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                  QueueLimit = 0
              }));

      // Game search: 60 requests per minute per authenticated user (RAWG quota protection)
      options.AddPolicy("game-search", context =>
          RateLimitPartition.GetFixedWindowLimiter(
              partitionKey: context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                            ?? context.Connection.RemoteIpAddress?.ToString()
                            ?? "unknown",
              factory: _ => new FixedWindowRateLimiterOptions
              {
                  PermitLimit = 60,
                  Window = TimeSpan.FromMinutes(1),
                  QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                  QueueLimit = 0
              }));

      // Anthropic schema regeneration: 2 per 5 minutes per user (cost control)
      options.AddPolicy("ai-schema", context =>
          RateLimitPartition.GetFixedWindowLimiter(
              partitionKey: context.User.FindFirstValue(ClaimTypes.NameIdentifier)
                            ?? context.Connection.RemoteIpAddress?.ToString()
                            ?? "unknown",
              factory: _ => new FixedWindowRateLimiterOptions
              {
                  PermitLimit = 2,
                  Window = TimeSpan.FromMinutes(5),
                  QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                  QueueLimit = 0
              }));

      options.OnRejected = async (context, token) =>
      {
          context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
          await context.HttpContext.Response.WriteAsync("Rate limit exceeded. Please try again later.", token);
      };
  });
  ```

  Then add `app.UseRateLimiter();` in the `#region Middleware` section, immediately after `app.UseCors("AllowFrontend");`:

  ```csharp
  app.UseCors("AllowFrontend");
  app.UseRateLimiter();   // ← add this line
  app.UseAuthentication();
  ```

- [ ] **Step 4: Apply rate-limit policies to controllers**

  In `apps/api/Controllers/AuthController.cs`, add `[EnableRateLimiting("auth")]` to the login and register actions. Find the `[HttpPost("login")]` and `[HttpPost("register")]` actions and decorate each:

  ```csharp
  using Microsoft.AspNetCore.RateLimiting;

  [EnableRateLimiting("auth")]
  [HttpPost("login")]
  public async Task<IActionResult> Login(...)

  [EnableRateLimiting("auth")]
  [HttpPost("register")]
  public async Task<IActionResult> Register(...)
  ```

  In `apps/api/Controllers/GamesController.cs`, add `[EnableRateLimiting("game-search")]` to Search, GetById, GetByDbId, GetFieldDefinitions, and `[EnableRateLimiting("ai-schema")]` to RegenerateSchema:

  ```csharp
  using Microsoft.AspNetCore.RateLimiting;

  [EnableRateLimiting("game-search")]
  [HttpGet]
  public async Task<IActionResult> Search(...)

  [EnableRateLimiting("game-search")]
  [HttpGet("{id:int}/rawg")]
  public async Task<IActionResult> GetById(int id)

  [EnableRateLimiting("game-search")]
  [HttpGet("{id:guid}")]
  public async Task<IActionResult> GetByDbId(Guid id)

  [EnableRateLimiting("game-search")]
  [HttpGet("{id:guid}/field-definitions")]
  public async Task<IActionResult> GetFieldDefinitions(Guid id)

  [EnableRateLimiting("ai-schema")]
  [Authorize]
  [HttpPost("{id:guid}/regenerate-schema")]
  public async Task<IActionResult> RegenerateSchema(...)
  ```

- [ ] **Step 5: Run the rate limit test**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~Login_ExceedingRateLimit"
  ```

  Expected: PASS — the 6th request returns 429.

- [ ] **Step 6: Run the full test suite**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: All existing tests PASS. If any fail with 429, it means the rate limiter state leaked between tests — restart the test run; if it persists, check that the 5-req/min window is wide enough that sequential tests in the same file don't trigger it.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/api/Program.cs apps/api/Controllers/AuthController.cs apps/api/Controllers/GamesController.cs apps/tests/PartyUp.Api.Tests/Features/Auth/AuthTests.cs
  git commit -m "feat: add rate limiting to auth, game search, and AI schema endpoints"
  ```

---

## Task 2: Require Authentication on Game Search Endpoints

**Files:**
- Modify: `apps/api/Controllers/GamesController.cs`
- Create: `apps/tests/PartyUp.Api.Tests/Features/Games/GameSecurityTests.cs`

The RAWG API key is proxied through the backend. Without auth on these endpoints, anyone can use your server as an unlimited RAWG proxy.

- [ ] **Step 1: Write the failing test**

  Create `apps/tests/PartyUp.Api.Tests/Features/Games/GameSecurityTests.cs`:

  ```csharp
  using System.Net;
  using FluentAssertions;
  using PartyUp.Api.Tests.Factories;
  using PartyUp.Api.Tests.Infrastructure;

  namespace PartyUp.Api.Tests.Features.Games;

  public class GameSecurityTests : TestBase, IClassFixture<ApiFactory>
  {
      public GameSecurityTests(ApiFactory factory) : base(factory) { }

      [Fact]
      public async Task GameSearch_WithoutAuth_Returns401()
      {
          var response = await Client.GetAsync("/api/games?q=halo");
          response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
      }

      [Fact]
      public async Task GameSearch_WithAuth_Returns200()
      {
          var authClient = await CreateAuthenticatedClientAsync();
          var response = await authClient.GetAsync("/api/games?q=halo");
          response.StatusCode.Should().Be(HttpStatusCode.OK);
      }

      [Fact]
      public async Task GameByDbId_WithoutAuth_Returns401()
      {
          var response = await Client.GetAsync($"/api/games/{Guid.NewGuid()}");
          response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
      }

      [Fact]
      public async Task FieldDefinitions_WithoutAuth_Returns401()
      {
          var response = await Client.GetAsync($"/api/games/{Guid.NewGuid()}/field-definitions");
          response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
      }
  }
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~GameSecurityTests"
  ```

  Expected: FAIL — currently returns 200 without auth.

- [ ] **Step 3: Add [Authorize] to GamesController**

  In `apps/api/Controllers/GamesController.cs`, add `[Authorize]` to each of the four public GET endpoints. Do NOT add it to `RegenerateSchema` — it already has it. The result:

  ```csharp
  [Authorize]
  [EnableRateLimiting("game-search")]
  [HttpGet]
  public async Task<IActionResult> Search(...)

  [Authorize]
  [EnableRateLimiting("game-search")]
  [HttpGet("{id:int}/rawg")]
  public async Task<IActionResult> GetById(int id)

  [Authorize]
  [EnableRateLimiting("game-search")]
  [HttpGet("{id:guid}")]
  public async Task<IActionResult> GetByDbId(Guid id)

  [Authorize]
  [EnableRateLimiting("game-search")]
  [HttpGet("{id:guid}/field-definitions")]
  public async Task<IActionResult> GetFieldDefinitions(Guid id)
  ```

- [ ] **Step 4: Run the security tests**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~GameSecurityTests"
  ```

  Expected: All 4 PASS.

- [ ] **Step 5: Run full suite**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: All PASS. If any existing game tests break with 401, they need to use `CreateAuthenticatedClientAsync()` — update them.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/api/Controllers/GamesController.cs apps/tests/PartyUp.Api.Tests/Features/Games/GameSecurityTests.cs
  git commit -m "feat: require auth on all game search endpoints to protect RAWG API quota"
  ```

---

## Task 3: JWT Issuer/Audience Validation

**Files:**
- Modify: `apps/api/Program.cs`
- Modify: `apps/api/appsettings.json`
- Modify: `apps/api/Services/AuthService.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs`

> **Note:** Enabling this invalidates all currently issued tokens. Anyone already logged in will need to log in again. This is acceptable for a demo app.

- [ ] **Step 1: Add issuer/audience defaults to appsettings.json**

  Replace `"Jwt": {}` in `apps/api/appsettings.json` with:

  ```json
  "Jwt": {
    "Issuer": "partyup-api",
    "Audience": "partyup-client"
  }
  ```

- [ ] **Step 2: Set issuer/audience on generated tokens in AuthService.cs**

  In `apps/api/Services/AuthService.cs`, update `GenerateJwt` to read issuer/audience from config and set them on the token:

  ```csharp
  private string GenerateJwt(User user, IConfiguration config)
  {
      var key = new SymmetricSecurityKey(
          Encoding.UTF8.GetBytes(config["Jwt:Key"]!));

      var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

      var claims = new[]
      {
          new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
          new Claim(ClaimTypes.Name, user.Username)
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
  ```

- [ ] **Step 3: Enable issuer/audience validation in Program.cs**

  Replace the `TokenValidationParameters` block (lines 50–57) with:

  ```csharp
  options.TokenValidationParameters = new TokenValidationParameters
  {
      ValidateIssuer = true,
      ValidIssuer = builder.Configuration["Jwt:Issuer"],
      ValidateAudience = true,
      ValidAudience = builder.Configuration["Jwt:Audience"],
      ValidateIssuerSigningKey = true,
      IssuerSigningKey = new SymmetricSecurityKey(
          Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
  };
  ```

- [ ] **Step 4: Add issuer/audience to ApiFactory in-memory config**

  In `apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs`, add the JWT values so test tokens are generated and validated with the same issuer/audience:

  ```csharp
  config.AddInMemoryCollection(new Dictionary<string, string?>
  {
      ["Rawg:ApiKey"] = "ci-test-fake-rawg-key",
      ["Anthropic:ApiKey"] = "ci-test-fake-anthropic-key",
      ["GoogleCloudStorage:BucketName"] = "test-bucket",
      ["Jwt:Issuer"] = "partyup-api",      // ← add
      ["Jwt:Audience"] = "partyup-client"  // ← add
  });
  ```

- [ ] **Step 5: Build and run full test suite**

  ```bash
  dotnet build apps/api/PartyUp.Api.csproj
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: Build succeeds, all tests PASS. If auth tests fail with 401, verify the ApiFactory config additions above match the values in appsettings.json exactly.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/api/Program.cs apps/api/appsettings.json apps/api/Services/AuthService.cs apps/tests/PartyUp.Api.Tests/Factories/ApiFactory.cs
  git commit -m "feat: enable JWT issuer and audience validation"
  ```

---

## Task 4: Fix XSS in RealmPage.tsx

**Files:**
- Modify: `apps/web/src/pages/RealmPage.tsx`

Game descriptions from RAWG are rendered as raw HTML via `dangerouslySetInnerHTML`. If the RAWG response ever contains `<script>` tags, it executes in the user's browser and can steal their JWT token from localStorage.

- [ ] **Step 1: Install dompurify**

  ```bash
  npm install dompurify @types/dompurify --prefix apps/web
  ```

  Expected: Installs cleanly. No peer-dep warnings.

- [ ] **Step 2: Add DOMPurify import to RealmPage.tsx**

  At the top of `apps/web/src/pages/RealmPage.tsx`, add after the existing imports:

  ```tsx
  import DOMPurify from 'dompurify'
  ```

- [ ] **Step 3: Sanitize the description before rendering**

  Find line 71 in `apps/web/src/pages/RealmPage.tsx`:

  ```tsx
  dangerouslySetInnerHTML={{ __html: userGame.description }}
  ```

  Replace with:

  ```tsx
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userGame.description) }}
  ```

- [ ] **Step 4: Verify the frontend builds**

  ```bash
  npm run build --prefix apps/web
  ```

  Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/src/pages/RealmPage.tsx apps/web/package.json apps/web/package-lock.json
  git commit -m "fix: sanitize RAWG game description HTML to prevent XSS"
  ```

---

## Task 5: File Upload Hardening

**Files:**
- Modify: `apps/api/Controllers/CharactersController.cs`

The image upload endpoint accepts any file type and has no size limit. An attacker (authenticated) could upload a 1 GB file or a malicious executable disguised as an image.

- [ ] **Step 1: Write the failing test**

  Add to `apps/tests/PartyUp.Api.Tests/Features/Characters/ImageUploadTests.cs`:

  ```csharp
  [Fact]
  public async Task UploadImage_WithNonImageMimeType_ReturnsBadRequest()
  {
      var client = await CreateAuthenticatedClientAsync();
      using var content = new MultipartFormDataContent();
      var fileContent = new ByteArrayContent([0x00, 0x01, 0x02]);
      fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
      content.Add(fileContent, "file", "evil.pdf");

      var response = await client.PostAsync("/api/characters/image", content);

      response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
  }

  [Fact]
  public async Task UploadImage_WithValidImageMimeType_ReturnsOk()
  {
      var client = await CreateAuthenticatedClientAsync();
      using var content = new MultipartFormDataContent();
      // Minimal valid JPEG header bytes
      var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 };
      var fileContent = new ByteArrayContent(jpegBytes);
      fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
      content.Add(fileContent, "file", "avatar.jpg");

      var response = await client.PostAsync("/api/characters/image", content);

      response.StatusCode.Should().Be(HttpStatusCode.OK);
  }
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~ImageUpload"
  ```

  Expected: `UploadImage_WithNonImageMimeType_ReturnsBadRequest` FAILS (returns 200 currently).

- [ ] **Step 3: Update UploadImage action in CharactersController.cs**

  Replace the existing `UploadImage` action (lines 49–59) with:

  ```csharp
  private static readonly Dictionary<string, string> AllowedImageTypes = new()
  {
      ["image/jpeg"] = ".jpg",
      ["image/png"] = ".png",
      ["image/webp"] = ".webp"
  };

  [HttpPost("image")]
  [RequestSizeLimit(5_242_880)] // 5 MB
  public async Task<IActionResult> UploadImage(IFormFile file)
  {
      if (file == null || file.Length == 0)
          return BadRequest("No file provided.");

      if (!AllowedImageTypes.TryGetValue(file.ContentType, out var extension))
          return BadRequest("Only JPEG, PNG, and WebP images are allowed.");

      var objectName = $"characters/{Guid.NewGuid()}{extension}";
      using var stream = file.OpenReadStream();
      var url = await _gcs.UploadAsync(stream, file.ContentType, objectName);
      return Ok(new UploadImageResponse { Url = url });
  }
  ```

- [ ] **Step 4: Run the image upload tests**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~ImageUpload"
  ```

  Expected: All PASS.

- [ ] **Step 5: Run full suite**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: All PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/api/Controllers/CharactersController.cs
  git commit -m "fix: validate image MIME type and enforce 5MB size limit on upload"
  ```

---

## Task 6: Input Validation on Auth and Character DTOs

**Files:**
- Modify: `apps/api/Models/DTOs/Auth/RegisterRequest.cs`
- Modify: `apps/api/Models/DTOs/Auth/LoginRequest.cs`
- Modify: `apps/api/Models/DTOs/Character/CreateCharacterRequest.cs`

Without validation, users can register with a 1-character password, create characters with multi-megabyte string fields, or send null values that crash the service layer.

- [ ] **Step 1: Write the failing test**

  Add to `apps/tests/PartyUp.Api.Tests/Features/Auth/AuthTests.cs`:

  ```csharp
  [Fact]
  public async Task Register_WithShortPassword_ReturnsBadRequest()
  {
      var response = await Client.PostAsJsonAsync("/api/auth/register", new
      {
          username = "validuser",
          password = "abc"  // too short
      });

      response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
  }

  [Fact]
  public async Task Register_WithEmptyUsername_ReturnsBadRequest()
  {
      var response = await Client.PostAsJsonAsync("/api/auth/register", new
      {
          username = "",
          password = "ValidPass1!"
      });

      response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
  }
  ```

- [ ] **Step 2: Run tests to confirm they fail**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~Register_WithShortPassword|Register_WithEmptyUsername"
  ```

  Expected: FAIL — both currently return 200 or a service-level error.

- [ ] **Step 3: Update RegisterRequest.cs**

  Replace the file contents with:

  ```csharp
  using System.ComponentModel.DataAnnotations;

  namespace PartyUp.Api.Models.DTOs.Auth;

  public class RegisterRequest
  {
      [Required]
      [StringLength(50, MinimumLength = 3)]
      public string Username { get; set; } = string.Empty;

      [Required]
      [StringLength(128, MinimumLength = 8)]
      public string Password { get; set; } = string.Empty;
  }
  ```

- [ ] **Step 4: Update LoginRequest.cs**

  Replace the file contents with:

  ```csharp
  using System.ComponentModel.DataAnnotations;

  namespace PartyUp.Api.Models.DTOs.Auth;

  public class LoginRequest
  {
      [Required]
      public string Username { get; set; } = string.Empty;

      [Required]
      public string Password { get; set; } = string.Empty;
  }
  ```

- [ ] **Step 5: Update CreateCharacterRequest.cs**

  Replace the file contents with:

  ```csharp
  using System.ComponentModel.DataAnnotations;

  namespace PartyUp.Api.Models.DTOs.Character;

  public class CreateCharacterRequest
  {
      [Required]
      public Guid UserGameId { get; set; }

      [Required]
      [StringLength(100)]
      public string Platform { get; set; } = default!;

      [Required]
      [StringLength(100)]
      public string PlatformHandle { get; set; } = default!;

      [Required]
      [StringLength(100)]
      public string Name { get; set; } = default!;

      [StringLength(500)]
      public string? ImageUrl { get; set; }

      [StringLength(500)]
      public string? Bio { get; set; }

      [StringLength(100)]
      public string? MainRole { get; set; }

      [StringLength(100)]
      public string? SecondaryRole { get; set; }

      public List<string> PreferredModes { get; set; } = [];

      [StringLength(100)]
      public string? TimeZone { get; set; }

      public string[]? ActiveTimes { get; set; }

      public bool? UsesVoiceChat { get; set; }

      public string[]? Languages { get; set; }

      [StringLength(200)]
      public string? Playstyle { get; set; }

      [StringLength(100)]
      public string? Rank { get; set; }

      [StringLength(100)]
      public string? Region { get; set; }

      public List<CharacterFieldValueRequest> GameFields { get; set; } = [];
  }
  ```

- [ ] **Step 6: Run validation tests**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~Register_WithShortPassword|Register_WithEmptyUsername"
  ```

  Expected: Both PASS — ASP.NET Core's model binding automatically returns 400 when `[Required]`/`[StringLength]` annotations fail.

- [ ] **Step 7: Run full suite**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: All PASS. The existing test `Register_ReturnsToken` uses `Password123!` (12 chars, well above min 8), so it will continue to pass.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/api/Models/DTOs/Auth/RegisterRequest.cs apps/api/Models/DTOs/Auth/LoginRequest.cs apps/api/Models/DTOs/Character/CreateCharacterRequest.cs
  git commit -m "feat: add input validation to auth and character DTOs"
  ```

---

## Task 7: Character Interaction Ownership Validation

**Files:**
- Modify: `apps/api/Services/Interfaces/ICharacterInteractionService.cs`
- Modify: `apps/api/Services/CharacterInteractionService.cs`
- Modify: `apps/api/Controllers/CharacterInteractionController.cs`
- Modify: `apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/CharacterInteractionTests.cs`

Currently, a user can submit any `FromCharacterId` — including another user's character — and the server will record it. This lets users fake likes on behalf of others.

- [ ] **Step 1: Write the failing test**

  Add to `apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/CharacterInteractionTests.cs`:

  ```csharp
  [Fact]
  public async Task RecordInteraction_WithOtherUsersFromCharacter_ReturnsForbidden()
  {
      // Create two users with characters
      var client1 = await CreateAuthenticatedClientAsync("user_a");
      var client2 = await CreateAuthenticatedClientAsync("user_b");

      // User A creates a character
      // (Use TestDbFactory or seed directly to get character IDs)
      // For now, post a fake GUID that user2 doesn't own
      var user1CharId = Guid.NewGuid();
      var user2CharId = Guid.NewGuid();

      // User2 tries to record an interaction as if they were User1
      var response = await client2.PostAsJsonAsync("/api/character-interactions", new
      {
          fromCharacterId = user1CharId,
          toCharacterId = user2CharId,
          type = "Like"
      });

      response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
  }
  ```

- [ ] **Step 2: Run test to confirm it fails**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~RecordInteraction_WithOtherUsersFromCharacter"
  ```

  Expected: FAIL — currently returns 200 (no ownership check).

- [ ] **Step 3: Update the interface**

  Replace `apps/api/Services/Interfaces/ICharacterInteractionService.cs` with:

  ```csharp
  public interface ICharacterInteractionService
  {
      Task<MatchResponse> RecordInteractionAsync(CharacterInteractionRequest request, Guid userId);
  }
  ```

- [ ] **Step 4: Update CharacterInteractionService.cs**

  Replace the `RecordInteractionAsync` method signature and add the ownership check at the top:

  ```csharp
  public async Task<MatchResponse> RecordInteractionAsync(CharacterInteractionRequest request, Guid userId)
  {
      if (request.FromCharacterId == request.ToCharacterId)
          throw new InvalidOperationException("Cannot interact with self");

      var ownsFromCharacter = await _db.Characters
          .Include(c => c.UserGame)
          .AnyAsync(c => c.Id == request.FromCharacterId && c.UserGame.UserId == userId);

      if (!ownsFromCharacter)
          throw new UnauthorizedAccessException("Character does not belong to the authenticated user");

      // ... rest of the method unchanged
  ```

  The rest of the method body (creating the interaction, checking for reverse like, creating the match) stays identical.

- [ ] **Step 5: Update CharacterInteractionController.cs**

  Replace the `RecordInteraction` action with:

  ```csharp
  using System.Security.Claims;
  using Microsoft.AspNetCore.Authorization;
  using Microsoft.AspNetCore.Mvc;

  [ApiController]
  [Route("api/character-interactions")]
  [Authorize]
  public class CharacterInteractionController : ControllerBase
  {
      private readonly ICharacterInteractionService _service;

      public CharacterInteractionController(ICharacterInteractionService service)
      {
          _service = service;
      }

      [HttpPost]
      public async Task<ActionResult<MatchResponse>> RecordInteraction([FromBody] CharacterInteractionRequest request)
      {
          var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
          try
          {
              var result = await _service.RecordInteractionAsync(request, userId);
              return Ok(result);
          }
          catch (UnauthorizedAccessException)
          {
              return Forbid();
          }
      }
  }
  ```

- [ ] **Step 6: Run the ownership test**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests --filter "FullyQualifiedName~RecordInteraction_WithOtherUsersFromCharacter"
  ```

  Expected: PASS — returns 403 Forbidden.

- [ ] **Step 7: Run full suite**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: All PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/api/Services/Interfaces/ICharacterInteractionService.cs apps/api/Services/CharacterInteractionService.cs apps/api/Controllers/CharacterInteractionController.cs apps/tests/PartyUp.Api.Tests/Features/CharacterInteractions/CharacterInteractionTests.cs
  git commit -m "fix: validate character ownership before recording interactions"
  ```

---

## Final Verification

- [ ] **Step 1: Run the complete test suite one final time**

  ```bash
  dotnet test apps/tests/PartyUp.Api.Tests
  ```

  Expected: All tests PASS.

- [ ] **Step 2: Build the frontend**

  ```bash
  npm run build --prefix apps/web
  ```

  Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Start the full stack and smoke-test manually**

  ```bash
  docker compose up -d
  npm run dev
  ```

  Verify:
  - Can register and log in
  - Game search works when logged in
  - Uploading a character image works
  - Swiping on characters works
  - Attempting to access `/api/games?q=test` without a token returns 401 (test in browser devtools or curl)

- [ ] **Step 4: Open a PR**

  ```bash
  gh pr create --title "Security hardening: rate limiting, auth on game search, XSS fix, input validation" --body "$(cat <<'EOF'
  ## Summary
  - Added rate limiting: 5/min on auth (brute-force), 60/min on game search (RAWG quota), 2/5min on AI schema (Anthropic cost)
  - Required JWT auth on all RAWG-proxy game endpoints
  - Enabled JWT issuer/audience validation
  - Sanitized RAWG HTML descriptions with DOMPurify to prevent XSS
  - Hardened image upload: JPEG/PNG/WebP only, 5 MB max
  - Added data annotations to RegisterRequest, LoginRequest, CreateCharacterRequest
  - Validated character interaction ownership before recording

  ## Test plan
  - [ ] All integration tests pass (`dotnet test`)
  - [ ] Frontend builds cleanly (`npm run build --prefix apps/web`)
  - [ ] Manual: unauthenticated game search returns 401
  - [ ] Manual: login brute-force triggers 429 after 5 attempts
  - [ ] Manual: character image upload works for JPEG, rejects PDF
  EOF
  )"
  ```
