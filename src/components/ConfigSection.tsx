import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, AlertTriangle } from "lucide-react";

interface ClientFeatures {
  ads: boolean;
  messages: boolean;
  pipeline: boolean;
  audience: boolean;
}

interface ClientRow {
  id: string;
  name: string;
  features: ClientFeatures;
}

const FEATURE_LABELS: { key: keyof ClientFeatures; label: string }[] = [
  { key: "ads",      label: "Pagado"   },
  { key: "messages", label: "Mensajes" },
  { key: "audience", label: "Audiencia"},
  { key: "pipeline", label: "Pipeline" },
];

// ── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? "bg-[#FF7200]" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ConfigSection() {
  const [clients, setClients]             = useState<ClientRow[]>([]);
  const [maintenance, setMaintenance]     = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [saving, setSaving]               = useState<string | null>(null); // id being saved
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: settingsData }, { data: clientsData }] = await Promise.all([
        supabase.from("settings").select("maintenance_mode, maintenance_msg").eq("id", "global").maybeSingle(),
        supabase.from("clients").select("id, name, features").order("name"),
      ]);
      if (settingsData) {
        setMaintenance(settingsData.maintenance_mode ?? false);
        setMaintenanceMsg(settingsData.maintenance_msg ?? "");
      }
      if (clientsData) {
        setClients(clientsData.map((c: any) => ({
          ...c,
          features: c.features ?? { ads: true, messages: true, pipeline: true, audience: true },
        })));
      }
      setLoading(false);
    };
    load();
  }, []);

  const toggleMaintenance = async (val: boolean) => {
    setMaintenance(val);
    await supabase.from("settings").update({ maintenance_mode: val, updated_at: new Date().toISOString() }).eq("id", "global");
  };

  const toggleFeature = async (clientId: string, key: keyof ClientFeatures, val: boolean) => {
    setSaving(clientId + key);
    const client = clients.find(c => c.id === clientId)!;
    const updated = { ...client.features, [key]: val };
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, features: updated } : c));
    await supabase.from("clients").update({ features: updated }).eq("id", clientId);
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-[#FF7200] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Maintenance mode */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${maintenance ? "bg-red-50" : "bg-gray-50"}`}>
              <Wrench className={`w-4 h-4 ${maintenance ? "text-red-500" : "text-gray-400"}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Modo mantenimiento</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Los clientes (no admins) verán una pantalla de mantenimiento en lugar del dashboard.
              </p>
            </div>
          </div>
          <Toggle checked={maintenance} onChange={toggleMaintenance} />
        </div>

        {maintenance && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 rounded-xl">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <p className="text-xs text-red-500 font-medium">
              El dashboard está en mantenimiento. Los clientes no pueden acceder.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest px-0.5">Mensaje</p>
          <input
            className="w-full text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF7200]/20 focus:border-[#FF7200]"
            value={maintenanceMsg}
            onChange={e => setMaintenanceMsg(e.target.value)}
            onBlur={async () => {
              await supabase.from("settings").update({ maintenance_msg: maintenanceMsg }).eq("id", "global");
            }}
            placeholder="Estamos realizando mejoras..."
          />
        </div>
      </div>

      {/* Feature flags per client */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">Acceso por cliente</p>
          <p className="text-xs text-gray-400 mt-0.5">Activa o desactiva secciones para cada cuenta.</p>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cliente</th>
              {FEATURE_LABELS.map(f => (
                <th key={f.key} className="text-center px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((client, i) => (
              <tr key={client.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-6 py-3.5">
                  <p className="text-sm font-semibold text-gray-800">{client.name}</p>
                </td>
                {FEATURE_LABELS.map(f => (
                  <td key={f.key} className="px-4 py-3.5 text-center">
                    <div className="flex justify-center">
                      <div className={saving === client.id + f.key ? "opacity-50 pointer-events-none" : ""}>
                        <Toggle
                          checked={client.features[f.key]}
                          onChange={val => toggleFeature(client.id, f.key, val)}
                        />
                      </div>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
