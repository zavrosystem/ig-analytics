import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────────
interface AudienceData {
  gender_age: Record<string, number>;
  countries:  Record<string, number>;
  cities:     Record<string, number>;
}

// ── Mock data (Cafe Botanico demo) ──────────────────────────────────────────
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

function fmtN(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString("es");
}

// ── Gender bar ───────────────────────────────────────────────────────────────
function GenderBar({ genderAge }: { genderAge: Record<string, number> }) {
  const female = Object.entries(genderAge)
    .filter(([k]) => k.startsWith("F."))
    .reduce((s, [, v]) => s + v, 0);
  const male = Object.entries(genderAge)
    .filter(([k]) => k.startsWith("M."))
    .reduce((s, [, v]) => s + v, 0);
  const total = female + male || 1;
  const fPct  = Math.round(female / total * 100);
  const mPct  = 100 - fPct;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Género</p>
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-pink-400 w-8 text-right">{fPct}%</span>
        <div className="flex-1 h-3 rounded-full overflow-hidden flex">
          <div className="h-full bg-pink-300 transition-all" style={{ width: `${fPct}%` }} />
          <div className="h-full bg-blue-300 flex-1" />
        </div>
        <span className="text-xs font-semibold text-blue-400 w-8">{mPct}%</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-300 inline-block" /> Mujeres · {fmtN(female)}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300 inline-block" /> Hombres · {fmtN(male)}</span>
      </div>
    </div>
  );
}

// ── Age chart ────────────────────────────────────────────────────────────────
function AgeChart({ genderAge }: { genderAge: Record<string, number> }) {
  const data = AGE_RANGES.map(range => {
    const female = genderAge[`F.${range}`] ?? 0;
    const male   = genderAge[`M.${range}`] ?? 0;
    return { range, Mujeres: female, Hombres: male };
  });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Distribución por edad</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
          <XAxis type="number" tick={{ fill: "#9CA3AF", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={fmtN} />
          <YAxis type="category" dataKey="range" tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            formatter={(v: number, name: string) => [fmtN(v), name]}
            contentStyle={{ background: "#fff", border: "1px solid #F3F4F6", borderRadius: 8, fontSize: 11 }}
          />
          <Bar dataKey="Mujeres" stackId="a" fill="#F9A8D4" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Hombres" stackId="a" fill="#93C5FD" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Ranked list ──────────────────────────────────────────────────────────────
function RankedList({ title, data, labelMap }: {
  title: string;
  data: Record<string, number>;
  labelMap?: Record<string, string>;
}) {
  const total   = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  const entries = Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      <div className="space-y-2">
        {entries.map(([key, val]) => {
          const pct   = Math.round(val / total * 100);
          const label = labelMap?.[key] ?? key;
          return (
            <div key={key} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate max-w-[70%]">{label}</span>
                <span className="text-gray-400 font-medium">{pct}% · {fmtN(val)}</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#FF7200] rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Country labels (ISO → name) ──────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  MX: "México", US: "Estados Unidos", CO: "Colombia", AR: "Argentina",
  ES: "España", CL: "Chile", PE: "Perú", VE: "Venezuela", BR: "Brasil",
  EC: "Ecuador", GT: "Guatemala", CR: "Costa Rica", PA: "Panamá",
  DO: "República Dominicana", BO: "Bolivia", PY: "Paraguay", UY: "Uruguay",
  CA: "Canadá", GB: "Reino Unido", DE: "Alemania", FR: "Francia",
};

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

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    supabase
      .from("audience")
      .select("gender_age, countries, cities")
      .eq("client_id", clientId)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (error) console.warn("audience fetch error:", error.message);
        setData(row ?? null);
        setLoading(false);
      });
  }, [clientId]);

  if (loading) {
    return <div className="text-center py-16 text-gray-300 text-sm">Cargando...</div>;
  }

  const audience = data ?? MOCK_AUDIENCE;


  return (
    <div className="space-y-4">
      <GenderBar genderAge={audience.gender_age} />
      <AgeChart   genderAge={audience.gender_age} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankedList title="Top países"  data={audience.countries} labelMap={COUNTRY_NAMES} />
        <RankedList title="Top ciudades" data={audience.cities} />
      </div>
    </div>
  );
}
