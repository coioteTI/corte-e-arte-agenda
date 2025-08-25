import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams } from "react-router-dom";
import { CheckCircle, Phone, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface Company {
  id: string;
  name: string;
  phone: string;
  logo_url: string | null;
}

const AgendamentoConfirmado = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompany();
  }, [slug]);

  const fetchCompany = async () => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id, name, phone, logo_url')
        .limit(10);

      if (error) throw error;

      // Find company by slug match or use first one
      const foundCompany = companies?.find(c => 
        c.name.toLowerCase().replace(/\s+/g, '-') === slug
      ) || companies?.[0];

      if (foundCompany) {
        setCompany(foundCompany);
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados da barbearia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirWhatsApp = () => {
    if (!company?.phone) return;
    const numero = company.phone.replace(/\D/g, '');
    const mensagem = `Olá! Acabei de fazer um pré-agendamento pelo site. Gostaria de confirmar o horário.`;
    
    // Tenta abrir no WhatsApp mobile primeiro, depois web como fallback
    const linkMobile = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
    const linkWeb = `https://web.whatsapp.com/send?phone=55${numero}&text=${encodeURIComponent(mensagem)}`;
    
    // Detecta se é mobile ou desktop e usa o link apropriado
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    try {
      window.open(isMobile ? linkMobile : linkWeb, '_blank');
    } catch (error) {
      // Fallback: tenta o outro link se o primeiro falhar
      window.open(isMobile ? linkWeb : linkMobile, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-16 w-16 bg-muted rounded-full mx-auto"></div>
              <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <h1 className="text-xl font-semibold">Barbearia não encontrada</h1>
            <Link to="/buscar-barbearias" className="text-primary hover:underline">
              ← Voltar à busca
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          {/* Ícone de Sucesso */}
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>

          {/* Logo da Barbearia */}
          {company.logo_url ? (
            <img 
              src={company.logo_url} 
              alt={`Logo da ${company.name}`} 
              className="h-12 w-12 mx-auto rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="h-12 w-12 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {company.name.charAt(0)}
              </span>
            </div>
          )}

          {/* Mensagem de Confirmação */}
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">
              Agendamento Enviado!
            </h1>
            <p className="text-muted-foreground">
              Seu pré-agendamento foi enviado para <strong>{company.name}</strong>.
            </p>
          </div>

          {/* Próximos Passos */}
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-left">
              <h3 className="font-medium mb-2">Próximos passos:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• A barbearia receberá sua solicitação</li>
                <li>• Eles entrarão em contato via WhatsApp</li>
                <li>• Confirmarão a disponibilidade do horário</li>
                <li>• Você receberá a confirmação final</li>
              </ul>
            </div>

            {/* Botão WhatsApp */}
            {company.phone && (
              <Button onClick={abrirWhatsApp} className="w-full" size="lg">
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar no WhatsApp Agora
              </Button>
            )}

            {/* Informações de Contato */}
            {company.phone && (
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-1">
                  <Phone className="h-3 w-3" />
                  {company.phone}
                </div>
              </div>
            )}
          </div>

          {/* Botões de Navegação */}
          <div className="space-y-2 pt-4 border-t">
            <Button asChild variant="outline" className="w-full">
              <Link to={`/barbearia/${slug}`}>
                Ver Perfil da Barbearia
              </Link>
            </Button>
            
            <Button asChild variant="ghost" className="w-full">
              <Link to="/buscar-barbearias">
                Buscar Outras Barbearias
              </Link>
            </Button>
            
            <div className="text-sm">
              <Link to="/" className="text-muted-foreground hover:text-foreground">
                ← Voltar ao início
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgendamentoConfirmado;