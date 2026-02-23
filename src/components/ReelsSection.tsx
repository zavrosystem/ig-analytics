import { useState, useEffect } from "react";
import { Play, Heart, Bookmark, Share2, Clock, Eye, ChevronRight, CornerUpLeft, Image, LayoutGrid } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Post {
  id: string;
  post_id: string;
  media_type: string;
  permalink: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  posted_at: string | null;
  like_count: number;
  comments_count: number;
  saved: number;
  shares: number;
  reach: number;
  impressions: number;
  video_views: number;
  engagement_rate: number | null;
}

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

interface Story {
  id: string;
  caption: string;
  posted_at: string;
  impressions: number;
  reach: number;
  replies: number;
  exits: number;
  taps_forward: number;
  taps_back: number;
  shares: number;
  duration_ms: number;
  gradient: string;
}

// ── Mock Reels ─────────────────────────────────────────────────────────────────
const MOCK_REELS: Reel[] = [
  {
    id: "r1",
    caption: "Los 3 errores que cometes al publicar en Instagram (y cómo evitarlos)",
    posted_at: "2026-01-28",
    plays: 21400, video_views: 18200, avg_watch_time_ms: 11200, duration_ms: 18000,
    like_count: 1240, comments_count: 87, shares: 342, saved: 891, reach: 19800,
    gradient: "linear-gradient(160deg, #FF7200 0%, #7A2E00 100%)",
  },
  {
    id: "r2",
    caption: "Cómo crecer 1000 seguidores en 30 días sin pagar publicidad",
    posted_at: "2026-01-21",
    plays: 8100, video_views: 6800, avg_watch_time_ms: 6500, duration_ms: 28000,
    like_count: 423, comments_count: 34, shares: 156, saved: 412, reach: 7200,
    gradient: "linear-gradient(160deg, #B45309 0%, #3B1A04 100%)",
  },
  {
    id: "r3",
    caption: "El hook que duplicó mi alcance en una semana (tip rápido)",
    posted_at: "2026-01-14",
    plays: 35200, video_views: 31100, avg_watch_time_ms: 15800, duration_ms: 22000,
    like_count: 2890, comments_count: 210, shares: 1420, saved: 2100, reach: 32800,
    gradient: "linear-gradient(160deg, #F59E0B 0%, #92400E 100%)",
  },
];

// ── Mock Stories ───────────────────────────────────────────────────────────────
const MOCK_STORIES: Story[] = [
  {
    id: "s1",
    caption: "Tip del día: publica en tus mejores horas",
    posted_at: "2026-02-17",
    impressions: 4200, reach: 3900, replies: 47, exits: 420,
    taps_forward: 310, taps_back: 180, shares: 89, duration_ms: 7000,
    gradient: "linear-gradient(160deg, #FF7200 0%, #7A2E00 100%)",
  },
  {
    id: "s2",
    caption: "Detrás de cámaras de nuestra última producción",
    posted_at: "2026-02-15",
    impressions: 3800, reach: 3500, replies: 62, exits: 950,
    taps_forward: 520, taps_back: 95, shares: 34, duration_ms: 15000,
    gradient: "linear-gradient(160deg, #B45309 0%, #3B1A04 100%)",
  },
  {
    id: "s3",
    caption: "Encuesta: ¿qué contenido quieres ver esta semana?",
    posted_at: "2026-02-13",
    impressions: 5100, reach: 4800, replies: 234, exits: 306,
    taps_forward: 198, taps_back: 412, shares: 156, duration_ms: 8000,
    gradient: "linear-gradient(160deg, #F59E0B 0%, #92400E 100%)",
  },
];

// ── Shared Helpers ─────────────────────────────────────────────────────────────
function rateColor(rate: number) {
  if (rate >= 70) return "#4ADE80";
  if (rate >= 50) return "#FBBF24";
  if (rate >= 30) return "#F97316";
  return "#F87171";
}

function rateLabel(rate: number) {
  if (rate >= 70) return "Excelente";
  if (rate >= 50) return "Bueno";
  if (rate >= 30) return "Regular";
  return "Bajo";
}

function fmtN(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("es");
}

function fmtMs(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

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

// ── Chart Tooltip ──────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p style={{ color: "#FF7200" }} className="font-semibold">{payload[0].value}%</p>
    </div>
  );
};

// ── Rate Bar (shared) ──────────────────────────────────────────────────────────
function RateBar({ rate, label: metricLabel }: { rate: number; label: string }) {
  const color = rateColor(rate);
  const lbl   = rateLabel(rate);
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{metricLabel}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color, backgroundColor: color + "22" }}>
          {lbl}
        </span>
      </div>
      <div className="text-4xl font-bold" style={{ color }}>{rate}%</div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Stat Grid (shared) ─────────────────────────────────────────────────────────
