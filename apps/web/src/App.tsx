import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("https://dragonball-api.com/api/characters/1")
      .then(res => res.text())
      .then(setMessage);
  }, []);

  return (
    <section>
      <h1>Party Up</h1>
      <div>{message}</div>
    </section>
  );
}

export default App;
