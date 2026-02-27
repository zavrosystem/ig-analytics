import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type View = "login" | "forgot" | "forgot-sent";

export default function LoginPage() {
  const [view, setView]         = useState<View>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Credenciales incorrectas. Verifica tu email y contraseña.");
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    setView("forgot-sent");
  };

  return (
    <div className="min-h-screen bg-[#F6F5F3] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="WishUp" className="w-12 h-12 rounded-2xl object-cover mb-4 mx-auto shadow-[0_8px_24px_rgba(255,114,0,0.30)]" />
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">WishUp</h1>
          <p className="text-sm text-gray-400 mt-1">
            {view === "login" ? "Accede a tu portal de métricas" : "Recupera tu contraseña"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-5">

          {/* ── Login ── */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF7200]/30 focus:border-[#FF7200] transition"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => { setError(null); setView("forgot"); }}
                    className="text-xs text-[#FF7200] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF7200]/30 focus:border-[#FF7200] transition"
                />
              </div>
              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#FF7200] hover:bg-[#e56600] text-white font-semibold text-sm transition-colors shadow-[0_4px_16px_rgba(255,114,0,0.25)] disabled:opacity-60 flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </button>
            </form>
          )}

          {/* ── Forgot password ── */}
          {view === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-xs text-gray-500">
                Ingresa tu email y te mandamos un link para restablecer tu contraseña.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF7200]/30 focus:border-[#FF7200] transition"
                />
              </div>
              {error && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-[#FF7200] hover:bg-[#e56600] text-white font-semibold text-sm transition-colors shadow-[0_4px_16px_rgba(255,114,0,0.25)] disabled:opacity-60 flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar link de recuperación"}
              </button>
              <button
                type="button"
                onClick={() => { setError(null); setView("login"); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Volver al inicio de sesión
              </button>
            </form>
          )}

          {/* ── Sent confirmation ── */}
          {view === "forgot-sent" && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
                <span className="text-green-500 text-xl">✓</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Link enviado</p>
                <p className="text-xs text-gray-400 mt-1">
                  Revisa tu correo <span className="font-medium text-gray-600">{email}</span> y sigue las instrucciones.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setView("login"); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Volver al inicio de sesión
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