function StatGrid({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="bg-gray-50 rounded-xl p-3">
          <div className="text-[10px] text-gray-400 uppercase tracking-widest">{s.label}</div>
          <div className="text-xl font-bold mt-0.5 text-[#FF7200]">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── POSTS ──────────────────────────────────────────────────────────────────────
const GRADIENTS = [
  "linear-gradient(160deg, #FF7200 0%, #7A2E00 100%)",
  "linear-gradient(160deg, #B45309 0%, #3B1A04 100%)",
  "linear-gradient(160deg, #F59E0B 0%, #92400E 100%)",
  "linear-gradient(160deg, #57534E 0%, #1C1917 100%)",
  "linear-gradient(160deg, #EA580C 0%, #7C2D12 100%)",
  "linear-gradient(160deg, #52525B 0%, #09090B 100%)",
];

function PostCard({ post, index, onClick }: { post: Post; index: number; onClick: () => void }) {
  const engRate = post.engagement_rate ?? 0;
  const color   = rateColor(engRate);
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const isCarousel = post.media_type === "CAROUSEL_ALBUM";

  return (
    <button
      onClick={onClick}
      className="text-left group bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-[#FF7200]/40 hover:shadow-md hover:scale-[1.02] transition-all duration-200"
    >
      <div className="relative h-36 w-full flex items-center justify-center overflow-hidden" style={{ background: gradient }}>
        {post.thumbnail_url ? (
          <img src={post.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            {isCarousel
              ? <LayoutGrid className="w-4 h-4 text-white" />
              : <Image className="w-4 h-4 text-white" />
            }
          </div>
        )}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: color + "33", color, border: `1px solid ${color}55` }}>
          {engRate.toFixed(1)}%
        </div>
        {isCarousel && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/40 text-white text-[10px] font-medium">
            Carrusel
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white/90 text-xs font-medium drop-shadow">
          <Heart className="w-3 h-3 fill-white/90" />{fmtN(post.like_count)}
        </div>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {post.caption || <span className="text-gray-300 italic">Sin caption</span>}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{fmtN(post.like_count)}</span>
          <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" />{fmtN(post.saved)}</span>
          <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{fmtN(post.shares)}</span>
        </div>
      </div>
    </button>
  );
}

function PostDetail({ post, index, onClose }: { post: Post; index: number; onClose: () => void }) {
  const engRate  = post.engagement_rate ?? 0;
  const gradient = GRADIENTS[index % GRADIENTS.length];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white border-gray-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-base font-semibold">
            {post.media_type === "CAROUSEL_ALBUM" ? "Detalle del Carrusel" : "Detalle del Post"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pb-2">
          <div className="rounded-xl p-4 text-sm text-white/90 leading-relaxed space-y-1" style={{ background: gradient }}>
            <p>{post.caption || <span className="italic opacity-60">Sin caption</span>}</p>
            {post.posted_at && (
              <p className="text-white/50 text-xs">
                {format(new Date(post.posted_at), "d 'de' MMMM yyyy", { locale: es })}
              </p>
            )}
          </div>

          <RateBar rate={Math.round(engRate)} label="Engagement Rate" />

          {post.permalink && (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#FF7200] hover:underline flex items-center gap-1"
            >
              Ver en Instagram →
            </a>
          )}

          <StatGrid stats={[
            { label: "Alcance",       value: fmtN(post.reach) },
            { label: "Engagement",    value: `${engRate.toFixed(1)}%` },
            { label: "Likes",         value: fmtN(post.like_count) },
            { label: "Comentarios",   value: fmtN(post.comments_count) },
            { label: "Guardados",     value: fmtN(post.saved) },
            { label: "Compartidos",   value: fmtN(post.shares) },
          ]} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── REELS ──────────────────────────────────────────────────────────────────────
function getHookRate(r: Reel) {
  return Math.round((r.avg_watch_time_ms / r.duration_ms) * 100);
}

function ReelCard({ reel, onClick }: { reel: Reel; onClick: () => void }) {
  const rate  = getHookRate(reel);
  const color = rateColor(rate);
  return (
    <button
      onClick={onClick}
      className="text-left group bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-[#FF7200]/40 hover:shadow-md hover:scale-[1.02] transition-all duration-200"
    >
      <div className="relative h-36 w-full flex items-center justify-center" style={{ background: reel.gradient }}>
        <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/40 transition-colors">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: color + "33", color, border: `1px solid ${color}55` }}>
          {rate}%
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white/90 text-xs font-medium drop-shadow">
          <Play className="w-3 h-3 fill-white/90" />{fmtN(reel.plays)}
        </div>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{reel.caption}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{fmtN(reel.like_count)}</span>
          <span className="flex items-center gap-1"><Bookmark className="w-3 h-3" />{fmtN(reel.saved)}</span>
          <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{fmtN(reel.shares)}</span>
        </div>
      </div>
    </button>
  );
}

function ReelDetail({ reel, onClose }: { reel: Reel; onClose: () => void }) {
  const rate    = getHookRate(reel);
  const engRate = Math.round(((reel.like_count + reel.comments_count + reel.saved + reel.shares) / reel.reach) * 1000) / 10;
  const curve   = retentionCurve(reel.avg_watch_time_ms, reel.duration_ms);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white border-gray-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-base font-semibold">Detalle del Reel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pb-2">
          <div className="rounded-xl p-4 text-sm text-white/90 leading-relaxed space-y-1" style={{ background: reel.gradient }}>
            <p>{reel.caption}</p>
            <p className="text-white/50 text-xs">{format(new Date(reel.posted_at), "d 'de' MMMM yyyy", { locale: es })}</p>
          </div>

          <RateBar rate={rate} label="Hook Rate" />

          <div className="text-xs text-gray-400 flex items-center gap-1 -mt-1 px-1">
            <Clock className="w-3 h-3" />
            {fmtMs(reel.avg_watch_time_ms)} promedio · {fmtMs(reel.duration_ms)} duración
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Curva de retención estimada</p>
            <p className="text-[10px] text-gray-400">Simulada a partir del tiempo promedio de reproducción</p>
            <div className="bg-gray-50 rounded-xl p-4">
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={curve} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="retFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#FF7200" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FF7200" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="time" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="Retención" stroke="#FF7200" strokeWidth={2} fill="url(#retFill)" dot={false} activeDot={{ r: 4, fill: "#FF7200" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <StatGrid stats={[
            { label: "Plays",       value: fmtN(reel.plays) },
            { label: "Vistas",      value: fmtN(reel.video_views) },
            { label: "Alcance",     value: fmtN(reel.reach) },
            { label: "Engagement",  value: `${engRate}%` },
            { label: "Likes",       value: fmtN(reel.like_count) },
            { label: "Comentarios", value: fmtN(reel.comments_count) },
            { label: "Guardados",   value: fmtN(reel.saved) },
            { label: "Compartidos", value: fmtN(reel.shares) },
          ]} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── STORIES ────────────────────────────────────────────────────────────────────
function getCompletionRate(s: Story) {
  return Math.round((1 - s.exits / s.impressions) * 100);
}

function storyDropoffCurve(exits: number, impressions: number, durMs: number) {
  const completionRate = 1 - exits / impressions;
  const dur = durMs / 1000;
  const steps = 20;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * dur;
    const frac = i / steps;
    const ret = 100 - (100 - completionRate * 100) * Math.sqrt(frac);
    return { time: `${Math.round(t)}s`, "Retención": Math.round(Math.max(0, ret)) };
  });
}

function StoryCard({ story, onClick }: { story: Story; onClick: () => void }) {
  const rate  = getCompletionRate(story);
  const color = rateColor(rate);
  return (
    <button
      onClick={onClick}
      className="text-left group bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-[#FF7200]/40 hover:shadow-md hover:scale-[1.02] transition-all duration-200"
    >
      <div className="relative h-36 w-full flex items-center justify-center" style={{ background: story.gradient }}>
        <div className="w-10 h-10 rounded-full border-2 border-white/60 flex items-center justify-center">
          <Eye className="w-4 h-4 text-white" />
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: color + "33", color, border: `1px solid ${color}55` }}>
          {rate}%
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white/90 text-xs font-medium drop-shadow">
          <Eye className="w-3 h-3" />{fmtN(story.impressions)}
        </div>
        <div className="absolute bottom-2 right-2 text-white/70 text-[10px] font-medium drop-shadow">
          {fmtMs(story.duration_ms)}
        </div>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{story.caption}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{fmtN(story.replies)}</span>
          <span className="flex items-center gap-1"><ChevronRight className="w-3 h-3" />{fmtN(story.taps_forward)}</span>
          <span className="flex items-center gap-1"><CornerUpLeft className="w-3 h-3" />{fmtN(story.taps_back)}</span>
        </div>
      </div>
    </button>
  );
}

