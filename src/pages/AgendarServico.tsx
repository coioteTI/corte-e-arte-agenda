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
  // Form fields
  const [fullName, setFullName] = useState<string>("");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // Selects
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);

  // Other
  const [saveForFuture, setSaveForFuture] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "info" | "error" | "success"; text: string } | null>(
    null
  );

  // Botões ativos
  const [activeButton, setActiveButton] = useState<"whatsapp" | "instagram" | null>(null);

  const businessInfo = {
    whatsapp: "https://wa.me/5511944888778",
    instagram: "https://instagram.com/barbeariateste",
    email: "Teste4526@gmail.com",
  };

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
        localStorage.setItem(
          "agendamento_form_v1",
          JSON.stringify({ fullName, whatsapp, email })
        );
      } else {
        localStorage.removeItem("agendamento_form_v1");
      }

      setMessage({
        type: "success",
        text: `Agendamento pré-confirmado para ${selectedDate} às ${selectedTime}. Em breve confirmaremos via WhatsApp.`,
      });

      setSelectedServiceId(undefined);
      setSelectedProfessionalId(undefined);
      setSelectedDate(undefined);
      setSelectedTime(undefined);
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: "Erro ao confirmar agendamento. Tente novamente.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function todayIso() {
    const t = new Date();
    return t.toISOString().split("T")[0];
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header card */}
      <Card className="mb-4 bg-neutral-800">
        <CardHeader>
          <CardTitle>Agendar em Barbearia Teste</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-2">Preencha os dados para confirmar seu agendamento</p>
          <div className="flex gap-3 items-center">
            <div className="w-12 h-12 rounded-full bg-yellow-600 flex items-center justify-center text-black font-bold">
              B
            </div>
            <div className="flex-1">
              <div className="text-sm">
                Rua Rubens Lopes da Silva, 250, Parque das Igrejas, Jandira, São Paulo
              </div>
              <div className="flex gap-2 mt-2">
                <a href={businessInfo.whatsapp} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="sm"
                    onClick={() => setActiveButton("whatsapp")}
                    className={`${
                      activeButton === "whatsapp"
                        ? "bg-green-600 text-white hover:bg-green-700"
                        : "bg-neutral-700 hover:bg-neutral-600"
                    }`}
                  >
                    WhatsApp
                  </Button>
                </a>
                <a href={businessInfo.instagram} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="sm"
                    onClick={() => setActiveButton("instagram")}
                    className={`${
                      activeButton === "instagram"
                        ? "bg-pink-600 text-white hover:bg-pink-700"
                        : "bg-neutral-700 hover:bg-neutral-600"
                    }`}
                  >
                    Instagram
                  </Button>
                </a>
                <a href={`mailto:${businessInfo.email}`}>
                  <Button size="sm" className="bg-neutral-700 hover:bg-neutral-600">
                    {businessInfo.email}
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resto do formulário continua igual */}
      ...
    </div>
  );
}
