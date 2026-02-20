import { useState } from "react";
import { Play, Heart, Bookmark, Share2, Clock } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Reel {
  id: string;
  caption: string;
  posted_at: string;
  plays: number;
  video_views: number;
  avg_watch_time_ms: number;
  duration_ms: number;
  like_count: number;
  comments_count: number;
  shares: number;
  saved: number;
  reach: number;
  gradient: string;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────
const MOCK_REELS: Reel[] = [
  {
    id: "r1",
    caption: "Los 3 errores que cometes al publicar en Instagram (y cómo evitarlos) 🎯",
    posted_at: "2026-01-28",
    plays: 21400, video_views: 18200, avg_watch_time_ms: 11200, duration_ms: 18000,
    like_count: 1240, comments_count: 87, shares: 342, saved: 891, reach: 19800,
    gradient: "linear-gradient(160deg, #FF7200 0%, #7A2E00 100%)",
  },
  {
    id: "r2",
    caption: "Cómo crecer 1000 seguidores en 30 días sin pagar publicidad 🚀",
    posted_at: "2026-01-21",
    plays: 8100, video_views: 6800, avg_watch_time_ms: 6500, duration_ms: 28000,
    like_count: 423, comments_count: 34, shares: 156, saved: 412, reach: 7200,
    gradient: "linear-gradient(160deg, #B45309 0%, #3B1A04 100%)",
  },
  {
    id: "r3",
    caption: "El hook que duplicó mi alcance en una semana 🔥 (tip rápido)",
    posted_at: "2026-01-14",
    plays: 35200, video_views: 31100, avg_watch_time_ms: 15800, duration_ms: 22000,
    like_count: 2890, comments_count: 210, shares: 1420, saved: 2100, reach: 32800,
    gradient: "linear-gradient(160deg, #F59E0B 0%, #92400E 100%)",
  },
  {
    id: "r4",
    caption: "Día en mi vida como community manager 📱 (lo que nadie muestra)",
    posted_at: "2026-01-07",
    plays: 12600, video_views: 9800, avg_watch_time_ms: 22000, duration_ms: 45000,
    like_count: 876, comments_count: 92, shares: 234, saved: 567, reach: 11200,
    gradient: "linear-gradient(160deg, #57534E 0%, #1C1917 100%)",
  },
  {
    id: "r5",
    caption: "3 herramientas que uso para editar reels desde el celular ✂️",
    posted_at: "2025-12-31",
    plays: 18900, video_views: 16400, avg_watch_time_ms: 13400, duration_ms: 25000,
    like_count: 1560, comments_count: 143, shares: 678, saved: 1340, reach: 17600,
    gradient: "linear-gradient(160deg, #EA580C 0%, #7C2D12 100%)",
  },
  {
    id: "r6",
    caption: "Por qué tus reels no viralizan (el algoritmo explicado fácil) 🤔",
    posted_at: "2025-12-24",
    plays: 4200, video_views: 3100, avg_watch_time_ms: 4800, duration_ms: 20000,
    like_count: 189, comments_count: 22, shares: 45, saved: 134, reach: 3800,
    gradient: "linear-gradient(160deg, #52525B 0%, #09090B 100%)",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function getHookRate(reel: Reel) {
  return Math.round((reel.avg_watch_time_ms / reel.duration_ms) * 100);
}

function hookColor(rate: number) {
  if (rate >= 60) return "#4ADE80";
  if (rate >= 40) return "#FBBF24";
  if (rate >= 20) return "#F97316";
  return "#F87171";
}

function hookLabel(rate: number) {
  if (rate >= 60) return "Excelente";
  if (rate >= 40) return "Bueno";
  if (rate >= 20) return "Regular";
  return "Bajo";
}

function fmtN(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("es");
}

function fmtMs(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

/**
 * Generate a simulated retention curve using the power-law decay model.
 * avg = D / (k+1)  →  k = D/avg - 1
 * retention(t) = (1 - t/D)^k
 */
function retentionCurve(avgMs: number, durMs: number) {
  const avg = avgMs / 1000;
  const dur = durMs / 1000;
  const k = Math.max(0.1, dur / avg - 1);
  const steps = 20;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * dur;
    const ret = Math.pow(Math.max(0, 1 - t / dur), k) * 100;
    return { time: `${Math.round(t)}s`, "Retención": Math.round(ret) };
  });
}

// ── Custom chart tooltip ───────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-0.5">{label}</p>
      <p style={{ color: "hsl(27 100% 50%)" }} className="font-semibold">
        {payload[0].value}% viendo
      </p>
    </div>
  );
};