function StoryDetail({ story, onClose }: { story: Story; onClose: () => void }) {
  const rate    = getCompletionRate(story);
  const engRate = Math.round(((story.replies + story.shares) / story.reach) * 1000) / 10;
  const curve   = storyDropoffCurve(story.exits, story.impressions, story.duration_ms);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-white border-gray-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 text-base font-semibold">Detalle de Story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pb-2">
          <div className="rounded-xl p-4 text-sm text-white/90 leading-relaxed space-y-1" style={{ background: story.gradient }}>
            <p>{story.caption}</p>
            <p className="text-white/50 text-xs">{format(new Date(story.posted_at), "d 'de' MMMM yyyy", { locale: es })}</p>
          </div>

          <RateBar rate={rate} label="Completion Rate" />

          <div className="text-xs text-gray-400 flex items-center gap-1 -mt-1 px-1">
            <Clock className="w-3 h-3" />
            Duración: {fmtMs(story.duration_ms)} · {fmtN(story.exits)} salidas de {fmtN(story.impressions)} impresiones
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Curva de abandono estimada</p>
            <p className="text-[10px] text-gray-400">Simulada a partir del ratio de salidas</p>
            <div className="bg-gray-50 rounded-xl p-4">
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={curve} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="storyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#FF7200" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#FF7200" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="time" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="Retención" stroke="#FF7200" strokeWidth={2} fill="url(#storyFill)" dot={false} activeDot={{ r: 4, fill: "#FF7200" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <StatGrid stats={[
            { label: "Impresiones",   value: fmtN(story.impressions) },
            { label: "Alcance",       value: fmtN(story.reach) },
            { label: "Engagement",    value: `${engRate}%` },
            { label: "Respuestas",    value: fmtN(story.replies) },
            { label: "Salidas",       value: fmtN(story.exits) },
            { label: "Taps adelante", value: fmtN(story.taps_forward) },
            { label: "Taps atrás",    value: fmtN(story.taps_back) },
            { label: "Compartidos",   value: fmtN(story.shares) },
          ]} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────
