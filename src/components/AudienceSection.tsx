import React, { useEffect, useRef, useState } from "react";
import { geoOrthographic, geoGraticule, geoPath, geoContains } from "d3-geo";
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

const A2_TO_NAME: Record<string, string> = {
  MX:"México", US:"Estados Unidos", CO:"Colombia", AR:"Argentina",
  ES:"España", CL:"Chile", PE:"Perú", VE:"Venezuela", BR:"Brasil",
  EC:"Ecuador", GT:"Guatemala", CR:"Costa Rica", PA:"Panamá",
  DO:"Rep. Dominicana", BO:"Bolivia", PY:"Paraguay", UY:"Uruguay",
  CA:"Canadá", GB:"Reino Unido", DE:"Alemania", FR:"Francia",
  IT:"Italia", NL:"Países Bajos", BE:"Bélgica", AU:"Australia",
  JP:"Japón", KR:"Corea del Sur", IN:"India", CN:"China", ZA:"Sudáfrica",
};

// Nombre directo por ID numérico del world-atlas (cubre todos los países)
const NUM_TO_NAME: Record<number, string> = {
  4:"Afganistán",8:"Albania",12:"Argelia",24:"Angola",32:"Argentina",36:"Australia",
  40:"Austria",50:"Bangladesh",56:"Bélgica",68:"Bolivia",76:"Brasil",100:"Bulgaria",
  116:"Camboya",120:"Camerún",124:"Canadá",144:"Sri Lanka",152:"Chile",156:"China",
  170:"Colombia",178:"Congo",180:"RD Congo",191:"Croacia",192:"Cuba",203:"Rep. Checa",
  208:"Dinamarca",214:"Rep. Dominicana",218:"Ecuador",231:"Etiopía",246:"Finlandia",
  250:"Francia",270:"Gambia",276:"Alemania",288:"Ghana",300:"Grecia",320:"Guatemala",
  324:"Guinea",340:"Honduras",348:"Hungría",356:"India",360:"Indonesia",364:"Irán",
  368:"Irak",372:"Irlanda",380:"Italia",392:"Japón",398:"Kazajistán",404:"Kenia",
  408:"Corea del Norte",410:"Corea del Sur",440:"Lituania",450:"Madagascar",
  458:"Malasia",466:"Malí",478:"Mauritania",484:"México",498:"Moldavia",
  504:"Marruecos",508:"Mozambique",524:"Nepal",528:"Países Bajos",554:"Nueva Zelanda",
  562:"Níger",566:"Nigeria",578:"Noruega",586:"Pakistán",591:"Panamá",
  598:"Papúa Nueva Guinea",600:"Paraguay",604:"Perú",608:"Filipinas",616:"Polonia",
  620:"Portugal",642:"Rumanía",643:"Rusia",682:"Arabia Saudita",686:"Senegal",
  688:"Serbia",703:"Eslovaquia",705:"Eslovenia",706:"Somalia",710:"Sudáfrica",
  724:"España",729:"Sudán",752:"Suecia",756:"Suiza",760:"Siria",764:"Tailandia",
  784:"Emiratos Árabes",788:"Túnez",792:"Turquía",800:"Uganda",804:"Ucrania",
  818:"Egipto",826:"Reino Unido",840:"Estados Unidos",854:"Burkina Faso",
  858:"Uruguay",862:"Venezuela",887:"Yemen",894:"Zambia",716:"Zimbabue",
  72:"Botsuana",108:"Burundi",140:"Rep. Centroafricana",148:"Chad",
  233:"Estonia",304:"Groenlandia",352:"Islandia",384:"Costa de Marfil",
  428:"Letonia",704:"Vietnam",
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
  const tipRef     = useRef<HTMLDivElement>(null);
  const stateRef   = useRef({ rot: [0, -20] as [number, number], auto: true, drag: false, last: [0,0] as [number,number], geo: null as any, raf: 0 });
  const countryRef = useRef(countries);
  countryRef.current = countries;

  useEffect(() => {
    const canvas = canvasRef.current;
    const tip    = tipRef.current;
    if (!canvas || !tip) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    const graticuleFeature = geoGraticule().step([20, 20])();

    function makeProj() {
      return geoOrthographic()
        .scale(GLOBE_SIZE / 2.15)
        .translate([GLOBE_SIZE / 2, GLOBE_SIZE / 2])
        .rotate([s.rot[0], s.rot[1], 0])
        .clipAngle(90);
    }

    function draw() {
      const max  = Math.max(...Object.values(countryRef.current), 1);
      const proj = makeProj();
      const pg   = geoPath(proj, ctx);

      ctx.clearRect(0, 0, GLOBE_SIZE, GLOBE_SIZE);

      ctx.beginPath();
      pg({ type: "Sphere" } as any);
      ctx.fillStyle = "#dde1e6";
      ctx.fill();

      ctx.beginPath();
      pg(graticuleFeature as any);
      ctx.strokeStyle = "rgba(0,0,0,0.045)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

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
            ctx.fillStyle = val ? `hsl(25,100%,${76 - ratio*36}%)` : "#c5c2bc";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 0.4;
            ctx.stroke();
          });
      }

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

    const onHover = (e: MouseEvent) => {
      if (!s.geo || s.drag) { tip.style.opacity = "0"; return; }
      const rect   = canvas.getBoundingClientRect();
      const scaleX = GLOBE_SIZE / rect.width;
      const scaleY = GLOBE_SIZE / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top)  * scaleY;
      const coords = makeProj().invert!([cx, cy]);
      if (!coords) { tip.style.opacity = "0"; return; }
      const found = s.geo.features.find((f: any) => f.id !== 10 && geoContains(f, coords));
      if (found) {
        const numId = String(found.id).padStart(3, "0");
        const a2    = NUM_TO_A2[numId];
        const val   = a2 ? (countryRef.current[a2] ?? 0) : 0;
        const name  = NUM_TO_NAME[+found.id] || (a2 && A2_TO_NAME[a2]) || "–";
        tip.innerHTML = `<span style="color:#f97316;font-size:10px;display:block;margin-bottom:2px">${name}</span>${val > 0 ? `<b>${fmtN(val)}</b> seguidores` : "Sin datos"}`;
        tip.style.opacity = "1";
        tip.style.left = (e.clientX + 14) + "px";
        tip.style.top  = (e.clientY - 48) + "px";
      } else {
        tip.style.opacity = "0";
      }
    };
    const onLeave = () => { tip.style.opacity = "0"; };

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onHover);
    canvas.addEventListener("mouseleave", onLeave);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      cancelAnimationFrame(s.raf);
      canvas.removeEventListener("mousedown", onDown);
      canvas.removeEventListener("mousemove", onHover);
      canvas.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col items-center">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 self-start">
        Distribución geográfica
      </p>
      <div className="flex-1 flex items-center justify-center w-full">
        <canvas
          ref={canvasRef}
          width={GLOBE_SIZE}
          height={GLOBE_SIZE}
          className="h-auto"
          style={{ cursor: "grab", maxHeight: "540px", width: "auto" }}
        />
      </div>
      <div
        ref={tipRef}
        style={{
          position: "fixed", background: "#1a1a1a", color: "#fff",
          padding: "7px 12px", fontSize: "11px", fontWeight: 500,
          borderRadius: "8px", pointerEvents: "none", opacity: 0,
          transition: "opacity 0.1s", zIndex: 999, whiteSpace: "nowrap", lineHeight: 1.7,
        }}
      />
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
    <div className="h-full bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-5">Top ciudades</p>
      <div className="flex-1 flex flex-col justify-between">
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

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="25%" barGap={2}>
            <XAxis dataKey="range" tick={{ fill: "#9CA3AF", fontSize: 9 }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fill: "#9CA3AF", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={fmtN} />
            <Tooltip
              formatter={(v: number, name: string) => [fmtN(v), name]}
              contentStyle={{ background: "#fff", border: "1px solid #F3F4F6", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
            />
            {byGender ? (
              <>
                <Bar dataKey="Hombres" fill="#93c5fd" radius={[4,4,0,0]} isAnimationActive animationDuration={600} />
                <Bar dataKey="Mujeres" fill="#f9a8d4" radius={[4,4,0,0]} isAnimationActive animationDuration={600} />
              </>
            ) : (
              <Bar dataKey="Total" radius={[4,4,0,0]} isAnimationActive animationDuration={600}>
                {data.map((_, i) => (
                  <Cell key={i} fill={`hsl(27,100%,${62 - (i / data.length) * 22}%)`} />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leyenda — solo visible en modo género */}
      <div
        className="flex items-center justify-center gap-5 mt-3"
        style={{
          opacity: byGender ? 1 : 0,
          visibility: byGender ? "visible" : "hidden",
          transition: "opacity 0.3s ease",
          height: 24,
        }}
      >
        <span className="text-[11px] text-[#999] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#93c5fd" }} />Hombres
        </span>
        <span className="text-[11px] text-[#999] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#f9a8d4" }} />Mujeres
        </span>
      </div>
    </div>
  );
}

// ── Activity Heatmap ──────────────────────────────────────────────────────────
const DAYS     = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const DAY_JS   = [1, 2, 3, 4, 5, 6, 0]; // JS getDay() → column index
const HOURS    = [0, 3, 6, 9, 12, 15, 18, 21];

function fmtHour(h: number): string {
  if (h === 0)  return "12am";
  if (h < 12)   return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function heatColor(ratio: number): string {
  if (ratio <= 0)   return "#f5f3f0";
  if (ratio < 0.15) return "#ffe0c0";
  if (ratio < 0.35) return "#ffcc95";
  if (ratio < 0.55) return "#ffb347";
  if (ratio < 0.75) return "#ff8c1a";
  if (ratio < 0.90) return "#ff6b00";
  return "#d45400";
}

interface PostRow { engagement_rate: number; posted_at: string; }

function ActivityHeatmap({ posts }: { posts: PostRow[] }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 100); return () => clearTimeout(t); }, []);

  // Build 8×7 grid from real post data
  const grid = HOURS.map(h =>
    DAY_JS.map(jsDay => {
      const relevant = posts.filter(p => {
        const dt = new Date(p.posted_at);
        return dt.getDay() === jsDay && Math.floor(dt.getHours() / 3) === HOURS.indexOf(h);
      });
      if (relevant.length === 0) return null;
      return relevant.reduce((s, p) => s + (p.engagement_rate ?? 0), 0) / relevant.length;
    })
  );

  const allVals = grid.flat().filter((v): v is number => v !== null);
  const maxVal  = allVals.length ? Math.max(...allVals) : 1;
  const hasData = allVals.length > 0;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Horarios de actividad</p>
      {!hasData && (
        <p className="text-[11px] text-gray-300 text-center py-10">Sin datos de posts suficientes</p>
      )}
      {hasData && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "44px repeat(7,1fr)", gap: "4px" }}>
            <div />
            {DAYS.map(d => (
              <div key={d} className="text-[11px] text-gray-300 text-center pb-2">{d}</div>
            ))}
            {HOURS.map((h, hi) => (
              <React.Fragment key={h}>
                <div className="text-[11px] text-gray-300 flex items-center justify-end pr-2.5 h-9">{fmtHour(h)}</div>
                {grid[hi].map((val, d) => {
                  const ratio = val !== null ? val / maxVal : 0;
                  return (
                    <div
                      key={d}
                      className="h-9 rounded-md"
                      title={val !== null ? `${DAYS[d]} · ${fmtHour(h)}: ${val.toFixed(2)}% ER` : "Sin datos"}
                      style={{
                        background: heatColor(ratio),
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
            <span className="text-[10px] text-gray-300">Bajo ER</span>
            <div className="w-24 h-2.5 rounded-full" style={{ background: "linear-gradient(90deg,#f0eeea,#fdc89a,#f97316,#c94d08)" }} />
            <span className="text-[10px] text-gray-300">Alto ER</span>
          </div>
        </>
      )}
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
  const [posts,   setPosts]   = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!clientId) { setLoading(false); setTimeout(() => setVisible(true), 50); return; }

    const fetchAll = async () => {
      const [audienceRes, postsRes] = await Promise.all([
        supabase.from("audience").select("gender_age, countries, cities").eq("client_id", clientId).maybeSingle(),
        supabase.from("posts").select("engagement_rate, posted_at").eq("client_id", clientId)
          .order("posted_at", { ascending: false }).limit(200),
      ]);
      if (audienceRes.error) console.warn("audience fetch error:", audienceRes.error.message);
      setData(audienceRes.data ?? null);
      setPosts((postsRes.data ?? []) as PostRow[]);
      setLoading(false);
      setTimeout(() => setVisible(true), 50);
    };

    fetchAll();
  }, [clientId]);

  if (loading) return <Skeleton />;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-300 space-y-2">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
          <path strokeWidth="1.5" strokeLinecap="round" d="M12 8v4m0 4h.01" />
        </svg>
        <p className="text-sm font-medium text-gray-300">Sin datos de audiencia todavía</p>
        <p className="text-xs text-gray-200">Se actualizan automáticamente cada 24 hrs</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-4 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Fila 1: globo 60% + ciudades 40% */}
      <div className="flex gap-4">
        <div className="flex-1">
          <GlobeSection countries={data.countries} />
        </div>
        <div className="w-[40%] shrink-0 self-stretch">
          <CitiesList cities={data.cities} />
        </div>
      </div>

      {/* Fila 2: edad 50% + heatmap 50% */}
      <div className="grid grid-cols-2 gap-4">
        <AgeChart genderAge={data.gender_age} />
        <ActivityHeatmap posts={posts} />
      </div>
    </div>
  );
}
