import { useState, useEffect } from "react";
import { X } from "lucide-react";

// ── Data ──────────────────────────────────────────────────────────────────────
const PHASES = [
  { id: "lead",        label: "Lead",        color: "#94a3b8", bg: "#f1f5f9", text: "#64748b" },
  { id: "contactado",  label: "Contactado",  color: "#60a5fa", bg: "#eff6ff", text: "#3b82f6" },
  { id: "propuesta",   label: "Propuesta",   color: "#f97316", bg: "#fff7ed", text: "#f97316" },
  { id: "negociacion", label: "Negociación", color: "#a78bfa", bg: "#f5f3ff", text: "#7c3aed" },
  { id: "cerrado",     label: "Cerrado",     color: "#34d399", bg: "#f0fdf4", text: "#059669" },
] as const;

type PhaseId = typeof PHASES[number]["id"];

interface Client {
  name: string;
  company: string;
  phase: PhaseId;
  value: string;
  date: string;
  note: string;
}

const CLIENTS: Client[] = [
  { name: "Sofía Ramírez",  company: "Ropa Sofía MX",     phase: "lead",        value: "$1,200", date: "12 Feb", note: "Interesada en anuncios de Meta para su tienda de ropa." },
  { name: "Carlos Mendoza", company: "Gym FitPro",         phase: "lead",        value: "$800",   date: "14 Feb", note: "Busca más seguidores y clientes para su gimnasio local." },
  { name: "Laura Torres",   company: "Café Origen",        phase: "contactado",  value: "$950",   date: "18 Feb", note: "Propuesta inicial enviada. Espera revisarla con su socio." },
  { name: "Pedro Guzmán",   company: "Agencia Pixel",      phase: "contactado",  value: "$2,400", date: "20 Feb", note: "Busca automatizar reportes de clientes. Muy interesado." },
  { name: "Ana Castillo",   company: "Clínica Bella Piel", phase: "contactado",  value: "$1,800", date: "22 Feb", note: "Espera presupuesto detallado. Lista para avanzar." },
  { name: "Diego Salinas",  company: "Restaurante El Sur", phase: "propuesta",   value: "$1,100", date: "25 Feb", note: "Reunión programada para el jueves. Buen feeling." },
  { name: "María López",    company: "Escuela de Yoga",    phase: "propuesta",   value: "$700",   date: "26 Feb", note: "Evaluando opciones. Hay competencia con otra agencia." },
  { name: "Roberto Vega",   company: "Inmobiliaria RV",    phase: "negociacion", value: "$3,500", date: "1 Mar",  note: "Quiere reducir el paquete a 3 meses. Negociando precio." },
  { name: "Valeria Mora",   company: "Boutique Valeria",   phase: "negociacion", value: "$1,600", date: "2 Mar",  note: "Acuerdo casi cerrado. Pendiente firma de contrato." },
  { name: "Javier Núñez",   company: "Tech Startup JN",   phase: "cerrado",     value: "$4,200", date: "5 Mar",  note: "Contrato firmado. Inicio de campaña el 10 de marzo." },
  { name: "Isabella Chen",  company: "Skincare Brand",     phase: "cerrado",     value: "$2,900", date: "6 Mar",  note: "Cliente activo. Primera semana de anuncios en curso." },
];

// ── Card ─────────────────────────────────────────────────────────────────────
function PipelineCard({
  client, phase, index, onClick,
}: {
  client: Client;
  phase: typeof PHASES[number];
  index: number;
  onClick: () => void;
}) {
  const [visible, setVisible] = useState(false);

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
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.4s ease, transform 0.4s ease, box-shadow 0.18s ease",
        boxShadow: "none",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.09)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
      }}
    >
      {/* sheen */}
      <div
        className="absolute inset-0 pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0) 60%, rgba(249,115,22,0.03) 100%)" }}
      />

      <div className="p-[14px_15px]">
        <p className="text-[13px] font-semibold text-[#1a1a1a] mb-0.5 tracking-[-0.2px]">{client.name}</p>
        <p className="text-[11px] text-[#bbb] font-normal mb-3">{client.company}</p>
        <p className="text-[18px] font-bold text-[#f97316] mb-1.5 tracking-[-0.5px]">{client.value}</p>
        <p
          className="text-[11px] text-[#aaa] leading-[1.5]"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {client.note}
        </p>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#f5f3f0]">
          <span className="text-[10px] text-[#ccc] tracking-[0.3px]">{client.date}</span>
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

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ client, phase, onClose }: {
  client: Client;
  phase: typeof PHASES[number];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,15,15,0.2)", backdropFilter: "blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[22px] p-[34px] relative border border-[#edeae6]"
        style={{
          width: "min(92vw, 440px)",
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

        <span
          className="inline-block text-[9px] font-semibold tracking-[1.5px] uppercase px-3 py-1 rounded-full mb-3.5"
          style={{ background: phase.bg, color: phase.text }}
        >
          {phase.label}
        </span>
        <h2 className="text-[22px] font-bold text-[#1a1a1a] tracking-[-0.5px] mb-0.5">{client.name}</h2>
        <p className="text-[13px] text-[#bbb] mb-[22px]">{client.company}</p>

        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          {[
            { label: "Valor del deal",      value: client.value,   orange: true },
            { label: "En pipeline desde",   value: client.date,    orange: false },
            { label: "Fase actual",         value: phase.label,    orange: false },
            { label: "Empresa",             value: client.company, orange: false },
          ].map(f => (
            <div key={f.label} className="bg-[#faf9f7] rounded-[10px] px-[13px] py-[11px] border border-[#f0eeea]">
              <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">{f.label}</p>
              <p className={`text-sm font-semibold ${f.orange ? "text-[#f97316]" : "text-[#333]"}`}>{f.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#faf9f7] rounded-[10px] p-[13px] border border-[#f0eeea]">
          <p className="text-[9px] font-semibold tracking-[1.5px] uppercase text-[#ccc] mb-1.5">Próximo paso</p>
          <p className="text-[13px] text-[#666] leading-[1.6]">{client.note}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PipelineSection() {
  const [selected, setSelected] = useState<{ client: Client; phase: typeof PHASES[number] } | null>(null);

  return (
    <>
      <style>{`
        @keyframes pipelineFadeUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {PHASES.map(phase => {
          const phaseClients = CLIENTS.filter(c => c.phase === phase.id);
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

              {/* Cards */}
              {phaseClients.map((client, i) => (
                <PipelineCard
                  key={client.name}
                  client={client}
                  phase={phase}
                  index={i}
                  onClick={() => setSelected({ client, phase })}
                />
              ))}
            </div>
          );
        })}
      </div>

      {selected && (
        <Modal
          client={selected.client}
          phase={selected.phase}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
