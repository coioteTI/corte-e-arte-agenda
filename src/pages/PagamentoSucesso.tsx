import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";

const PagamentoSucesso = () => {
  const { toast } = useToast();
  const nomeBarbearia = localStorage.getItem('nomeBarbearia') || '';

  useEffect(() => {
    // Mostrar mensagem de sucesso
    toast({
      title: "Pagamento realizado com sucesso!",
      description: "Bem-vindo ao Plano Premium. Você já pode acessar todas as funcionalidades.",
    });

    // Limpar dados temporários
    localStorage.removeItem('nomeBarbearia');
    localStorage.removeItem('emailAdmin');
  }, [toast]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-xl text-green-600">
              Pagamento Confirmado!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Parabéns, {nomeBarbearia}!
              </h3>
              <p className="text-muted-foreground">
                Sua assinatura do Plano Premium foi ativada com sucesso. 
                Agora você tem acesso completo à nossa plataforma.
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">O que você ganhou:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✓ Agenda ilimitada de agendamentos</li>
                <li>✓ Notificações automáticas por WhatsApp</li>
                <li>✓ Relatórios avançados de vendas</li>
                <li>✓ Sistema de fidelização de clientes</li>
                <li>✓ Perfil público para agendamentos online</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link to="/dashboard">
                  Acessar Painel de Controle
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link to="/">
                  Voltar ao Início
                </Link>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Você receberá um e-mail de confirmação em breve com todos os detalhes da sua assinatura.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PagamentoSucesso;