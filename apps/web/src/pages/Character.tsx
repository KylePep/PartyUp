import { useCharacters } from "../hooks/useCharacters";

export default function CharactersPage() {
  const { data, loading } = useCharacters();

  if (loading) return (<div>Loading...</div>);

  return (
    <div>
      {data.map(c => (
        <div key={c.id}>{c.name}</div>
      ))}
    </div>
  );
}
