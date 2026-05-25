using PartyUp.Api.Services.Interfaces;

namespace PartyUp.Api.Tests.Infrastructure;

public class FakeGcsService : IGcsStorageService
{
    public Task<string> UploadAsync(Stream stream, string contentType, string objectName)
        => Task.FromResult($"https://storage.googleapis.com/test-bucket/{objectName}");
}