// ── Reel Card ──────────────────────────────────────────────────────────────────
function ReelCard({ reel, onClick }: { reel: Reel; onClick: () => void }) {
  const rate = getHookRate(reel);
  const color = hookColor(rate);

  return (
    <button
      onClick={onClick}
      className="text-left group bg-card border border-border rounded-xl overflow-hidden
                 hover:border-primary/50 hover:scale-[1.02] transition-all duration-200"
    >
      {/* Thumbnail */}
      <div
        className="relative h-36 w-full flex items-center justify-center"
        style={{ background: reel.gradient }}
      >
        {/* Play button */}
        <div className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center
                        backdrop-blur-sm group-hover:bg-black/40 transition-colors">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>

        {/* Hook rate badge */}
        <div
          className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: color + "33", color, border: `1px solid ${color}55` }}
        >
          {rate}%
        </div>

        {/* Plays */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1
                        text-white/90 text-xs font-medium drop-shadow">
          <Play className="w-3 h-3 fill-white/90" />
          {fmtN(reel.plays)}
        </div>
      </div>

      {/* Caption + stats */}
      <div className="p-3 space-y-2">
        <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
          {reel.caption}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{fmtN(reel.like_count)}</span>
          <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" />{fmtN(reel.saved)}</span>
          <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{fmtN(reel.shares)}</span>
        </div>
      </div>
    </button>
  );
}

// ── Reel Detail Modal ──────────────────────────────────────────────────────────
function ReelDetail({ reel, onClose }: { reel: Reel; onClose: () => void }) {
  const rate   = getHookRate(reel);
  const color  = hookColor(rate);
  const label  = hookLabel(rate);
  const curve  = retentionCurve(reel.avg_watch_time_ms, reel.duration_ms);
  const engRate = Math.round(
    ((reel.like_count + reel.comments_count + reel.saved + reel.shares) / reel.reach) * 1000
  ) / 10;

  const stats = [
    { label: "Plays",        value: fmtN(reel.plays) },
    { label: "Vistas",       value: fmtN(reel.video_views) },
    { label: "Alcance",      value: fmtN(reel.reach) },
    { label: "Engagement",   value: `${engRate}%` },
    { label: "Likes",        value: fmtN(reel.like_count) },
    { label: "Comentarios",  value: fmtN(reel.comments_count) },
    { label: "Guardados",    value: fmtN(reel.saved) },
    { label: "Compartidos",  value: fmtN(reel.shares) },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground text-base font-semibold">
            Detalle del Reel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pb-2">
          {/* Caption banner */}
          <div
            className="rounded-xl p-4 text-sm text-white/90 leading-relaxed space-y-1"
            style={{ background: reel.gradient }}
          >
            <p>{reel.caption}</p>
            <p className="text-white/50 text-xs">
              {format(new Date(reel.posted_at), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>

          {/* Hook Rate */}
          <div className="bg-secondary/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                Hook Rate
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ color, backgroundColor: color + "22" }}
              >
                {label}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold" style={{ color }}>
                {rate}%
              </span>
              <span className="text-xs text-muted-foreground pb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {fmtMs(reel.avg_watch_time_ms)} promedio / {fmtMs(reel.duration_ms)} total
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${rate}%`, backgroundColor: color }}
              />
            </div>
          </div>

          {/* Retention Curve */}
          <div className="space-y-2">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Curva de retención estimada
              </h3>
              <p className="text-xs text-muted-foreground/50 mt-0.5">
                Simulada a partir del tiempo promedio de reproducción
              </p>
            </div>
            <div className="bg-secondary/20 rounded-xl p-4">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={curve} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="retFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(27, 100%, 50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(27, 100%, 50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }}
                    axisLine={false} tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Retención"
                    stroke="hsl(27, 100%, 50%)"
                    strokeWidth={2.5}
                    fill="url(#retFill)"
                    dot={false}
                    activeDot={{ r: 4, fill: "hsl(27, 100%, 50%)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {stats.map((s) => (
              <div key={s.label} className="bg-secondary/40 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">
                  {s.label}
                </div>
                <div className="text-xl font-bold mt-0.5" style={{ color: "hsl(27, 100%, 50%)" }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function ReelsSection() {
  const [selected, setSelected] = useState<Reel | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Últimos Reels
        </h2>
        <span className="text-xs text-muted-foreground/40">⚡ Datos de ejemplo</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {MOCK_REELS.map((reel) => (
          <ReelCard key={reel.id} reel={reel} onClick={() => setSelected(reel)} />
        ))}
      </div>

      {selected && (
        <ReelDetail reel={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
