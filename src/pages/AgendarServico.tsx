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
  const [fullName, setFullName] = useState<string>("");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);

  const [saveForFuture, setSaveForFuture] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
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
    if (Number.isNaN(dt.getTime())) return [];
    const weekday = dt.getDay();
    return prof.availability[weekday] ?? [];
  }, [selectedProfessionalId, selectedDate, professionals]);

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

      setMessage({
        type: "success",
        text: "✅ Agendamento realizado com sucesso! Obrigado por escolher nossa barbearia.",
      });

      setSelectedServiceId(undefined);
      setSelectedProfessionalId(undefined);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erro ao confirmar agendamento. Tente novamente." });
    } finally {
      setSubmitting(false);
    }
  }

  function todayIso() {
    return new Date().toISOString().split("T")[0];
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Botão Voltar no topo */}
      <div className="mb-4">
        <Button type="button" onClick={() => history.back()} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white shadow">
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
          {/* Botões de contato com espaçamento e emojis */}
          <div className="flex gap-6 mb-4 flex-wrap">
            <a
              href="https://wa.me/5511944887878"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-xl font-semibold text-white hover:scale-105 transition-all shadow-md"
              style={{ backgroundColor: "#25D366", boxShadow: "0 0 12px #25D366" }}
            >
              📱 WhatsApp
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-xl font-semibold text-white hover:scale-105 transition-all shadow-md"
              style={{ backgroundImage: "linear-gradient(45deg, #F58529, #FEDA77, #DD2A7B, #8134AF, #515BD4)", boxShadow: "0 0 12px #F58529" }}
            >
              📸 Instagram
            </a>
            <a
              href="mailto:teste52@gmail.com"
              className="px-5 py-2 rounded-xl font-semibold text-white hover:scale-105 transition-all shadow-md"
              style={{ backgroundColor: "#4285F4", boxShadow: "0 0 12px #4285F4" }}
            >
              ✉️ E-mail
            </a>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Rua+Rubens+Lopes+da+Silva+250+Jandira+SP"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-xl font-semibold text-white hover:scale-105 transition-all shadow-md"
              style={{ backgroundColor: "#FF0066", boxShadow: "0 0 12px #FF0066" }}
            >
              📍 GPS
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Horários de Funcionamento estilizado */}
      <Card className="mb-4 bg-neutral-800">
        <CardHeader>
          <CardTitle>Horários de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ["Domingo", "Fechado"],
              ["Segunda-feira", "08:00 - 18:00"],
              ["Terça-feira", "08:00 - 18:00"],
              ["Quarta-feira", "08:00 - 18:00"],
              ["Quinta-feira", "08:00 - 18:00"],
              ["Sexta-feira", "08:00 - 18:00"],
              ["Sábado", "08:00 - 18:00"],
            ].map(([day, hours]) => (
              <div key={day} className="p-3 rounded-lg bg-neutral-700 shadow-md text-center hover:bg-neutral-600 transition">
                <div className="font-semibold">{day}</div>
                <div>{hours}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Formulário */}
      <form onSubmit={handleConfirm}>
        <Card className="bg-neutral-800">
          <CardHeader>
            <CardTitle>Dados do Agendamento</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Seus Dados */}
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
