import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import RealmPage from "./pages/RealmPage";
import CreateCharacterPage from "./pages/CreateCharacterPage";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/realm/:gameId" element={<RealmPage />} />
        <Route path="/realm/:gameId/create-character" element={<CreateCharacterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
