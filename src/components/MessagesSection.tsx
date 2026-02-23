import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Lock } from "lucide-react";

interface ConversationRow {
  source_type: string;
  was_replied: boolean;
}

interface SourceStat {
  source: string;
  label: string;
  count: number;
  replied: number;
}

const SOURCE_LABELS: Record<string, string> = {
  profile: "Perfil",
  post:    "Publicación",
  reel:    "Reel",
  story:   "Historia",
  ads:     "Anuncio",
  unknown: "Desconocido",
};

const COLORS = ["#FF7200", "#FDBA74", "#FCD34D", "#86EFAC", "#93C5FD", "#C4B5FD"];

export default function MessagesSection({ clientId }: { clientId: string | null }) {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    supabase
      .from("conversations")
      .select("source_type, was_replied")
      .eq("client_id", clientId)
      .then(({ data }) => {
        setConversations(data ?? []);
        setLoading(false);
      });
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#FF7200] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── No data → permission notice ────────────────────────────────────────────
  if (conversations.length === 0) {
    return (
      <div className="space-y-5">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-[#FF7200]" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">
              Permiso pendiente: <code className="bg-orange-100 px-1.5 py-0.5 rounded text-[12px]">instagram_manage_messages</code>
            </p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Para ver de dónde vienen tus DMs (Reel, publicación, historia…) Meta necesita aprobar
              este permiso en tu app. El proceso tarda 1–2 semanas.
            </p>
            <div className="mt-4 space-y-2">
              {[
                "Ir a developers.facebook.com → App OUTLNK",
                "App Review → Permisos y funcionalidades → Solicitar instagram_manage_messages",
                "Completar el cuestionario de casos de uso y enviar a revisión",
                "Una vez aprobado, los datos aparecerán aquí automáticamente",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                  <span className="w-4 h-4 rounded-full bg-orange-100 text-[#FF7200] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ghost preview */}
        <div className="opacity-40 pointer-events-none select-none space-y-5">
          <div className="grid grid-cols-3 gap-4">
            {["Total DMs", "Tasa de respuesta", "Fuente principal"].map((label) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-gray-400">{label}</p>
                <div className="h-8 w-16 bg-gray-100 rounded mt-3" />
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="h-4 w-40 bg-gray-100 rounded mb-4" />
            <div className="h-44 bg-gray-50 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Aggregate ──────────────────────────────────────────────────────────────
  const bySource: Record<string, SourceStat> = {};
  for (const conv of conversations) {
    const key = conv.source_type ?? "unknown";
    if (!bySource[key]) {
      bySource[key] = {
        source: key,
        label: SOURCE_LABELS[key] ?? key,
        count: 0,
        replied: 0,
      };
    }
    bySource[key].count++;
    if (conv.was_replied) bySource[key].replied++;
  }

  const sourceData = Object.values(bySource).sort((a, b) => b.count - a.count);
  const totalConvs   = conversations.length;
  const totalReplied = conversations.filter((c) => c.was_replied).length;
  const replyRate    = totalConvs ? Math.round((totalReplied / totalConvs) * 100) : 0;
  const topSource    = sourceData[0];

  return (
    <div className="space-y-5">

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#FF7200] to-[#CC4E00] rounded-2xl p-5 shadow-[0_8px_32px_rgba(255,114,0,0.22)] flex flex-col justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/60">Total DMs</p>
          <p className="text-[2.1rem] font-bold text-white leading-none">{totalConvs}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-gray-400">Tasa de respuesta</p>
          <div>
            <p className="text-[2.1rem] font-bold text-gray-900 leading-none">{replyRate}%</p>
            <p className="text-xs text-gray-400 mt-2">{totalReplied} de {totalConvs} respondidos</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-gray-400">Fuente principal</p>
          <div>
            <p className="text-[1.8rem] font-bold text-gray-900 leading-none">{topSource?.label ?? "—"}</p>
            <p className="text-xs text-gray-400 mt-2">{topSource?.count ?? 0} conversaciones</p>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-800">DMs por origen</h2>
        <p className="text-xs text-gray-400 mt-0.5 mb-4">
          Cuántos mensajes vienen de cada tipo de contenido
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sourceData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={32}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #F3F4F6",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value: number) => [value, "Conversaciones"]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {sourceData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Detalle por origen</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2.5 font-semibold">Origen</th>
              <th className="text-right pb-2.5 font-semibold">DMs</th>
              <th className="text-right pb-2.5 font-semibold">Respondidos</th>
              <th className="text-right pb-2.5 font-semibold">Tasa resp.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sourceData.map((s) => (
              <tr key={s.source}>
                <td className="py-3 text-gray-700 font-medium">{s.label}</td>
                <td className="py-3 text-right font-bold text-gray-900">{s.count}</td>
                <td className="py-3 text-right text-gray-500">{s.replied}</td>
                <td className="py-3 text-right">
                  <span
                    className={
                      s.count
                        ? s.replied / s.count >= 0.5
                          ? "font-semibold text-emerald-500"
                          : "font-semibold text-orange-400"
                        : "text-gray-300"
                    }
                  >
                    {s.count ? Math.round((s.replied / s.count) * 100) : 0}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
