import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import LoginPage from "./LoginPage";
import DashboardPage from "./DashboardPage";
import { Loader2 } from "lucide-react";

export default function Index() {
  const [session, setSession]           = useState<Session | null>(null);
  const [loading, setLoading]           = useState(true);
  const [isRecovery, setIsRecovery]     = useState(false);
  const [newPassword, setNewPassword]   = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [saving, setSaving]             = useState(false);
  const [resetError, setResetError]     = useState<string | null>(null);
  const [resetDone, setResetDone]       = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setSession(session);
      } else {
        setSession(session);
        setIsRecovery(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPassword2) {
      setResetError("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 6) {
      setResetError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSaving(true);
    setResetError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      setResetError("Error al actualizar. Intenta pedir el link de nuevo.");
    } else {
      setResetDone(true);
      setIsRecovery(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF7200] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Reset password screen ──
  if (isRecovery) {
    return (
      <div className="min-h-screen bg-[#F6F5F3] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="WishUp" className="w-12 h-12 rounded-2xl object-cover mb-4 mx-auto shadow-[0_8px_24px_rgba(255,114,0,0.30)]" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nueva contraseña</h1>
            <p className="text-sm text-gray-400 mt-1">Elige una contraseña segura</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF7200]/30 focus:border-[#FF7200] transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword2}
                  onChange={(e) => setNewPassword2(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF7200]/30 focus:border-[#FF7200] transition"
                />
              </div>
              {resetError && (
                <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  {resetError}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 rounded-xl bg-[#FF7200] hover:bg-[#e56600] text-white font-semibold text-sm transition-colors shadow-[0_4px_16px_rgba(255,114,0,0.25)] disabled:opacity-60 flex items-center justify-center"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar contraseña"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return session ? <DashboardPage session={session} /> : <LoginPage />;
}
