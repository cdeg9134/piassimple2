import { useState } from "react";
import { useLocation } from "wouter";
import { saveAuth } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";

type Mode = "store" | "admin";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("store");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setUsername("");
    setPassword("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "admin" ? "/api/auth/admin/login" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      saveAuth(data.token, {
        storeId: data.storeId,
        storeName: data.storeName,
        isAdmin: data.isAdmin ?? false,
      });
      setAuthTokenGetter(() => data.token);
      setLocation("/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">⛷️</div>
            <h1 className="text-2xl font-bold text-gray-900">Ski & Snowboard Service</h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === "admin" ? "Admin Login" : "Sign in to your store"}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
            <button
              type="button"
              onClick={() => switchMode("store")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "store"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Store
            </button>
            <button
              type="button"
              onClick={() => switchMode("admin")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === "admin"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mode === "admin" ? "Admin Username" : "Store Username"}
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors ${
                mode === "admin"
                  ? "bg-gray-900 hover:bg-gray-800"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? "Signing in..." : mode === "admin" ? "Admin Sign In" : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
