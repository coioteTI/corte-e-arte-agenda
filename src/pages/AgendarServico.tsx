// AgendarServico.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

/* Tipos de dados */
type Service = { id: string; title: string; durationMinutes: number; price?: number };
type Professional = {
  id: string;
  name: string;
  servicesIds: string[];
  availability: Record<number, string[]>;
};

/* Dados mock */
const MOCK_SERVICES: Service[] = [
  { id: "s1", title: "Corte Masculino", durationMinutes: 30, price: 30 },
  { id: "s2", title: "Barba", durationMinutes: 20, price: 20 },
  { id: "s3", title: "Corte + Barba", durationMinutes: 50, price: 45 },
];
const MOCK_PROFESSIONALS: Professional[] = [
  {
    id: "p1",
    name: "Pedro",
    servicesIds: ["s1", "s2", "s3"],
    availability: {
      0: [],
      1: ["08:00", "09:00", "10:00", "14:00", "15:00"],
      2: ["08:00", "09:00", "10:00", "14:00", "15:00"],
      3: ["08:00", "09:00", "10:00", "14:00", "15:00"],
      4: ["08:00", "09:00", "10:00", "14:00", "15:00"],
      5: ["08:00", "09:00", "10:00", "14:00", "15:00"],
      6: ["09:00", "10:00"],
    },
  },
  {
    id: "p2",
    name: "Lucas",
    servicesIds: ["s1", "s3"],
    availability: {
      0: [],
      1: ["09:00", "10:00", "11:00", "16:00"],
      2: ["09:00", "10:00", "11:00", "16:00"],
      3: ["09:00", "10:00", "11:00", "16:00"],
      4: ["09:00", "10:00", "11:00", "16:00"],
      5: ["09:00", "10:00", "11:00", "16:00"],
      6: [],
    },
  },
];

