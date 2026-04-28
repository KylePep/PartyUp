# PartyUp

PartyUp is a matchmaking platform for multiplayer gamers. Instead of traditional LFG tools, PartyUp uses swipe-based matching to connect players based on their in-game characters, roles, and playstyle preferences.

If two players express interest in each other, they match and can connect to play together.

---

## Features

- Swipe-based discovery (like / pass)
- Game-specific matchmaking (e.g. WoW, ESO, etc.)
- Character-based profiles (class, role, stats)
- Mutual match system
- Player preferences (skill level, playstyle, roles)
- Game filtering (only see players in shared games)
- Optional Steam integration for profile + owned games

---

## Tech Stack

- **Backend:** ASP.NET Core Web API
- **ORM:** Entity Framework Core
- **Database:** SQL Server (or PostgreSQL)
- **Frontend (planned):** React + TypeScript
- **External APIs:** Steam Web API (optional)

---

## Core Concepts

### Users
Represents a player account.

### Games
List of supported multiplayer games.

### UserGames
Join table linking users to games they actively play.

### Characters
Optional per-game characters tied to a user.

### Swipes
Tracks like/pass decisions between users.

### Matches
Created when two users like each other.

---

## Example Flow

1. User selects games they play
2. User creates a character profile (optional)
3. User is shown other players within the same game
4. User swipes:
   - Like → interested in playing
   - Pass → skip
5. If both users like each other → Match is created
6. Users can connect and play together

---

## Learning Goals

This project is designed to strengthen:

- Relational database design
- Many-to-many relationships
- Query optimization
- State-driven backend logic
- API design in .NET

---

## Future Enhancements

- Real-time chat (SignalR)
- Party/session creation
- Ranking / reputation system
- Advanced filtering (role, skill, intent)
- Match recommendations
- Cross-platform integrations

---

## Getting Started (Planned)

```bash
# Clone repo
git clone https://github.com/yourusername/partyup

# Navigate to API
cd PartyUp.Api

# Run project
dotnet run
