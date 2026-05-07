import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import SignedInLayout from "./components/layout/SignedInLayout";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import RealmPage from "./pages/RealmPage";
import CreateCharacterPage from "./pages/CreateCharacterPage";
import "./App.css";
import CharactersPage from "./pages/CharacterPage";

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
            <Route path="/characters" element={<CharactersPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
