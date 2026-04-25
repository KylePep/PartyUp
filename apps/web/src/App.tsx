import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("https://dragonball-api.com/api/characters/1")
      .then(res => res.text())
      .then(setMessage);
  }, []);

  return <div>{message}</div>;
}

export default App;
