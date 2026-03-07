import { useState, useEffect } from "react";
import { X, Plus, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Config ────────────────────────────────────────────────────────────────────
const PHASES = [
  { id: "lead",        label: "Lead",        color: "#94a3b8", bg: "#f1f5f9", text: "#64748b" },
  { id: "contactado",  label: "Contactado",  color: "#60a5fa", bg: "#eff6ff", text: "#3b82f6" },
  { id: "propuesta",   label: "Propuesta",   color: "#f97316", bg: "#fff7ed", text: "#f97316" },
  { id: "negociacion", label: "Negociación", color: "#a78bfa", bg: "#f5f3ff", text: "#7c3aed" },
  { id: "cerrado",     label: "Cerrado",     color: "#34d399", bg: "#f0fdf4", text: "#059669" },
] as const;

type PhaseId = typeof PHASES[number]["id"];

interface PipelineClient {
  id: string;
  name: string;
  company: string;
  phase: PhaseId;
  value: string;
  note: string;
  created_at: string;
}

function phaseOf(id: PhaseId) {
  return PHASES.find(p => p.id === id)!;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ── Card ─────────────────────────────────────────────────────────────────────
function PipelineCard({
  client, index, onClick,
}: {
  client: PipelineClient;
  index: number;
  onClick: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const phase = phaseOf(client.phase);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80 + index * 90);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-xl border border-[#edeae6] overflow-hidden cursor-pointer"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: phase.color,
        opacity: visible ? 1 : 0,
        transform: visible ? (hovered ? "translateY(-3px)" : "translateY(0)") : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.2s ease, box-shadow 0.18s ease",
        boxShadow: hovered ? "0 8px 28px rgba(0,0,0,0.09)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-200"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0) 60%, rgba(249,115,22,0.03) 100%)", opacity: hovered ? 1 : 0 }}
      />
      <div className="p-[14px_15px]">
        <p className="text-[13px] font-semibold text-[#1a1a1a] mb-0.5 tracking-[-0.2px]">{client.name}</p>
        <p className="text-[11px] text-[#bbb] font-normal mb-3">{client.company}</p>
        <p className="text-[18px] font-bold text-[#f97316] mb-1.5 tracking-[-0.5px]">{client.value || "—"}</p>
        <p
          className="text-[11px] text-[#aaa] leading-[1.5]"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {client.note || "Sin notas"}
        </p>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#f5f3f0]">
          <span className="text-[10px] text-[#ccc] tracking-[0.3px]">{fmtDate(client.created_at)}</span>
          <span
            className="text-[9px] font-bold tracking-[0.8px] uppercase px-[9px] py-[3px] rounded-full"
            style={{ background: phase.bg, color: phase.text }}
          >
            {phase.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Empty Column ──────────────────────────────────────────────────────────────
function EmptyCol({ onAdd, isAdmin }: { onAdd: () => void; isAdmin: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <div className="w-8 h-8 rounded-full border-2 border-dashed border-[#ddd] flex items-center justify-center">
        <span className="text-[#ccc] text-lg leading-none">·</span>
      </div>
      <p className="text-[11px] text-[#ccc]">Sin clientes</p>
      {isAdmin && (
        <button
          onClick={onAdd}
          className="text-[10px] text-[#f97316] font-semibold hover:underline mt-1"
        >
          + Agregar
        </button>
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({
  client,
  isAdmin,
  onClose,
  onPhaseChange,
  onDelete,
}: {
  client: PipelineClient;
  isAdmin: boolean;
  onClose: () => void;
  onPhaseChange: (id: string, phase: PhaseId) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [phase, setPhase] = useState<PhaseId>(client.phase);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ph = phaseOf(phase);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handlePhaseChange = async (newPhase: PhaseId) => {
    if (newPhase === phase) return;
    setSaving(true);
    setPhase(newPhase);
    await onPhaseChange(client.id, newPhase);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${client.name}?`)) return;
    setDeleting(true);
    await onDelete(client.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,15,15,0.2)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[22px] p-[34px] relative border border-[#edeae6]"
        style={{
          width: "min(92vw, 460px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
          animation: "pipelineFadeUp 0.24s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#f3f1ee] flex items-center justify-center text-[#999] hover:bg-[#e8e5e1] hover:text-[#555] transition-colors"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Phase tag */}
        <span
          className="inline-block text-[9px] font-semibold tracking-[1.5px] uppercase px-3 py-1 rounded-full mb-3.5"
          style={{ background: ph.bg, color: ph.text }}
        >
          {ph.label}
        </span>

        <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-[-0.5px] mb-0.5">{client.name}</h2>
        <p className="text-[13px] text-[#bbb] mb-[22px]">{client.company}</p>

        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          <div className="bg-[#faf9f7] rounded-[10px] px-[13px] py-[11px] border border-[#f0eeea]">
            <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">Valor del deal</p>
            <p className="text-sm font-semibold text-[#f97316]">{client.value || "—"}</p>
          </div>
          <div className="bg-[#faf9f7] rounded-[10px] px-[13px] py-[11px] border border-[#f0eeea]">
            <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">En pipeline desde</p>
            <p className="text-sm font-semibold text-[#333]">{fmtDate(client.created_at)}</p>
          </div>
          <div className="bg-[#faf9f7] rounded-[10px] px-[13px] py-[11px] border border-[#f0eeea]">
            <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">Empresa</p>
            <p className="text-sm font-semibold text-[#333]">{client.company || "—"}</p>
          </div>
          {/* Phase selector */}
          <div className="bg-[#faf9f7] rounded-[10px] px-[13px] py-[11px] border border-[#f0eeea]">
            <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">Fase</p>
            {isAdmin ? (
              <div className="relative">
                <select
                  value={phase}
                  onChange={e => handlePhaseChange(e.target.value as PhaseId)}
                  disabled={saving}
                  className="text-sm font-semibold text-[#333] bg-transparent appearance-none w-full cursor-pointer pr-5 outline-none disabled:opacity-50"
                >
                  {PHASES.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#ccc] absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <p className="text-sm font-semibold text-[#333]">{ph.label}</p>
            )}
          </div>
        </div>

        <div className="bg-[#faf9f7] rounded-[10px] p-[13px] border border-[#f0eeea] mb-4">
          <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">Próximo paso</p>
          <p className="text-[13px] text-[#666] leading-[1.6]">{client.note || "Sin notas"}</p>
        </div>

        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-[11px] text-red-400 hover:text-red-500 font-medium transition-colors disabled:opacity-50"
          >
            {deleting ? "Eliminando..." : "Eliminar cliente"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add Modal ─────────────────────────────────────────────────────────────────
function AddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: Omit<PipelineClient, "id" | "created_at">) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: "", company: "", phase: "lead" as PhaseId, value: "", note: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await onAdd(form);
    onClose();
  };

  const inputCls = "w-full text-sm bg-[#faf9f7] border border-[#f0eeea] rounded-[10px] px-3 py-2.5 outline-none focus:border-[#f97316] transition-colors placeholder:text-[#ccc]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,15,15,0.2)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[22px] p-[34px] relative border border-[#edeae6] w-[min(92vw,440px)]"
        style={{
          boxShadow: "0 32px 80px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
          animation: "pipelineFadeUp 0.24s cubic-bezier(.22,1,.36,1)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#f3f1ee] flex items-center justify-center text-[#999] hover:bg-[#e8e5e1] hover:text-[#555] transition-colors"
        >
          <X className="w-3 h-3" />
        </button>

        <h2 className="text-[18px] font-bold text-[#1a1a1a] tracking-[-0.5px] mb-6">Nuevo cliente</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">Nombre *</p>
              <input className={inputCls} placeholder="Sofía Ramírez" value={form.name} onChange={set("name")} required />
            </div>
            <div>
              <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">Empresa</p>
              <input className={inputCls} placeholder="Mi Empresa SA" value={form.company} onChange={set("company")} />
            </div>
            <div>
              <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">Valor del deal</p>
              <input className={inputCls} placeholder="$1,200" value={form.value} onChange={set("value")} />
            </div>
            <div>
              <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">Fase</p>
              <select className={inputCls} value={form.phase} onChange={set("phase")}>
                {PHASES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">Próximo paso</p>
            <textarea
              className={inputCls + " resize-none h-20"}
              placeholder="Notas sobre el cliente..."
              value={form.note}
              onChange={set("note")}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="w-full py-3 rounded-xl bg-[#f97316] text-white text-sm font-semibold hover:bg-[#ea6d10] transition-colors disabled:opacity-50 mt-2"
          >
            {saving ? "Guardando..." : "Agregar cliente"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PipelineSection({ isAdmin = false }: { isAdmin?: boolean }) {
  const [clients, setClients]   = useState<PipelineClient[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<PipelineClient | null>(null);
  const [showAdd, setShowAdd]   = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("pipeline_clients")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) console.warn("pipeline fetch error:", error.message);
    setClients((data as PipelineClient[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (form: Omit<PipelineClient, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("pipeline_clients")
      .insert([{ ...form, updated_at: new Date().toISOString() }])
      .select()
      .single();
    if (error) { console.warn("pipeline insert error:", error.message); return; }
    setClients(c => [...c, data as PipelineClient]);
  };

  const handlePhaseChange = async (id: string, phase: PhaseId) => {
    const { error } = await supabase
      .from("pipeline_clients")
      .update({ phase, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { console.warn("pipeline update error:", error.message); return; }
    setClients(c => c.map(x => x.id === id ? { ...x, phase } : x));
    setSelected(s => s?.id === id ? { ...s, phase } : s);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("pipeline_clients").delete().eq("id", id);
    if (error) { console.warn("pipeline delete error:", error.message); return; }
    setClients(c => c.filter(x => x.id !== id));
  };

  if (loading) {
    return (
      <div className="grid gap-3 animate-pulse" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {PHASES.map(p => (
          <div key={p.id} className="rounded-2xl bg-[#f3f1ee] p-3 space-y-2" style={{ minHeight: 200 }}>
            <div className="h-3 w-20 bg-[#e5e2de] rounded" />
            <div className="h-24 bg-white rounded-xl opacity-60" />
            <div className="h-20 bg-white rounded-xl opacity-40" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pipelineFadeUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Add button */}
      {isAdmin && (
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-[#f97316] text-white px-4 py-2 rounded-xl hover:bg-[#ea6d10] transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo cliente
          </button>
        </div>
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {PHASES.map(phase => {
          const phaseClients = clients.filter(c => c.phase === phase.id);
          return (
            <div
              key={phase.id}
              className="rounded-2xl flex flex-col gap-2.5"
              style={{ background: "#f3f1ee", padding: "14px 12px" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#e5e2de] mb-0.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: phase.color, boxShadow: "0 0 0 3px rgba(0,0,0,0.06)" }}
                  />
                  <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#888]">
                    {phase.label}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[#aaa] bg-[#e5e2de] rounded-full px-2 py-0.5">
                  {phaseClients.length}
                </span>
              </div>

              {/* Cards or empty */}
              {phaseClients.length === 0 ? (
                <EmptyCol isAdmin={isAdmin} onAdd={() => setShowAdd(true)} />
              ) : (
                phaseClients.map((client, i) => (
                  <PipelineCard
                    key={client.id}
                    client={client}
                    index={i}
                    onClick={() => setSelected(client)}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <DetailModal
          client={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onPhaseChange={handlePhaseChange}
          onDelete={handleDelete}
        />
      )}

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdd={handleAdd}
        />
      )}
    </>
  );
}
