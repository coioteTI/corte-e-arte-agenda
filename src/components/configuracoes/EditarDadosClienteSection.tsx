import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const EditarDadosClienteSection = () => {
  const [dadosCliente, setDadosCliente] = useState({
    nome: "",
    telefone: "",
    email: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasDados, setHasDados] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      // Carregar do localStorage
      const savedData = localStorage.getItem('clientData');
      if (savedData) {
        const data = JSON.parse(savedData);
        setDadosCliente({
          nome: data.nome || "",
          telefone: data.telefone || "",
          email: data.email || ""
        });
        setHasDados(true);
      }

      // Carregar do banco de dados se usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name, phone, email')
          .eq('user_id', user.id)
          .single();

        if (clientData) {
          setDadosCliente({
            nome: clientData.name || "",
            telefone: clientData.phone || "",
            email: clientData.email || ""
          });
          setHasDados(true);
        }
      }
    } catch (error) {
      console.log('Não foi possível carregar dados do cliente');
    }
  };

  const handleSalvar = async () => {
    setIsLoading(true);
    
    try {
      // Salvar no localStorage
      localStorage.setItem('clientData', JSON.stringify({
        nome: dadosCliente.nome,
        telefone: dadosCliente.telefone,
        email: dadosCliente.email
      }));

      // Salvar no banco se usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingClient) {
          await supabase
            .from('clients')
            .update({
              name: dadosCliente.nome,
              phone: dadosCliente.telefone,
              email: dadosCliente.email
            })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('clients')
            .insert({
              user_id: user.id,
              name: dadosCliente.nome,
              phone: dadosCliente.telefone,
              email: dadosCliente.email
            });
        }
      }

      setHasDados(true);
      toast({
        title: "Dados salvos com sucesso",
        description: "Suas informações foram atualizadas para agendamentos futuros.",
      });
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar seus dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLimpar = () => {
    setDadosCliente({
      nome: "",
      telefone: "",
      email: ""
    });
    localStorage.removeItem('clientData');
    setHasDados(false);
    
    toast({
      title: "Dados removidos",
      description: "Suas informações foram removidas.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Meus Dados de Agendamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure seus dados para que sejam preenchidos automaticamente em agendamentos futuros.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome-cliente">Nome completo</Label>
            <Input
              id="nome-cliente"
              placeholder="Seu nome completo"
              value={dadosCliente.nome}
              onChange={(e) => setDadosCliente(prev => ({ ...prev, nome: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone-cliente">WhatsApp</Label>
              <Input
                id="telefone-cliente"
                placeholder="(11) 99999-9999"
                value={dadosCliente.telefone}
                onChange={(e) => setDadosCliente(prev => ({ ...prev, telefone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-cliente">E-mail</Label>
              <Input
                id="email-cliente"
                type="email"
                placeholder="seu@email.com"
                value={dadosCliente.email}
                onChange={(e) => setDadosCliente(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSalvar} 
            disabled={isLoading || !dadosCliente.nome || !dadosCliente.telefone}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Salvando..." : "Salvar Dados"}
          </Button>
          
          {hasDados && (
            <Button variant="outline" onClick={handleLimpar}>
              Limpar
            </Button>
          )}
        </div>

        {hasDados && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Seus dados estão salvos e serão preenchidos automaticamente em novos agendamentos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};