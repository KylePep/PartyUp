FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY apps/api/PartyUp.Api.csproj apps/api/
RUN dotnet restore apps/api/PartyUp.Api.csproj

COPY apps/api/ apps/api/
RUN dotnet publish apps/api/PartyUp.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "PartyUp.Api.dll"]
