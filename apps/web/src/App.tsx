import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SignedInLayout from "./components/layout/SignedInLayout";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import RealmPage from "./pages/RealmPage";
import CreateCharacterPage from "./pages/CreateCharacterPage";
import EditCharacterPage from "./pages/EditCharacterPage";
import "./App.css";
import CharactersPage from "./pages/CharacterPage";
import MatchesPage from "./pages/MatchesPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<SignedInLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/realm/:gameId" element={<RealmPage />} />
            <Route path="/realm/:gameId/create-character" element={<CreateCharacterPage />} />
            <Route path="/realm/:gameId/edit-character/:characterId" element={<EditCharacterPage />} />
            <Route path="/characters" element={<CharactersPage />} />
            <Route path="/matches" element={<MatchesPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
