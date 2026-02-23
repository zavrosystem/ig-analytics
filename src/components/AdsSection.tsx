import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { Megaphone, TrendingUp, TrendingDown } from "lucide-react";

interface AdCampaign {
  id: string;
  campaign_id: string;
  campaign_name: string;
  status: string;
  objective: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  start_date: string;
  end_date: string | null;
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("es");
}

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:   "Activa",
  PAUSED:   "Pausada",
  ARCHIVED: "Archivada",
  DELETED:  "Eliminada",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:   "text-emerald-500 bg-emerald-50",
  PAUSED:   "text-yellow-600 bg-yellow-50",
  ARCHIVED: "text-gray-400 bg-gray-50",
  DELETED:  "text-red-400 bg-red-50",
};

export default function AdsSection({ clientId }: { clientId: string | null }) {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    supabase
      .from("ad_campaigns")
      .select("*")
      .eq("client_id", clientId)
      .order("start_date", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setCampaigns((data as AdCampaign[]) ?? []);
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

  // ── Empty state ────────────────────────────────────────────────────────────
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-300 space-y-3">
        <Megaphone className="w-10 h-10" />
        <p className="text-base font-medium text-gray-400">Sin campañas activas</p>
        <p className="text-xs text-gray-300 text-center max-w-xs">
          Cuando corras anuncios de Instagram desde tu cuenta de Ads,
          las métricas aparecerán aquí automáticamente.
        </p>
      </div>
    );
  }

  // ── Aggregates ─────────────────────────────────────────────────────────────
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0);
  const totalReach = campaigns.reduce((s, c) => s + (c.reach ?? 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
  const avgCtr = totalClicks && totalReach
    ? ((totalClicks / totalReach) * 100)
    : 0;

  const chartData = campaigns
    .slice(0, 8)
    .map((c) => ({ name: c.campaign_name.slice(0, 20), spend: c.spend ?? 0, reach: c.reach ?? 0 }));

  return (
    <div className="space-y-5">

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#FF7200] to-[#CC4E00] rounded-2xl p-5 shadow-[0_8px_32px_rgba(255,114,0,0.22)] flex flex-col justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-white/60">Gasto total</p>
          <p className="text-[2rem] font-bold text-white leading-none">{fmtMoney(totalSpend)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-gray-400">Alcance pagado</p>
          <p className="text-[2rem] font-bold text-gray-900 leading-none">{fmtNum(totalReach)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-gray-400">Clics totales</p>
          <p className="text-[2rem] font-bold text-gray-900 leading-none">{fmtNum(totalClicks)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col justify-between gap-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-gray-400">CTR promedio</p>
          <p className="text-[2rem] font-bold text-gray-900 leading-none">{avgCtr.toFixed(2)}%</p>
        </div>
      </div>

      {/* Bar chart — spend by campaign */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-800">Gasto por campaña</h2>
        <p className="text-xs text-gray-400 mt-0.5 mb-4">MXN gastados en cada campaña</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#9CA3AF", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={(v) => "$" + fmtNum(v)}
            />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #F3F4F6", borderRadius: 12, fontSize: 12 }}
              formatter={(v: number) => [fmtMoney(v), "Gasto"]}
            />
            <Bar dataKey="spend" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? "#FF7200" : "#FDBA74"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Campaigns table */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Campañas</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100">
              <th className="text-left pb-2.5 font-semibold">Campaña</th>
              <th className="text-left pb-2.5 font-semibold">Estado</th>
              <th className="text-right pb-2.5 font-semibold">Gasto</th>
              <th className="text-right pb-2.5 font-semibold">Alcance</th>
              <th className="text-right pb-2.5 font-semibold">Clics</th>
              <th className="text-right pb-2.5 font-semibold">CTR</th>
              <th className="text-right pb-2.5 font-semibold">CPM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td className="py-3 text-gray-800 font-medium max-w-[180px] truncate">
                  {c.campaign_name}
                </td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLOR[c.status] ?? "text-gray-400 bg-gray-50"}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </td>
                <td className="py-3 text-right font-bold text-gray-900">{fmtMoney(c.spend ?? 0)}</td>
                <td className="py-3 text-right text-gray-600">{fmtNum(c.reach ?? 0)}</td>
                <td className="py-3 text-right text-gray-600">{fmtNum(c.clicks ?? 0)}</td>
                <td className="py-3 text-right text-gray-600">{(c.ctr ?? 0).toFixed(2)}%</td>
                <td className="py-3 text-right text-gray-600">{fmtMoney(c.cpm ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
