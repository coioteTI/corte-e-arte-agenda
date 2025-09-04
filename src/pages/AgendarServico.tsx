// AgendarServico.tsx
import { useEffect, useMemo, useState } from "react";
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

/**
 * Comportamento implementado:
 * - evita "tela preta" (nunca esconde todo componente por loading).
 * - selects controlados e encadeados (serviço -> profissionais -> datas -> horário).
 * - salvamento local (localStorage) quando marcar "Salvar minhas informações".
 * - validação mínima antes de confirmar.
 * - mensagens de erro/sucesso simples.
 * - botões com glow pulsante neon e botão GPS.
 */

type Service = {
  id: string;
  title: string;
  durationMinutes: number;
  price?: number;
};

type Professional = {
  id: string;
  name: string;
  servicesIds: string[];
  availability: Record<number, string[]>;
};

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
      1: ["08:00", "09:00", "10:00", "14:00", "15:00"],
      2: ["08:00", "09:00", "10:00", "14:00", "15:00"],
      3: ["08:00", "09:00", "10:00", "14:00", "15:00"],
      4: ["08:00", "09:00", "10:00", "14:00", "15:00"],
      5: ["08:00", "09:00", "10:00", "14:00", "15:00"],
      6: ["09:00", "10:00"],
      0: [],
    },
  },
  {
    id: "p2",
    name: "Lucas",
    servicesIds: ["s1", "s3"],
    availability: {
      1: ["09:00", "10:00", "11:00", "16:00"],
      2: ["09:00", "10:00", "11:00", "16:00"],
      3: ["09:00", "10:00", "11:00", "16:00"],
      4: ["09:00", "10:00", "11:00", "16:00"],
      5: ["09:00", "10:00", "11:00", "16:00"],
      6: [],
      0: [],
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
    if (Number.isNaN(dt.getTime())) return [];
    const weekday = dt.getDay();
    return prof.availability[weekday] ?? [];
  }, [selectedProfessionalId, selectedDate, professionals]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("agendamento_form_v1");
      if (saved) {
        const obj = JSON.parse(saved);
        setFullName(obj.fullName || "");
        setWhatsapp(obj.whatsapp || "");
        setEmail(obj.email || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    setSelectedProfessionalId(undefined);
    setSelectedDate(undefined);
    setSelectedTime(undefined);
  }, [selectedServiceId]);

  useEffect(() => {
    setSelectedDate(undefined);
    setSelectedTime(undefined);
  }, [selectedProfessionalId]);

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
    if (err) {
      setMessage({ type: "error", text: err });
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 900));
      if (saveForFuture) {
        localStorage.setItem("agendamento_form_v1", JSON.stringify({ fullName, whatsapp, email }));
      } else {
        localStorage.removeItem("agendamento_form_v1");
      }
      setMessage({ type: "success", text: `Agendamento pré-confirmado para ${selectedDate} às ${selectedTime}. Em breve confirmaremos via WhatsApp.` });
      setSelectedServiceId(undefined);
      setSelectedProfessionalId(undefined);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
    } catch {
      setMessage({ type: "error", text: "Erro ao confirmar agendamento. Tente novamente." });
    } finally {
      setSubmitting(false);
    }
  }

  function todayIso() {
    return new Date().toISOString().split("T")[0];
  }

  // Endereço da empresa para GPS
  const enderecoGoogleMaps = encodeURIComponent("Rua Rubens Lopes da Silva, 250, Parque das Igrejas, Jandira, São Paulo");

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header card com botões de ação */}
      <Card className="mb-4 bg-neutral-800">
        <CardHeader>
          <CardTitle>Agendar em Barbearia Teste</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <a
            href="https://wa.me/5511944887878"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg font-semibold text-white transition-transform duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg hover:shadow-[0_0_20px_#25D366] animate-pulse"
            style={{ backgroundColor: "#25D366" }}
          >
            WhatsApp
          </a>

          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg font-semibold text-white transition-transform duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg hover:shadow-[0_0_20px_#DD2A7B] animate-pulse"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #F58529, #FEDA77, #DD2A7B, #8134AF, #515BD4)",
            }}
          >
            Instagram
          </a>

          <a
            href="mailto:teste52@gmail.com"
            className="px-4 py-2 rounded-lg font-semibold text-white transition-transform duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg hover:shadow-[0_0_20px_#4285F4] animate-pulse"
            style={{ backgroundColor: "#4285F4" }}
          >
            E-mail
          </a>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${enderecoGoogleMaps}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg font-semibold text-white transition-transform duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg hover:shadow-[0_0_20px_#FF9900] animate-pulse"
            style={{ backgroundColor: "#FF9900" }}
          >
            GPS
          </a>
        </CardContent>
      </Card>

      {/* Horários */}
      <Card className="mb-4 bg-neutral-800">
        <CardHeader>
          <CardTitle>Horários de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold">Segunda-feira</div>
              <div>08:00 - 18:00</div>
            </div>
            <div>
              <div className="font-semibold">Terça-feira</div>
              <div>08:00 - 18:00</div>
            </div>
            <div>
              <div className="font-semibold">Quarta-feira</div>
              <div>08:00 - 18:00</div>
            </div>
            <div>
              <div className="font-semibold">Quinta-feira</div>
              <div>08:00 - 18:00</div>
            </div>
            <div>
              <div className="font-semibold">Sexta-feira</div>
              <div>08:00 - 18:00</div>
            </div>
            <div>
              <div className="font-semibold">Sábado</div>
              <div>08:00 - 18:00</div>
            </div>
            <div>
              <div className="font-semibold">Domingo</div>
              <div>Fechado</div>
            </div>
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
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Seus Dados</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome completo *</Label>
                  <Input
                    placeholder="Ex: Elizeu Matos"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>WhatsApp *</Label>
                  <Input
                    placeholder="+55 11 9xxxx-xxxx"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>

                <div>
                  <Label>E-mail (opcional)</Label>
                  <Input
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            {/* Escolha o Serviço */}
            <div className="mb-4">
              <Label>Escolha o Serviço *</Label>
              <Select value={selectedServiceId} onValueChange={(v) => setSelectedServiceId(v || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Profissional */}
            <div className="mb-4">
              <Label>Profissional *</Label>
              <Select value={selectedProfessionalId} onValueChange={(v) => setSelectedProfessionalId(v || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {filteredProfessionals.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhum profissional disponível para este serviço
                    </SelectItem>
                  )}
                  {filteredProfessionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data e Horário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  min={todayIso()}
                  value={selectedDate ?? ""}
                  onChange={(e) => setSelectedDate(e.target.value || undefined)}
                  disabled={!selectedProfessionalId}
                />
                {!selectedProfessionalId && <p className="text-xs text-muted-foreground mt-1">Selecione um profissional primeiro</p>}
              </div>

              <div>
                <Label>Horário *</Label>
                <Select value={selectedTime} onValueChange={(v) => setSelectedTime(v || undefined)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProfessionalId && selectedDate ? (
                      availableTimes.length ? (
                        availableTimes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Sem horários disponíveis nesta data
                        </SelectItem>
                      )
                    ) : (
                      <SelectItem value="none" disabled>
                        Selecione profissional e data
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Observações */}
            <div className="mb-4">
              <Label>Observações (opcional)</Label>
              <Textarea placeholder="Ex: Preferência de estilo, alguma observação especial..." />
            </div>

            {/* Salvar info */}
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
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-lg font-semibold text-white transition-transform duration-300 ease-in-out transform hover:scale-105 shadow-md hover:shadow-lg hover:shadow-[0_0_25px_#FF00FF] animate-pulse"
                style={{ backgroundColor: "#FF00FF" }}
              >
                {submitting ? "Confirmando..." : "Confirmar Agendamento"}
              </button>
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
