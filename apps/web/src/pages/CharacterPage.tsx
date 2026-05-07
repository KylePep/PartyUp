import { CharacterCard } from "../components/cards/CharacterCard";
import { useCharacters } from "../hooks/useCharacters";
import { useUserGames } from "../hooks/useUserGame";

export default function CharactersPage() {
  const { data, loading } = useCharacters();
  const userGamesHook = useUserGames();

  const userGames =
    userGamesHook.status === "success"
      ? userGamesHook.games
      : [];

  if (loading) return <div>Loading...</div>;

  // Group characters by userGameId
  const groupedCharacters = data.reduce((groups, character) => {
    const key = character.userGameId ?? "unknown";

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(character);

    return groups;
  }, {} as Record<string, typeof data>);

  return (
    <div>
      {Object.entries(groupedCharacters).map(([userGameId, characters]) => {
        const userGame = userGames.find((ug) => ug.id === userGameId);

        return (
          <div key={userGameId} className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              {userGame?.gameName ?? "Unknown Game"}
            </h2>

            <div className="flex flex-wrap gap-4">
              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  gameId={userGame?.gameId}
                  character={character}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}