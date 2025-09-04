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
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  const [saveForFuture, setSaveForFuture] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "info" | "error" | "success"; text: string } | null>(null);

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

  useEffect(() => { setSelectedProfessionalId(undefined); setSelectedDate(undefined); setSelectedTime(undefined); }, [selectedServiceId]);
  useEffect(() => { setSelectedDate(undefined); setSelectedTime(undefined); }, [selectedProfessionalId]);

  function validate() {
    if (!fullName.trim()) return "Preencha o nome completo.";
    if (!whatsapp.trim()) return "Preencha o WhatsApp.";
    if (!selectedServiceId) return "Selecione um serviço.";
    if (!selectedProfessionalId) return "Selecione um profissional.";
    if (!selectedDate) return "Selecione uma data.";
    if (!selectedTime) return "Selecione um horário.";
    return null;
  }

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

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Botão Voltar */}
      <div className="mb-6">
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.history.back()}
        >
          🔙 Voltar
        </Button>
      </div>

      {/* Header card */}
      <Card className="mb-6 bg-neutral-800">
        <CardHeader>
          <CardTitle>Agendar em Barbearia Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-2">Preencha os dados para confirmar seu agendamento</p>
        </CardContent>
      </Card>

      {/* Horários de Funcionamento */}
      <Card className="mb-6 bg-neutral-800">
        <CardHeader>
          <CardTitle>Horários de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div><strong>Segunda</strong><div>08:00 - 18:00</div></div>
            <div><strong>Terça</strong><div>08:00 - 18:00</div></div>
            <div><strong>Quarta</strong><div>08:00 - 18:00</div></div>
            <div><strong>Quinta</strong><div>08:00 - 18:00</div></div>
            <div><strong>Sexta</strong><div>08:00 - 18:00</div></div>
            <div><strong>Sábado</strong><div>08:00 - 18:00</div></div>
            <div><strong>Domingo</strong><div>Fechado</div></div>
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
            {/* Seus Dados */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Seus Dados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome completo *</Label>
                  <Input placeholder="Ex: Elizeu Matos" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label>WhatsApp *</Label>
                  <Input placeholder="+55 11 9xxxx-xxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <Label>E-mail (opcional)</Label>
                  <Input placeholder="seuemail@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Serviço */}
            <div className="mb-4">
              <Label>Escolha o Serviço *</Label>
              <Select value={selectedServiceId} onValueChange={(v) => setSelectedServiceId(v || undefined)}>
                <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Profissional */}
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

            {/* Data e horário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label>Data *</Label>
                <Input type="date" min={todayIso()} value={selectedDate ?? ""} onChange={(e) => setSelectedDate(e.target.value || undefined)} disabled={!selectedProfessionalId} className="border-blue-500 focus:ring-blue-400" />
              </div>
              <div>
                <Label>Horário *</Label>
                <Select value={selectedTime} onValueChange={(v) => setSelectedTime(v || undefined)}>
                  <SelectTrigger><SelectValue placeholder="Selecione horário" /></SelectTrigger>
                  <SelectContent>
                    {selectedProfessionalId && selectedDate ? (
                      availableTimes.length ? availableTimes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)
                        : <SelectItem value="none" disabled>Sem horários disponíveis</SelectItem>
                    ) : <SelectItem value="none" disabled>Selecione profissional e data</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-4">
              <Label>Observações (opcional)</Label>
              <Textarea placeholder="Ex: Preferência de estilo, alguma observação especial..." />
            </div>

            <div className="flex items-center gap-2 mb-6">
              <Checkbox checked={saveForFuture} onCheckedChange={(v) => setSaveForFuture(Boolean(v))} />
              <span className="text-sm">Salvar minhas informações para agendamentos futuros</span>
            </div>

            {message && (
              <div className={`p-3 rounded mb-4 ${message.type === "error" ? "bg-red-600" : message.type === "success" ? "bg-green-600" : "bg-gray-600"}`}>
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting} className="bg-cyan-600 hover:bg-cyan-700">
                {submitting ? "Confirmando..." : "Agendar Agora"}
              </Button>
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
