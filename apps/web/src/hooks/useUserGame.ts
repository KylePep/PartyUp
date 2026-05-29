// hooks/useUserGames.ts
import { useEffect, useState } from "react";
import { getUserGames, type UserGame } from "../api/endpoints/userGames";

export function useUserGames() {
  const [games, setGames] = useState<UserGame[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );

  useEffect(() => {
    getUserGames()
      .then((data) => {
        setGames(data);
        setStatus("success");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  function addUserGame(userGame: UserGame) {
    setGames((prev) => [userGame, ...prev]);
  }

function removeGame(userGame: UserGame) {
  setGames((prev) => prev.filter((g) => g.id !== userGame.id));
}

  return {
    status,
    games,
    addUserGame,
    removeGame,
  };
}

