import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ── Country ISO numeric → ISO alpha-2 map (top countries) ───────────────────
const NUM_TO_A2: Record<string, string> = {
  "484":"MX","840":"US","170":"CO","032":"AR","724":"ES","152":"CL",
  "604":"PE","862":"VE","076":"BR","218":"EC","320":"GT","188":"CR",
  "591":"PA","214":"DO","068":"BO","600":"PY","858":"UY","124":"CA",
  "826":"GB","276":"DE","250":"FR","380":"IT","528":"NL","056":"BE",
  "036":"AU","392":"JP","410":"KR","356":"IN","156":"CN","710":"ZA",
};

// ── Types ────────────────────────────────────────────────────────────────────
interface AudienceData {
  gender_age: Record<string, number>;
  countries:  Record<string, number>;
  cities:     Record<string, number>;
}

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_AUDIENCE: AudienceData = {
  gender_age: {
    "F.13-17": 120,  "M.13-17": 80,
    "F.18-24": 3420, "M.18-24": 2100,
    "F.25-34": 5800, "M.25-34": 3200,
    "F.35-44": 2100, "M.35-44": 1400,
    "F.45-54": 620,  "M.45-54": 380,
    "F.55-64": 180,  "M.55-64": 110,
    "F.65+":   60,   "M.65+":   40,
  },
  countries: {
    "MX": 14200, "US": 3100, "CO": 1400,
    "AR": 980,   "ES": 720,  "CL": 510,
    "PE": 390,   "VE": 280,
  },
  cities: {
    "Ciudad de México, Mexico": 5800,
    "Monterrey, Mexico":        2100,
    "Guadalajara, Mexico":      1800,
    "Los Angeles, United States": 920,
    "Bogotá, Colombia":         740,
    "Miami, United States":     580,
    "Buenos Aires, Argentina":  420,
    "Madrid, Spain":            310,
  },
};

const AGE_RANGES = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

const COUNTRY_NAMES: Record<string, string> = {
  MX:"México", US:"Estados Unidos", CO:"Colombia", AR:"Argentina",
  ES:"España", CL:"Chile", PE:"Perú", VE:"Venezuela", BR:"Brasil",
  EC:"Ecuador", GT:"Guatemala", CR:"Costa Rica", PA:"Panamá",
  DO:"República Dominicana", BO:"Bolivia", PY:"Paraguay", UY:"Uruguay",
  CA:"Canadá", GB:"Reino Unido", DE:"Alemania", FR:"Francia",
};

function fmtN(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("es");
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="h-3 w-32 bg-gray-100 rounded mb-4" />
        <div className="h-[260px] bg-gray-50 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="h-3 w-36 bg-gray-100 rounded" />
          <div className="h-[200px] bg-gray-50 rounded-xl" />
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="h-3 w-16 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded-full" />
          <div className="space-y-2">
            <div className="h-3 w-48 bg-gray-100 rounded" />
            <div className="h-3 w-48 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 bg-gray-100 rounded" style={{ width: `${80 - i * 10}%` }} />
            <div className="h-1.5 bg-gray-50 rounded-full w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── World Map ────────────────────────────────────────────────────────────────
function WorldMap({ countries }: { countries: Record<string, number> }) {
  const max = Math.max(...Object.values(countries), 1);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm overflow-hidden">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Distribución geográfica</p>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ scale: 120, center: [15, 15] }}
        viewBox="0 0 800 380"
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const numId = String(geo.id).padStart(3, "0");
              const a2    = NUM_TO_A2[numId];
              const val   = a2 ? (countries[a2] ?? 0) : 0;
              const pct   = val / max;
              const fill  = val > 0
                ? `rgba(255, 114, 0, ${0.15 + pct * 0.85})`
                : "#F3F4F6";
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  style={{
                    default:  { outline: "none" },
                    hover:    { fill: val > 0 ? `rgba(255,114,0,${Math.min(1, 0.3 + pct)})` : "#E5E7EB", outline: "none", cursor: val > 0 ? "pointer" : "default" },
                    pressed:  { outline: "none" },
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

// ── Age Chart (with gender toggle) ──────────────────────────────────────────
function AgeChart({ genderAge }: { genderAge: Record<string, number> }) {
  const [byGender, setByGender] = useState(false);

  const data = AGE_RANGES.map(range => {
    const female = genderAge[`F.${range}`] ?? 0;
    const male   = genderAge[`M.${range}`] ?? 0;
    return { range, Total: female + male, Mujeres: female, Hombres: male };
  });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Distribución por edad</p>
        <button
          onClick={() => setByGender(b => !b)}
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all duration-200 ${
            byGender
              ? "bg-[#FF7200] text-white shadow-sm"
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          }`}
        >
          Por género
        </button>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="25%">
          <XAxis dataKey="range" tick={{ fill: "#9CA3AF", fontSize: 9 }} axisLine={false} tickLine={false} />
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
  );
}

// ── Gender Chart ─────────────────────────────────────────────────────────────
function GenderBar({ genderAge }: { genderAge: Record<string, number> }) {
  const female = Object.entries(genderAge).filter(([k]) => k.startsWith("F.")).reduce((s, [,v]) => s + v, 0);
  const male   = Object.entries(genderAge).filter(([k]) => k.startsWith("M.")).reduce((s, [,v]) => s + v, 0);
  const total  = female + male || 1;
  const fPct   = Math.round(female / total * 100);
  const mPct   = 100 - fPct;

  const data = [
    { label: "Mujeres", value: female, pct: fPct, fill: "#F9A8D4" },
    { label: "Hombres", value: male,   pct: mPct, fill: "#93C5FD" },
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
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-between text-xs text-gray-400 pt-1">
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

// ── Ranked List ──────────────────────────────────────────────────────────────
function RankedList({ title, data, labelMap }: {
  title: string;
  data: Record<string, number>;
  labelMap?: Record<string, string>;
}) {
  const total   = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  const entries = Object.entries(data).sort(([,a],[,b]) => b - a).slice(0, 8);
  if (entries.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      <div className="space-y-2.5">
        {entries.map(([key, val], idx) => {
          const pct   = Math.round(val / total * 100);
          const label = labelMap?.[key] ?? key;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 font-medium truncate max-w-[70%]">{label}</span>
                <span className="text-gray-400">{pct}% · {fmtN(val)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF7200] rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, transitionDelay: `${idx * 50}ms` }}
                />
              </div>
            </div>
          );
        })}
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
      <WorldMap countries={audience.countries} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AgeChart  genderAge={audience.gender_age} />
        <GenderBar genderAge={audience.gender_age} />
      </div>

      <RankedList title="Top ciudades" data={audience.cities} />
    </div>
  );
}
