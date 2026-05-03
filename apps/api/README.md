
# DOCKER


## Stop containers
docker compose down

## Stop containers + remove volumes (DESTROYS DB DATA)
docker compose down -v

## Rebuild containers
docker compose up --build

## Run detached
docker compose up -d

## View running containers
docker ps

## View logs
docker compose logs

## Follow logs live
docker compose logs -f

## Remove dangling containers/images
docker system prune

## Enter postgres container shell
docker exec -it <container-name> bash

## Enter postgres CLI
docker exec -it <container-name> psql -U postgres



# ENTITY FRAMEWORK


## Create migration
dotnet ef migrations add InitialCreate \
  --project apps/api/PartyUp.Api \
  --startup-project apps/api/PartyUp.Api

## Remove latest migration (not applied yet)
dotnet ef migrations remove \
  --project apps/api/PartyUp.Api \
  --startup-project apps/api/PartyUp.Api

## Apply migrations
dotnet ef database update \
  --project apps/api/PartyUp.Api \
  --startup-project apps/api/PartyUp.Api

## Drop database
dotnet ef database drop \
  --project apps/api/PartyUp.Api \
  --startup-project apps/api/PartyUp.Api

## List migrations
dotnet ef migrations list \
  --project apps/api/PartyUp.Api \
  --startup-project apps/api/PartyUp.Api

## Generate SQL script from migrations
dotnet ef migrations script \
  --project apps/api/PartyUp.Api \
  --startup-project apps/api/PartyUp.Api



# DOTNET


## Restore packages
dotnet restore

## Build solution
dotnet build

## Run API project
dotnet run --project apps/api/PartyUp.Api

## Watch mode (auto reload)
dotnet watch --project apps/api/PartyUp.Api

## Run tests
dotnet test

## Run specific test project
dotnet test apps/tests/PartyUp.Api.Tests

## Run single test
dotnet test --filter "FullyQualifiedName~AuthTests"

## Clean build artifacts
dotnet clean

## Add package
dotnet add package Microsoft.EntityFrameworkCore

## Add project reference
dotnet add reference ../PartyUp.Api/PartyUp.Api.csproj



# SOLUTION MANAGEMENT


## Add project to solution
dotnet sln add apps/api/PartyUp.Api/PartyUp.Api.csproj

## Remove project from solution
dotnet sln remove apps/tests/PartyUp.Testing/PartyUp.Testing.csproj

## List projects in solution
dotnet sln list



# DATABASE DEBUGGING


## Verify connection string env vars
printenv | grep Connection

## Show all docker volumes
docker volume ls

## Remove specific docker volume
docker volume rm <volume-name>

## Reset EVERYTHING docker-related
docker compose down -v
docker system prune -a --volumes




# GIT



## New branch
git checkout -b feature/swipe-system

## View changes
git status

## Stage all
git add .

## Commit
git commit -m "Add character match system"

## Pull latest
git pull

## Push branch
git push -u origin feature/swipe-system
For your workflow specifically, these are probably the ones you'll use constantly:

docker compose down -v
docker compose up --build

dotnet ef migrations add <Name>
dotnet ef database update

dotnet watch --project apps/api/PartyUp.Api

dotnet test