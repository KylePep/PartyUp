namespace PartyUp.Api.Services.Interfaces;

public interface IGcsStorageService
{
    Task<string> UploadAsync(Stream stream, string contentType, string objectName);
    Task DeleteByUrlAsync(string url);
}
