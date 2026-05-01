import { useEffect, useState } from "react";
import { getGames, type Game } from "./api/endpoints/games";
import { GameGrid } from "./components/GameGrid";
import "./App.css";

const MMO_GENRE_ID = 59;

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // MMO starts enabled
  const [mmoEnabled, setMmoEnabled] = useState(true);

  useEffect(() => {
    async function loadGames() {
      setLoading(true);

      try {
        const genreQuery = mmoEnabled
          ? `genres=${MMO_GENRE_ID}`
          : "";

        const data = await getGames(genreQuery);

        setGames(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadGames();
  }, [mmoEnabled]);

  return (
    <main>
      <h1>Party Up</h1>

      <div>Let's party</div>

      <section className="filters">
        <label className="toggle">
          <input
            type="checkbox"
            checked={mmoEnabled}
            onChange={() => setMmoEnabled((prev) => !prev)}
          />

          MMO Only
        </label>
      </section>

      {loading ? (
        <div>Loading games...</div>
      ) : (
        <GameGrid games={games} />
      )}
    </main>
  );
}

export default App;
