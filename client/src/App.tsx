import { useEffect, useState } from "react";
import { Routes, Route } from "react-router";

type HealthStatus = "loading" | "ok" | "error";

function Home() {
  const [status, setStatus] = useState<HealthStatus>("loading");
  const [timestamp, setTimestamp] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: { status: string; timestamp: string }) => {
        setStatus(data.status === "ok" ? "ok" : "error");
        setTimestamp(data.timestamp);
      })
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
