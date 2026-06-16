import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../ui";

export default function AdminRoute() {
  const { state } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <Spinner label="Loading..." />
      </div>
    );
  }

  if (state.status !== "authenticated" || !state.user.isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
