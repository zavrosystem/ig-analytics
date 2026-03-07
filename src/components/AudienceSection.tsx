import React, { useEffect, useRef, useState } from "react";
import { geoOrthographic, geoGraticule, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const NUM_TO_A2: Record<string, string> = {
  "484":"MX","840":"US","170":"CO","032":"AR","724":"ES","152":"CL",
  "604":"PE","862":"VE","076":"BR","218":"EC","320":"GT","188":"CR",
  "591":"PA","214":"DO","068":"BO","600":"PY","858":"UY","124":"CA",
  "826":"GB","276":"DE","250":"FR","380":"IT","528":"NL","056":"BE",
  "036":"AU","392":"JP","410":"KR","356":"IN","156":"CN","710":"ZA",
};

interface AudienceData {
  gender_age: Record<string, number>;
  countries:  Record<string, number>;
  cities:     Record<string, number>;
}

const MOCK_AUDIENCE: AudienceData = {
  gender_age: {
    "F.13-17": 120, "M.13-17": 80,
    "F.18-24": 3420,"M.18-24": 2100,
    "F.25-34": 5800,"M.25-34": 3200,
    "F.35-44": 2100,"M.35-44": 1400,
    "F.45-54": 620, "M.45-54": 380,
    "F.55-64": 180, "M.55-64": 110,
    "F.65+":   60,  "M.65+":   40,
  },
  countries: {
    "MX":14200,"US":3100,"CO":1400,
    "AR":980,  "ES":720, "CL":510,
    "PE":390,  "VE":280,
  },
  cities: {
    "Ciudad de México, Mexico":   5800,
    "Monterrey, Mexico":          2100,
    "Guadalajara, Mexico":        1800,
    "Los Angeles, United States": 920,
    "Bogotá, Colombia":           740,
    "Miami, United States":       580,
    "Buenos Aires, Argentina":    420,
    "Madrid, Spain":              310,
  },
};

const AGE_RANGES = ["13-17","18-24","25-34","35-44","45-54","55-64","65+"];

function fmtN(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("es");
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-1/2 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="h-3 w-40 bg-gray-100 rounded mb-5" />
          <div className="h-[260px] bg-gray-50 rounded-xl" />
        </div>
        <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="h-3 w-36 bg-gray-100 rounded mb-4" />
          <div className="h-[260px] bg-gray-50 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="h-3 w-28 bg-gray-100 rounded mb-4" />
          <div className="h-[200px] bg-gray-50 rounded-xl" />
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="h-3 w-36 bg-gray-100 rounded mb-4" />
          <div className="h-[200px] bg-gray-50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ── Globe ─────────────────────────────────────────────────────────────────────
const GLOBE_SIZE = 600;

function GlobeSection({ countries }: { countries: Record<string, number> }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const stateRef   = useRef({ rot: [0, -20] as [number, number], auto: true, drag: false, last: [0,0] as [number,number], geo: null as any, raf: 0 });
  const countryRef = useRef(countries);
  countryRef.current = countries;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    const graticuleFeature = geoGraticule().step([20, 20])();

    function draw() {
      const max = Math.max(...Object.values(countryRef.current), 1);
      const proj = geoOrthographic()
        .scale(GLOBE_SIZE / 2.15)
        .translate([GLOBE_SIZE / 2, GLOBE_SIZE / 2])
        .rotate([s.rot[0], s.rot[1], 0])
        .clipAngle(90);
      const pg = geoPath(proj, ctx);

      ctx.clearRect(0, 0, GLOBE_SIZE, GLOBE_SIZE);

      // Ocean
      ctx.beginPath();
      pg({ type: "Sphere" } as any);
      ctx.fillStyle = "#dde1e6";
      ctx.fill();

      // Graticule
      ctx.beginPath();
      pg(graticuleFeature as any);
      ctx.strokeStyle = "rgba(0,0,0,0.045)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Countries
      if (s.geo) {
        s.geo.features
          .filter((f: any) => f.id !== 10)
          .forEach((f: any) => {
            const numId = String(f.id).padStart(3, "0");
            const a2    = NUM_TO_A2[numId];
            const val   = a2 ? (countryRef.current[a2] ?? 0) : 0;
            const ratio = val / max;
            ctx.beginPath();
            pg(f);
            ctx.fillStyle = val ? `hsl(27,${60 + ratio*35}%,${75 - ratio*35}%)` : "#c5c2bc";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 0.4;
            ctx.stroke();
          });
      }

      // Specular highlight
      const gr = ctx.createRadialGradient(
        GLOBE_SIZE * 0.35, GLOBE_SIZE * 0.3, 0,
        GLOBE_SIZE * 0.35, GLOBE_SIZE * 0.3, GLOBE_SIZE * 0.48
      );
      gr.addColorStop(0, "rgba(255,255,255,0.25)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      pg({ type: "Sphere" } as any);
      ctx.fillStyle = gr;
      ctx.fill();
    }

    function tick() {
      if (s.auto && !s.drag) s.rot[0] += 0.1;
      draw();
      s.raf = requestAnimationFrame(tick);
    }

    fetch(GEO_URL)
      .then(r => r.json())
      .then((world: any) => {
        s.geo = feature(world, world.objects.countries);
        s.raf = requestAnimationFrame(tick);
      });

    const onDown = (e: MouseEvent) => { s.drag = true; s.auto = false; s.last = [e.clientX, e.clientY]; };
    const onMove = (e: MouseEvent) => {
      if (!s.drag) return;
      s.rot[0] += (e.clientX - s.last[0]) * 0.4;
      s.rot[1]  = Math.max(-85, Math.min(85, s.rot[1] - (e.clientY - s.last[1]) * 0.4));
      s.last = [e.clientX, e.clientY];
    };
    const onUp = () => { s.drag = false; setTimeout(() => { s.auto = true; }, 2500); };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      cancelAnimationFrame(s.raf);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="h-full bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col items-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 self-start">
        Distribución geográfica
      </p>
      <div className="flex-1 flex items-center justify-center w-full">
        <canvas
          ref={canvasRef}
          width={GLOBE_SIZE}
          height={GLOBE_SIZE}
          className="h-auto"
          style={{ cursor: "grab", maxHeight: "360px", width: "auto" }}
        />
      </div>
    </div>
  );
}

// ── Cities ────────────────────────────────────────────────────────────────────
function CitiesList({ cities }: { cities: Record<string, number> }) {
  const total   = Object.values(cities).reduce((s, v) => s + v, 0) || 1;
  const entries = Object.entries(cities).sort(([,a],[,b]) => b - a).slice(0, 8);
  const [go, setGo] = useState(false);

  useEffect(() => { const t = setTimeout(() => setGo(true), 60); return () => clearTimeout(t); }, []);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-5">Top ciudades</p>
      <div className="space-y-[18px]">
        {entries.map(([key, val], i) => {
          const pct = Math.round(val / total * 100);
          return (
            <div
              key={key}
              style={{
                opacity: go ? 1 : 0,
                transform: go ? "translateX(0)" : "translateX(-10px)",
                transition: "opacity 0.5s ease, transform 0.5s ease",
                transitionDelay: `${i * 90}ms`,
              }}
            >
              <div className="flex justify-between items-baseline mb-[7px]">
                <span className="text-sm text-gray-700">{key}</span>
                <span className="text-sm text-gray-400">{pct}%</span>
              </div>
              <div className="w-full h-[14px] rounded-full overflow-hidden" style={{ background: "#ede9e4" }}>
                <div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    width: go ? `${pct}%` : "0%",
                    background: "linear-gradient(90deg,#ff6b00,#ffb347)",
                    boxShadow: "0 2px 8px rgba(249,115,22,0.35)",
                    transition: "width 0.75s cubic-bezier(.22,1,.36,1)",
                    transitionDelay: `${80 + i * 90}ms`,
                  }}
                >
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)",
                    animation: "citiesSheen 2.2s ease-in-out infinite",
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes citiesSheen{0%{transform:translateX(-100%) skewX(-20deg);opacity:0}20%{opacity:1}100%{transform:translateX(200%) skewX(-20deg);opacity:0}}`}</style>
    </div>
  );
}

// ── Age Chart ─────────────────────────────────────────────────────────────────
function AgeChart({ genderAge }: { genderAge: Record<string, number> }) {
  const [byGender, setByGender] = useState(false);

  const data = AGE_RANGES.map(range => {
    const f = genderAge[`F.${range}`] ?? 0;
    const m = genderAge[`M.${range}`] ?? 0;
    return { range, Total: f + m, Mujeres: f, Hombres: m };
  });

  return (
    <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Distribución por edad</p>
        <button
          onClick={() => setByGender(b => !b)}
          className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200"
          style={byGender
            ? { background: "#f97316", color: "#fff", borderColor: "#f97316" }
            : { background: "#fff7f0", color: "#f97316", borderColor: "#fddcbf" }
          }
        >
          Por género
        </button>
      </div>
      {byGender && (
        <div className="flex items-center justify-center gap-5 mb-2">
          <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-200 inline-block" />Hombres
          </span>
          <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pink-200 inline-block" />Mujeres
          </span>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="25%">
            <XAxis dataKey="range" tick={{ fill: "#9CA3AF", fontSize: 9 }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fill: "#9CA3AF", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={fmtN} />
            <Tooltip
              formatter={(v: number, name: string) => [fmtN(v), name]}
              contentStyle={{ background: "#fff", border: "1px solid #F3F4F6", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
            />
            {byGender ? (
              <>
                <Bar dataKey="Mujeres" stackId="a" fill="#ffb347" radius={[0,0,0,0]} isAnimationActive animationDuration={450} />
                <Bar dataKey="Hombres" stackId="a" fill="#ff6b00" radius={[4,4,0,0]} isAnimationActive animationDuration={450} />
              </>
            ) : (
              <Bar dataKey="Total" radius={[4,4,0,0]} isAnimationActive animationDuration={550}>
                {data.map((_, i) => (
                  <Cell key={i} fill={`hsl(27,100%,${62 - (i / data.length) * 22}%)`} />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Activity Heatmap ──────────────────────────────────────────────────────────
const DAYS  = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const HOURS = [0,3,6,9,12,15,18,21];

function heatVal(d: number, h: number): number {
  const isWeekend = d >= 5;
  let base = 0;
  if      (h === 0)  base = 15;
  else if (h === 3)  base = 5;
  else if (h === 6)  base = 18;
  else if (h === 9)  base = isWeekend ? 42 : 62;
  else if (h === 12) base = isWeekend ? 58 : 68;
  else if (h === 15) base = isWeekend ? 72 : 48;
  else if (h === 18) base = isWeekend ? 78 : 65;
  else if (h === 21) base = isWeekend ? 88 : 92;
  const noise = ((d * 7 + h) * 2654435761 >>> 0) % 18;
  return Math.min(100, Math.max(2, base + noise - 9));
}

function heatColor(v: number): string {
  if (v < 12) return "#f5f3f0";
  if (v < 25) return "#ffe0c0";
  if (v < 40) return "#ffcc95";
  if (v < 55) return "#ffb347";
  if (v < 70) return "#ff8c1a";
  if (v < 85) return "#ff6b00";
  return "#d45400";
}

function fmtHour(h: number): string {
  if (h === 0)  return "12am";
  if (h < 12)   return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function ActivityHeatmap() {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Horarios de actividad</p>
      <div style={{ display: "grid", gridTemplateColumns: "44px repeat(7,1fr)", gap: "4px" }}>
        <div />
        {DAYS.map(d => (
          <div key={d} className="text-[11px] text-gray-300 text-center pb-2">{d}</div>
        ))}
        {HOURS.map((h, hi) => (
          <React.Fragment key={h}>
            <div className="text-[11px] text-gray-300 flex items-center justify-end pr-2.5 h-9">{fmtHour(h)}</div>
            {DAYS.map((_, d) => {
              const val = heatVal(d, h);
              return (
                <div
                  key={d}
                  className="h-9 rounded-md"
                  title={`${DAYS[d]} · ${fmtHour(h)}: ${val}%`}
                  style={{
                    background: heatColor(val),
                    opacity: go ? 1 : 0,
                    transform: go ? "scaleX(1)" : "scaleX(0.4)",
                    transformOrigin: "left",
                    transition: "opacity 0.3s ease, transform 0.3s ease",
                    transitionDelay: `${hi * 80 + d * 30}ms`,
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-[10px] text-gray-300">Sin actividad</span>
        <div className="w-24 h-2.5 rounded-full" style={{ background: "linear-gradient(90deg,#f0eeea,#fdc89a,#f97316,#c94d08)" }} />
        <span className="text-[10px] text-gray-300">Pico máximo</span>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AudienceSection({
  clientId,
}: {
  clientId: string | null;
  clientName?: string;
}) {
  const [data,    setData]    = useState<AudienceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!clientId) { setLoading(false); setTimeout(() => setVisible(true), 50); return; }
    supabase
      .from("audience")
      .select("gender_age, countries, cities")
      .eq("client_id", clientId)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (error) console.warn("audience fetch error:", error.message);
        setData(row ?? null);
        setLoading(false);
        setTimeout(() => setVisible(true), 50);
      });
  }, [clientId]);

  if (loading) return <Skeleton />;

  const audience = data ?? MOCK_AUDIENCE;

  return (
    <div
      className="space-y-4 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Fila 1: globo 70% + ciudades 30% */}
      <div className="flex gap-4 items-stretch">
        <div className="flex-1">
          <GlobeSection countries={audience.countries} />
        </div>
        <div className="w-[40%] shrink-0">
          <CitiesList cities={audience.cities} />
        </div>
      </div>

      {/* Fila 2: edad 50% + heatmap 50% */}
      <div className="grid grid-cols-2 gap-4">
        <AgeChart genderAge={audience.gender_age} />
        <ActivityHeatmap />
      </div>
    </div>
  );
}
