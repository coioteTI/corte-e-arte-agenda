import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const services = [
  {
    id: 1,
    name: "Corte Masculino",
    duration: 30,
    price: 35,
    description: "Corte personalizado com acabamento"
  },
  {
    id: 2,
    name: "Barba Completa",
    duration: 20,
    price: 25,
    description: "Aparar e modelar a barba"
  },
  {
    id: 3,
    name: "Corte + Barba",
    duration: 45,
    price: 55,
    description: "Combo completo"
  },
  {
    id: 4,
    name: "Corte Feminino",
    duration: 60,
    price: 65,
    description: "Corte e finalização"
  }
];

const professionals = [
  { id: 1, name: "João Silva", specialty: "Barbeiro" },
  { id: 2, name: "Maria Santos", specialty: "Cabeleireira" },
  { id: 3, name: "Pedro Costa", specialty: "Barbeiro" }
];

const availableTimes = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
];

export const BookingSection = () => {
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const { toast } = useToast();

  const handleBooking = () => {
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime) {
      toast({
        title: "Erro no agendamento",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }

    const service = services.find(s => s.id === selectedService);
    const professional = professionals.find(p => p.id === parseInt(selectedProfessional));
    
    toast({
      title: "Agendamento realizado!",
      description: `${service?.name} com ${professional?.name} em ${selectedDate.toLocaleDateString()} às ${selectedTime}`,
    });
  };

  return (
    <section className="py-16 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Agende seu Horário</h2>
          <p className="text-muted-foreground text-lg">
            Escolha o serviço, profissional e horário de sua preferência
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Serviços */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Escolha o Serviço</CardTitle>
                <CardDescription>
                  Selecione o serviço desejado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedService === service.id
                        ? "border-primary bg-accent"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => setSelectedService(service.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {service.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">
                          R$ {service.price}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {service.duration} min
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profissional</CardTitle>
                <CardDescription>
                  Selecione o profissional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((prof) => (
                      <SelectItem key={prof.id} value={prof.id.toString()}>
                        {prof.name} - {prof.specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Agendamento */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Escolha a Data</CardTitle>
                <CardDescription>
                  Selecione o dia do seu atendimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => 
                    date < new Date() || date.getDay() === 0 // Domingo fechado
                  }
                  className="rounded-md border w-full"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Horário Disponível</CardTitle>
                <CardDescription>
                  Escolha o melhor horário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {availableTimes.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTime(time)}
                      className="text-sm"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleBooking}
              className="w-full" 
              size="lg"
            >
              Confirmar Agendamento
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};