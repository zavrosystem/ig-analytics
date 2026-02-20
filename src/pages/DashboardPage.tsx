import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import ReelsSection from "@/components/ReelsSection";
import { Session } from "@supabase/supabase-js";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, Eye, BarChart2, UserCircle, MousePointerClick,
  LogOut, TrendingUp, TrendingDown, LayoutDashboard, Film,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────
interface MetricRow {
  date: string;
  followers_count: number;
  reach: number;
  impressions: number;
  profile_views: number;
  website_clicks: number;
  follower_delta: number;
}
interface ClientInfo { id: string; name: string; }

const PERIOD_OPTIONS = [
  { label: "7 días",  value: "7"  },
  { label: "14 días", value: "14" },
  { label: "30 días", value: "30" },
  { label: "60 días", value: "60" },
  { label: "90 días", value: "90" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("es");
}

function calcTrend(curr: number, prev: number) {
  if (!prev) return null;
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  return { pct: Math.abs(Math.round(pct * 10) / 10), up: pct >= 0 };
}

// ── Nav Item ──────────────────────────────────────────────────────────────────
function NavItem({
  icon, label, active = false, onClick,
}: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
        active
          ? "bg-orange-50 text-[#FF7200]"
          : "text-gray-400 hover:text-gray-700 hover:bg-gray-50",
      )}
    >
      <span className="w-[17px] h-[17px] shrink-0">{icon}</span>
      {label}
    </button>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, prevValue, icon, hero = false,
}: {
  label: string; value: number; prevValue: number;
  icon: React.ReactNode; hero?: boolean;
}) {
  const t = calcTrend(value, prevValue);
  return (
    <div className={cn(
      "rounded-2xl p-5 flex flex-col justify-between gap-4 h-full",
      hero
        ? "bg-gradient-to-br from-[#FF7200] to-[#CC4E00] shadow-[0_8px_32px_rgba(255,114,0,0.22)]"
        : "bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow",
    )}>
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-[0.13em]",
          hero ? "text-white/60" : "text-gray-400",
        )}>
          {label}
        </span>
        <div className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center",
          hero ? "bg-white/20" : "bg-orange-50",
        )}>
          <span className={cn("w-4 h-4", hero ? "text-white" : "text-[#FF7200]")}>
            {icon}
          </span>
        </div>
      </div>
      <div>
        <div className={cn(
          "text-[2.1rem] font-bold tracking-tight leading-none",
          hero ? "text-white" : "text-gray-900",
        )}>
          {fmtNum(value)}
        </div>
        {t && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold mt-2",
            hero ? "text-white/70" : t.up ? "text-emerald-500" : "text-red-400",
          )}>
            {t.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {t.pct}% vs período anterior
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chart Tooltip ─────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-lg text-xs">
      <p className="text-gray-400 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtNum(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardPage({ session }: { session: Session }) {
  const [period, setPeriod]                     = useState("30");
  const [metrics, setMetrics]                   = useState<MetricRow[]>([]);
  const [clientName, setClientName]             = useState("");
  const [isAdmin, setIsAdmin]                   = useState(false);
  const [allClients, setAllClients]             = useState<ClientInfo[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [activeNav, setActiveNav]               = useState<"dashboard" | "reels">("dashboard");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("client_users")
        .select("client_id, is_admin, clients(id, name)")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error || !data) { setLoading(false); return; }
      const client = data.clients as unknown as ClientInfo;
      setIsAdmin(data.is_admin);
      setClientName(client?.name ?? "");
      setSelectedClientId(data.client_id);
      if (data.is_admin) {
        const { data: clients } = await supabase.from("clients").select("id, name").order("name");
        setAllClients(clients ?? []);
      }
      setLoading(false);
    };
    load();
  }, [session.user.id]);

  const loadMetrics = useCallback(async () => {
    if (!selectedClientId) return;
    const since = format(subDays(new Date(), parseInt(period)), "yyyy-MM-dd");
    const { data } = await supabase
      .from("metrics")
      .select("date, followers_count, reach, impressions, profile_views, website_clicks, follower_delta")
      .eq("client_id", selectedClientId)
      .gte("date", since)
      .order("date", { ascending: true });
    setMetrics(data ?? []);
  }, [selectedClientId, period]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    setClientName(allClients.find((c) => c.id === id)?.name ?? "");
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const mid         = Math.floor(metrics.length / 2);
  const prevHalf    = metrics.slice(0, mid);
  const latest      = metrics[metrics.length - 1];
  const prevLatest  = prevHalf[prevHalf.length - 1];
  const totalReach  = metrics.reduce((s, r) => s + r.reach, 0);
  const totalImpr   = metrics.reduce((s, r) => s + r.impressions, 0);
  const totalViews  = metrics.reduce((s, r) => s + r.profile_views, 0);
  const totalClicks = metrics.reduce((s, r) => s + r.website_clicks, 0);
  const newFolls    = metrics.reduce((s, r) => s + r.follower_delta, 0);
  const prevReach   = prevHalf.reduce((s, r) => s + r.reach, 0);
  const prevImpr    = prevHalf.reduce((s, r) => s + r.impressions, 0);
  const prevViews   = prevHalf.reduce((s, r) => s + r.profile_views, 0);
  const prevClicks  = prevHalf.reduce((s, r) => s + r.website_clicks, 0);
  const prevNewF    = prevHalf.reduce((s, r) => s + r.follower_delta, 0);

  const dateRange = metrics.length
    ? `${format(new Date(metrics[0].date + "T12:00:00"), "d MMM", { locale: es })} – ${format(new Date(latest.date + "T12:00:00"), "d MMM, yyyy", { locale: es })}`
    : "";

  const chartData = metrics.map((r) => ({
    date:        format(new Date(r.date + "T12:00:00"), "dd MMM", { locale: es }),
    Seguidores:  r.followers_count,
    Alcance:     r.reach,
    Impresiones: r.impressions,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#FF7200] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F6F5F3] overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-[210px] h-screen bg-white border-r border-gray-100 flex flex-col shrink-0">

        {/* Brand */}
        <div className="h-16 px-5 flex items-center border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF7200] flex items-center justify-center">
              <span className="text-white font-black text-xs">IG</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">Analytics</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4 space-y-0.5">
          <NavItem
            icon={<LayoutDashboard className="w-full h-full" />}
            label="Dashboard"
            active={activeNav === "dashboard"}
            onClick={() => setActiveNav("dashboard")}
          />
          <NavItem
            icon={<Film className="w-full h-full" />}
            label="Reels"
            active={activeNav === "reels"}
            onClick={() => setActiveNav("reels")}
          />
        </nav>

        {/* Filters */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-3">
          {isAdmin && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest px-1">Cliente</p>
              <Select value={selectedClientId ?? ""} onValueChange={handleClientChange}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800 text-xs h-8 rounded-lg">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-100">
                  {allClients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-gray-700 text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest px-1">Período</p>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800 text-xs h-8 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-100">
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-gray-700 text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">
              {clientName || session.user.email?.split("@")[0]}
            </p>
            {isAdmin && <p className="text-[10px] text-[#FF7200] font-bold mt-0.5">Admin</p>}
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 pb-10 space-y-5">

          {/* Page header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {activeNav === "dashboard" ? (clientName || "Dashboard") : "Reels"}
              </h1>
              {activeNav === "dashboard" && dateRange && (
                <p className="text-xs text-gray-400 mt-0.5">{dateRange}</p>
              )}
            </div>
          </div>

          {/* ── DASHBOARD TAB ──────────────────────────────────────────────────── */}
          {activeNav === "dashboard" && (
            metrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-gray-300 space-y-2">
                <BarChart2 className="w-10 h-10" />
                <p className="text-base font-medium">Sin datos para este período</p>
              </div>
            ) : (
              <div className="space-y-5">

                {/* KPI grid */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <KpiCard label="Seguidores" value={latest?.followers_count ?? 0}
                      prevValue={prevLatest?.followers_count ?? 0}
                      icon={<Users className="w-4 h-4" />} hero />
                  </div>
                  <KpiCard label="Alcance total" value={totalReach} prevValue={prevReach}
                    icon={<Eye className="w-4 h-4" />} />
                  <KpiCard label="Impresiones" value={totalImpr} prevValue={prevImpr}
                    icon={<BarChart2 className="w-4 h-4" />} />
                  <KpiCard label="Visitas perfil" value={totalViews} prevValue={prevViews}
                    icon={<UserCircle className="w-4 h-4" />} />
                  <KpiCard label="Clicks web" value={totalClicks} prevValue={prevClicks}
                    icon={<MousePointerClick className="w-4 h-4" />} />
                  <div className="col-span-2">
                    <KpiCard label="Nuevos seguidores" value={newFolls} prevValue={prevNewF}
                      icon={<TrendingUp className="w-4 h-4" />} />
                  </div>
                </div>

                {/* Followers chart */}
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
                  <div className="mb-4">
                    <h2 className="text-sm font-bold text-gray-800">Crecimiento de seguidores</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Evolución en el período</p>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#FF7200" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#FF7200" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={fmtNum} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="Seguidores" stroke="#FF7200" strokeWidth={2.5}
                        fill="url(#orangeGrad)" dot={false}
                        activeDot={{ r: 5, fill: "#FF7200", stroke: "#fff", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Bottom row */}
                <div className="grid grid-cols-5 gap-4 mb-10">
                  <div className="col-span-3 bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800">Alcance vs Impresiones</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Comparativa diaria</p>
                    </div>
                    <ResponsiveContainer width="100%" height={185}>
                      <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="date" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={fmtNum} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ color: "#9CA3AF", fontSize: 12, paddingTop: 10 }} />
                        <Line type="monotone" dataKey="Alcance" stroke="#FF7200" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="Impresiones" stroke="#FDBA74" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="col-span-2 bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
                    <div className="mb-4">
                      <h2 className="text-sm font-bold text-gray-800">Resumen</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Totales del período</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {[
                        { label: "Alcance acumulado",  value: fmtNum(totalReach) },
                        { label: "Impresiones totales", value: fmtNum(totalImpr) },
                        { label: "Alcance prom / día",  value: fmtNum(metrics.length ? Math.round(totalReach / metrics.length) : 0) },
                        { label: "Nuevos seguidores",   value: (newFolls >= 0 ? "+" : "") + fmtNum(newFolls) },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between py-3">
                          <span className="text-xs text-gray-400">{row.label}</span>
                          <span className="text-sm font-bold text-gray-900">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )
          )}

          {/* ── REELS TAB ──────────────────────────────────────────────────────── */}
          {activeNav === "reels" && (
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
              <ReelsSection />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