export default function ContentSection({ clientId }: { clientId: string | null }) {
  const [posts,         setPosts]         = useState<Post[]>([]);
  const [loadingPosts,  setLoadingPosts]  = useState(true);
  const [selectedPost,  setSelectedPost]  = useState<{ post: Post; index: number } | null>(null);
  const [selectedReel,  setSelectedReel]  = useState<Reel  | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  useEffect(() => {
    if (!clientId) { setLoadingPosts(false); return; }
    supabase
      .from("posts")
      .select("id, post_id, media_type, permalink, caption, thumbnail_url, posted_at, like_count, comments_count, saved, shares, reach, impressions, video_views, engagement_rate")
      .eq("client_id", clientId)
      .in("media_type", ["IMAGE", "CAROUSEL_ALBUM", "VIDEO", "REELS"])
      .order("posted_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setPosts((data as Post[]) ?? []);
        setLoadingPosts(false);
      });
  }, [clientId]);

  const imagePosts = posts.filter(p => p.media_type === "IMAGE" || p.media_type === "CAROUSEL_ALBUM");
  const videoPosts = posts.filter(p => p.media_type === "VIDEO" || p.media_type === "REELS");

  return (
    <div className="space-y-8">

      {/* Posts reales */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-800">Posts</h2>
            <p className="text-xs text-gray-400 mt-0.5">Engagement rate = (likes + comentarios + guardados + compartidos) / alcance</p>
          </div>
          {loadingPosts
            ? <span className="text-xs text-gray-300">Cargando...</span>
            : <span className="text-xs text-gray-400">{imagePosts.length} posts</span>
          }
        </div>
        {!loadingPosts && imagePosts.length === 0 ? (
          <div className="text-center py-10 text-gray-300 text-sm">
            No hay posts registrados todavía. El pipeline nocturno los cargará pronto.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {imagePosts.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} onClick={() => setSelectedPost({ post, index: i })} />
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Reels */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Reels</h2>
          <p className="text-xs text-gray-400 mt-0.5">Hook rate = tiempo promedio / duración</p>
        </div>
        {videoPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-300 text-sm">No hay contenido</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {videoPosts.map((post, i) => (
              <PostCard key={post.id} post={post} index={i + 3} onClick={() => setSelectedPost({ post, index: i + 3 })} />
            ))}
          </div>
        )}
      </div>

      {/* Stories */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Stories</h2>
          <p className="text-xs text-gray-400 mt-0.5">Completion rate = 1 − (salidas / impresiones)</p>
        </div>
        <div className="text-center py-8 text-gray-300 text-sm">No hay contenido</div>
      </div>

      {selectedPost  && <PostDetail  post={selectedPost.post} index={selectedPost.index} onClose={() => setSelectedPost(null)} />}
      {selectedReel  && <ReelDetail  reel={selectedReel}   onClose={() => setSelectedReel(null)}  />}
      {selectedStory && <StoryDetail story={selectedStory} onClose={() => setSelectedStory(null)} />}
    </div>
  );
}
