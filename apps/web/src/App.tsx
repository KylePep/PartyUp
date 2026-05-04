import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import "./App.css";
import RealmPage from "./pages/RealmPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/realm/:gameId" element={<RealmPage />} />
      </Routes>
    </BrowserRouter>
  );
}
