import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "./context/NotificationContext";
import { StickerProvider } from "./context/StickerContext";
import { AuthProvider } from "./context/AuthContext";
import SignedInLayout from "./components/layout/SignedInLayout";
import AdminRoute from "./components/layout/AdminRoute";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import RealmPage from "./pages/RealmPage";
import "./App.css";
import CharactersPage from "./pages/CharacterPage";
import MatchesPage from "./pages/MatchesPage";
import GamesPage from "./pages/GamesPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <StickerProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<SignedInLayout />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/realm/:gameId" element={<RealmPage />} />
              <Route path="/characters" element={<CharactersPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/games" element={<GamesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
        </StickerProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}
