import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { apiFetch } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      login(res.user, res.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Eye className="h-10 w-10 text-[#4F46E5] mb-2" />
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">
            Retail<span className="text-[#4F46E5]">Eye</span>
          </h1>
          <p className="text-sm text-[#64748B] mt-2">Welcome back. Log in to continue.</p>
        </div>

        <Card className="border-[#E2E8F0] shadow-sm">
          <CardContent className="p-8">
            {error && (
              <div className="mb-6 flex items-center gap-2 p-3 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] text-sm text-[#DC2626]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-[#E2E8F0] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-[#E2E8F0] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-all text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="h-11 w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-xl transition-colors flex items-center justify-center mt-2 disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Log In"}
              </button>
            </form>
            
            <div className="mt-6 text-center text-sm text-[#64748B]">
              Don't have an account? <Link to="/register" className="text-[#4F46E5] font-semibold hover:underline">Sign up</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
