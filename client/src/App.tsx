import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router";
import axios from "axios";
import { authClient } from "./lib/auth-client";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Users from "./pages/Users";

type HealthStatus = "loading" | "ok" | "error";

function Home() {
  const [status, setStatus] = useState<HealthStatus>("loading");
  const [timestamp, setTimestamp] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<{ status: string; timestamp: string }>("/api/health")
      .then((res) => {
        setStatus(res.data.status === "ok" ? "ok" : "error");
        setTimestamp(res.data.timestamp);
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Tickets</h1>
        <p className="text-gray-500 mb-6">Support ticket management system</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow text-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              status === "loading"
                ? "bg-yellow-400 animate-pulse"
                : status === "ok"
                  ? "bg-green-400"
                  : "bg-red-400"
            }`}
          />
          <span className="text-gray-700">
            {status === "loading" && "Checking server…"}
            {status === "ok" && `Server healthy · ${timestamp}`}
            {status === "error" && "Server unreachable"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function AdminRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route element={<AdminRoute />}>
            <Route path="/users" element={<Users />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
