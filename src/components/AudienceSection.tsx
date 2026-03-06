import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ── Country ISO numeric → ISO alpha-2 ────────────────────────────────────────
const NUM_TO_A2: Record<string, string> = {
  "484":"MX","840":"US","170":"CO","032":"AR","724":"ES","152":"CL",
  "604":"PE","862":"VE","076":"BR","218":"EC","320":"GT","188":"CR",
  "591":"PA","214":"DO","068":"BO","600":"PY","858":"UY","124":"CA",
  "826":"GB","276":"DE","250":"FR","380":"IT","528":"NL","056":"BE",
  "036":"AU","392":"JP","410":"KR","356":"IN","156":"CN","710":"ZA",
};

const COUNTRY_NAMES: Record<string, string> = {
  MX:"México", US:"EE. UU.", CO:"Colombia", AR:"Argentina",
  ES:"España", CL:"Chile", PE:"Perú", VE:"Venezuela", BR:"Brasil",
  EC:"Ecuador", GT:"Guatemala", CR:"Costa Rica", PA:"Panamá",
  DO:"R. Dominicana", BO:"Bolivia", PY:"Paraguay", UY:"Uruguay",
  CA:"Canadá", GB:"Reino Unido", DE:"Alemania", FR:"Francia",
  IT:"Italia", NL:"Países Bajos", AU:"Australia", JP:"Japón",
  KR:"Corea del Sur", IN:"India", CN:"China", ZA:"Sudáfrica",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface AudienceData {
  gender_age: Record<string, number>;
  countries:  Record<string, number>;
  cities:     Record<string, number>;
}

// ── Mock data ─────────────────────────────────────────────────────────────────
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
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="h-3 w-40 bg-gray-100 rounded mb-5" />
        <div className="flex gap-5">
          <div className="flex-1 h-[240px] bg-gray-50 rounded-xl" />
          <div className="w-44 space-y-3 pt-1">
            {[80,65,50,40,30].map(w => (
              <div key={w} className="space-y-1.5">
                <div className="h-2.5 bg-gray-100 rounded" style={{ width: `${w}%` }} />
                <div className="h-1 bg-gray-50 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="h-3 w-36 bg-gray-100 rounded mb-4" />
          <div className="h-[200px] bg-gray-50 rounded-xl" />
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="h-3 w-16 bg-gray-100 rounded mb-4" />
          <div className="h-[200px] bg-gray-50 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ── Geographic section ────────────────────────────────────────────────────────
function GeoSection({ countries }: { countries: Record<string, number> }) {
  const max = Math.max(...Object.values(countries), 1);

  const getFill = (val: number) => {
    if (!val) return "hsl(0,0%,88%)";
    const ratio = val / max;
    return `hsl(27, ${60 + ratio * 35}%, ${75 - ratio * 35}%)`;
  };

  return (
    <div className="w-[46.5%] shrink-0 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm overflow-hidden">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
        Distribución geográfica
      </p>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 138, center: [0, 40] }}
        className="w-full h-auto"
        style={{ maxHeight: 440, display: "block" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies
              .filter(geo => geo.id !== "010")
              .map(geo => {
                const numId = String(geo.id).padStart(3, "0");
                const a2    = NUM_TO_A2[numId];
                const val   = a2 ? (countries[a2] ?? 0) : 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getFill(val)}
                    stroke="#fff"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover:   { outline: "none", opacity: 0.8 },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}

// ── Cities list ───────────────────────────────────────────────────────────────
function CitiesList({ cities }: { cities: Record<string, number> }) {
  const total   = Object.values(cities).reduce((s, v) => s + v, 0) || 1;
  const entries = Object.entries(cities).sort(([,a],[,b]) => b - a).slice(0, 8);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Top ciudades</p>
      <div className="space-y-3">
        {entries.map(([key, val], idx) => {
          const pct = Math.round(val / total * 100);
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium truncate max-w-[65%]">{key}</span>
                <span className="text-gray-400 tabular-nums shrink-0">{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF7200] rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, transitionDelay: `${idx * 40}ms` }}
                />
              </div>
            </div>
          );
        })}
      </div>
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Distribución por edad
        </p>
        <button
          onClick={() => setByGender(b => !b)}
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all duration-200 ${
            byGender ? "bg-[#FF7200] text-white shadow-sm" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
        >
          Por género
        </button>
      </div>
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
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Mujeres" stackId="a" fill="#F9A8D4" radius={[0,0,0,0]} isAnimationActive animationDuration={450} />
              <Bar dataKey="Hombres" stackId="a" fill="#93C5FD" radius={[4,4,0,0]} isAnimationActive animationDuration={450} />
            </>
          ) : (
            <Bar dataKey="Total" radius={[4,4,0,0]} isAnimationActive animationDuration={550}>
              {data.map((_, i) => (
                <Cell key={i} fill="#FF7200" fillOpacity={0.55 + (i / data.length) * 0.45} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Gender Chart ──────────────────────────────────────────────────────────────
function GenderChart({ genderAge }: { genderAge: Record<string, number> }) {
  const female = Object.entries(genderAge).filter(([k]) => k.startsWith("F.")).reduce((s,[,v]) => s+v, 0);
  const male   = Object.entries(genderAge).filter(([k]) => k.startsWith("M.")).reduce((s,[,v]) => s+v, 0);
  const total  = female + male || 1;
  const fPct   = Math.round(female / total * 100);
  const mPct   = 100 - fPct;

  const data = [
    { label: "Mujeres", value: female, fill: "#F9A8D4" },
    { label: "Hombres", value: male,   fill: "#93C5FD" },
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Género</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="40%">
          <XAxis dataKey="label" tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#9CA3AF", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={fmtN} />
          <Tooltip
            formatter={(v: number, _: string, entry: any) => [fmtN(v), entry.payload.label]}
            contentStyle={{ background: "#fff", border: "1px solid #F3F4F6", borderRadius: 10, fontSize: 11, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
            cursor={{ fill: "rgba(0,0,0,0.03)" }}
          />
          <Bar dataKey="value" radius={[6,6,0,0]} isAnimationActive animationDuration={550}>
            {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-pink-300 inline-block" />
          Mujeres · {fPct}%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-300 inline-block" />
          Hombres · {mPct}%
        </span>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AudienceSection({
  clientId,
  clientName = "",
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
      {/* Fila 1: mapa + edad */}
      <div className="flex gap-4 items-stretch">
        <GeoSection countries={audience.countries} />
        <AgeChart genderAge={audience.gender_age} />
      </div>

      {/* Fila 2: ciudades + género */}
      <div className="grid grid-cols-2 gap-4">
        <CitiesList cities={audience.cities} />
        <GenderChart genderAge={audience.gender_age} />
      </div>
    </div>
  );
}
