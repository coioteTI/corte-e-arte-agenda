// AgendarServico.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBusinessHours } from "@/hooks/useBusinessHours";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const loadSavedClientData = () => {
  try {
    const saved = localStorage.getItem("clientData");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveClientData = async (data: any, userId?: string) => {
  try {
    localStorage.setItem("clientData", JSON.stringify(data));

    if (userId) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingClient) {
        await supabase
          .from("clients")
          .update({
            name: data.nome,
            phone: data.telefone,
            email: data.email,
          })
          .eq("user_id", userId);
      }
    }
  } catch (err) {
    console.error("Erro ao salvar dados:", err);
  }
};

const AgendarServico = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [company, setCompany] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { isDateAvailable } = useBusinessHours(company?.id || "");

  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    servicoId: "",
    professionalId: "",
    data: "",
    horario: "",
    observacoes: "",
  });

  const [saveData, setSaveData] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        await fetchCompanyData();
        await loadSavedData();
      } catch (err) {
        console.error("Erro ao inicializar:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [slug]);

  const loadSavedData = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      let clientData = null;

      if (user) {
        const { data: dbClient } = await supabase
          .from("clients")
          .select("name, phone, email")
          .eq("user_id", user.id)
          .maybeSingle();

        if (dbClient) clientData = dbClient;
      }

      if (!clientData) {
        clientData = loadSavedClientData();
      }

      if (clientData) {
        setFormData(prev => ({
          ...prev,
          nome: clientData.name || clientData.nome || "",
          telefone: clientData.phone || clientData.telefone || "",
          email: clientData.email || clientData.email || "",
        }));
        setSaveData(true);
      }
    } catch (err) {
      console.error("Erro ao carregar cliente:", err);
    }
  };

  const fetchCompanyData = async () => {
    try {
      const { data: companies, error } = await supabase
        .from("companies")
        .select("id, name, address, number, neighborhood, city, state, zip_code, business_hours")
        .limit(10);

      if (error) throw error;
      if (!companies) return;

      const foundCompany =
        companies.find(c => c.name?.toLowerCase().replace(/\s+/g, "-") === slug) ||
        companies[0];

      if (foundCompany) {
        setCompany(foundCompany);

        const { data: servicesData } = await supabase
          .from("services")
          .select("*")
          .eq("company_id", foundCompany.id);
        setServices(servicesData || []);

        const { data: professionalsData } = await supabase
          .from("professionals")
          .select("*")
          .eq("company_id", foundCompany.id)
          .eq("is_available", true);
        setProfessionals(professionalsData || []);
      }
    } catch (err) {
      console.error("Erro ao carregar empresa:", err);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as informações.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!company) {
    return <div className="min-h-screen flex items-center justify-center">Empresa não encontrada</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              Agendar Serviço - {company.name}
              {company.address &&
                `, ${company.address}, ${company.number || ""} - ${company.neighborhood || ""}, ${company.city || ""} - ${company.state || ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={e => {
                e.preventDefault();
                console.log("Agendamento enviado:", formData);
              }}
              className="space-y-4"
            >
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.telefone}
                  onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label>Serviço</Label>
                <Select
                  value={formData.servicoId}
                  onValueChange={value => setFormData({ ...formData, servicoId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.length > 0 ? (
                      services.map(servico => (
                        <SelectItem key={servico.id} value={servico.id}>
                          {servico.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem disabled value="none">
                        Nenhum serviço disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Profissional</Label>
                <Select
                  value={formData.professionalId}
                  onValueChange={value => setFormData({ ...formData, professionalId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.length > 0 ? (
                      professionals.map(prof => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem disabled value="none">
                        Nenhum profissional disponível
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={e => setFormData({ ...formData, data: e.target.value })}
                />
              </div>

              <div>
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={formData.horario}
                  onChange={e => setFormData({ ...formData, horario: e.target.value })}
                />
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={formData.observacoes}
                  onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>

              <Button type="submit" className="w-full">
                Confirmar Agendamento
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgendarServico;