export default function AgendarServico() {
  // Form fields
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");

  // Selects
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);

  // Other
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);

  /* Pega dados do localStorage */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("agendamento_form_v1");
      if (saved) {
        const obj = JSON.parse(saved);
        setFullName(obj.fullName || "");
        setWhatsapp(obj.whatsapp || "");
        setEmail(obj.email || "");
      }
    } catch (e) {
      console.warn("Erro ao ler storage", e);
    }
  }, []);

  /* Derived lists */
  const services = useMemo(() => MOCK_SERVICES, []);
  const professionals = useMemo(() => MOCK_PROFESSIONALS, []);
  const filteredProfessionals = useMemo(() => {
    if (!selectedServiceId) return professionals;
    return professionals.filter((p) => p.servicesIds.includes(selectedServiceId));
  }, [professionals, selectedServiceId]);

  const availableTimes = useMemo(() => {
    if (!selectedProfessionalId || !selectedDate) return [];
    const prof = professionals.find((p) => p.id === selectedProfessionalId);
    if (!prof) return [];
    const dt = new Date(selectedDate + "T00:00:00");
    if (isNaN(dt.getTime())) return [];
    const weekday = dt.getDay();
    return prof.availability[weekday] ?? [];
  }, [selectedProfessionalId, selectedDate, professionals]);

  /* Reset dependências quando muda serviço ou profissional */
  useEffect(() => { setSelectedProfessionalId(undefined); setSelectedDate(undefined); setSelectedTime(undefined); }, [selectedServiceId]);
  useEffect(() => { setSelectedDate(undefined); setSelectedTime(undefined); }, [selectedProfessionalId]);

  /* Validação simples */
  function validate() {
    if (!fullName.trim()) return "Preencha o nome completo.";
    if (!whatsapp.trim()) return "Preencha o WhatsApp.";
    if (!selectedServiceId) return "Selecione um serviço.";
    if (!selectedProfessionalId) return "Selecione um profissional.";
    if (!selectedDate) return "Selecione uma data.";
    if (!selectedTime) return "Selecione um horário.";
    return null;
  }

  /* Confirmar agendamento */
  async function handleConfirm(e?: React.FormEvent) {
    e?.preventDefault();
    setMessage(null);
    const err = validate();
    if (err) { setMessage({ type: "error", text: err }); return; }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      if (saveForFuture) {
        localStorage.setItem("agendamento_form_v1", JSON.stringify({ fullName, whatsapp, email }));
      } else {
        localStorage.removeItem("agendamento_form_v1");
      }
      setMessage({ type: "success", text: `Agendamento pré-confirmado para ${selectedDate} às ${selectedTime}. Em breve confirmaremos via WhatsApp.` });
      setSelectedServiceId(undefined); setSelectedProfessionalId(undefined); setSelectedDate(undefined); setSelectedTime(undefined);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erro ao confirmar agendamento. Tente novamente." });
    } finally { setSubmitting(false); }
  }

  function todayIso() { return new Date().toISOString().split("T")[0]; }

  /* Estilo CSS para glow pulsante */
  const glowStyle = {
    transition: "all 0.3s ease-in-out",
    boxShadow: "0 0 8px rgba(255,255,255,0.6)",
  } as const;

  const glowHover = {
    boxShadow: "0 0 15px rgba(0,255,255,0.7)",
    transform: "scale(1.05)",
  } as const;

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Botão Voltar */}
      <div className="mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.history.back()}
          style={{ marginBottom: "1rem" }}
        >
          🔙 Voltar
        </Button>
      </div>

      {/* Header card */}
      <Card className="mb-4 bg-neutral-800">
        <CardHeader>
          <CardTitle>Agendar em Barbearia Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-2">Preencha os dados para confirmar seu agendamento</p>
          <div className="flex gap-2">
            <a
              href="https://wa.me/5511944887878"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-semibold text-white"
              style={{ ...glowStyle, backgroundColor: "#25D366" }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, glowHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, glowStyle)}
            >
              📱 WhatsApp
            </a>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-semibold text-white"
              style={{ ...glowStyle, backgroundImage: "linear-gradient(45deg, #F58529, #FEDA77, #DD2A7B, #8134AF, #515BD4)", backgroundClip: "text", color: "white" }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, glowHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, glowStyle)}
            >
              📸 Instagram
            </a>

            <a
              href="mailto:teste52@gmail.com"
              className="px-4 py-2 rounded-lg font-semibold text-white"
              style={{ ...glowStyle, backgroundColor: "#4285F4" }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, glowHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, glowStyle)}
            >
              ✉️ E-mail
            </a>

            <a
              href="https://www.google.com/maps/search/?api=1&query=Rua+Rubens+Lopes+da+Silva+250+Jandira+SP"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg font-semibold text-white"
              style={{ ...glowStyle, backgroundColor: "#FF0066" }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, glowHover)}
              onMouseLeave={(e) => Object.assign(e.currentTarget.style, glowStyle)}
            >
              📍 GPS
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleConfirm}>
        <Card className="bg-neutral-800">
          <CardHeader>
            <CardTitle>Dados do Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Seus Dados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome completo *</Label>
                  <Input placeholder="Ex: Elizeu Matos" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label>WhatsApp *</Label>
                  <Input placeholder="+55 11 9xxxx-xxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </div>
                <div>
                  <Label>E-mail (opcional)</Label>
                  <Input placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            <div className="mb-4">
              <Label>Escolha o Serviço *</Label>
              <Select value={selectedServiceId} onValueChange={(v) => setSelectedServiceId(v || undefined)}>
                <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <Label>Profissional *</Label>
              <Select value={selectedProfessionalId} onValueChange={(v) => setSelectedProfessionalId(v || undefined)}>
                <SelectTrigger><SelectValue placeholder="Selecione um profissional" /></SelectTrigger>
                <SelectContent>
                  {filteredProfessionals.length === 0 && <SelectItem value="none" disabled>Nenhum profissional disponível</SelectItem>}
                  {filteredProfessionals.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <Label>Data *</Label>
                <Input type="date" min={todayIso()} value={selectedDate ?? ""} onChange={(e) => setSelectedDate(e.target.value || undefined)} disabled={!selectedProfessionalId} />
              </div>
              <div>
                <Label>Horário *</Label>
                <Select value={selectedTime} onValueChange={(v) => setSelectedTime(v || undefined)}>
                  <SelectTrigger><SelectValue placeholder="Selecione horário" /></SelectTrigger>
                  <SelectContent>
                    {selectedProfessionalId && selectedDate ? (
                      availableTimes.length ? (
                        availableTimes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)
                      ) : <SelectItem value="none" disabled>Sem horários disponíveis</SelectItem>
                    ) : <SelectItem value="none" disabled>Selecione profissional e data</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-4">
              <Label>Observações (opcional)</Label>
              <Textarea placeholder="Ex: Preferência de estilo, alguma observação especial..." />
            </div>

            <div className="flex items-center gap-2 mb-4">
              <Checkbox checked={saveForFuture} onCheckedChange={(v) => setSaveForFuture(Boolean(v))} />
              <span className="text-sm">Salvar minhas informações para agendamentos futuros</span>
            </div>

            {message && (
              <div className={`p-3 rounded mb-4 ${message.type === "error" ? "bg-red-600" : message.type === "success" ? "bg-green-600" : "bg-gray-600"}`}>
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>{submitting ? "Confirmando..." : "Confirmar Agendamento"}</Button>
            </div>

            <div className="text-xs mt-4 p-3 bg-neutral-900 rounded">
              Importante: Este é um pré-agendamento. A barbearia entrará em contato via WhatsApp para confirmar a disponibilidade do horário solicitado.
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
