import { NavLink, Outlet, useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";

export default function Layout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900">Tickets</span>
          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `text-sm transition-colors ${isActive ? "text-gray-900 font-medium" : "text-gray-500 hover:text-gray-900"}`
              }
            >
              Users
            </NavLink>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session?.user.name}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
