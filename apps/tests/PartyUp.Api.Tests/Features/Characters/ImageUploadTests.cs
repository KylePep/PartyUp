using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using PartyUp.Api.Tests.Factories;
using PartyUp.Api.Tests.Infrastructure;

namespace PartyUp.Api.Tests.Features.Characters;

public class ImageUploadTests : TestBase, IClassFixture<ApiFactory>
{
    public ImageUploadTests(ApiFactory factory) : base(factory) { }

    [Fact]
    public async Task UploadImage_ReturnsUrl_WhenImageIsProvided()
    {
        var client = await CreateAuthenticatedClientAsync();

        var imageBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }; // minimal JPEG header
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(imageBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "character.jpg");

        var response = await client.PostAsync("/api/characters/image", content);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<UploadResponseDto>();
        body!.Url.Should().StartWith("https://storage.googleapis.com/test-bucket/");
    }

    [Fact]
    public async Task UploadImage_Returns401_WhenNotAuthenticated()
    {
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent([0x00]), "file", "test.jpg");

        var response = await Client.PostAsync("/api/characters/image", content);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private record UploadResponseDto(string Url);
}
