import { useEffect, useState } from "react";
import { getGames, type Game } from "./api/endpoints/games";
import { GameGrid } from "./components/GameGrid";
import './App.css'

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGames() {
      try {
        const data = await getGames();
        setGames(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadGames();
  }, []);

  return (
    <main>
      <h1>Party Up</h1>

      <div>Let's party</div>

      {loading ? (
        <div>Loading games...</div>
      ) : (
        <GameGrid games={games} />
      )}
    </main>
  );
}

export default App;
