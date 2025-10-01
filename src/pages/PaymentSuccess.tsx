import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Limpar localStorage após sucesso
    localStorage.removeItem('user_email_for_kirvano');
    localStorage.removeItem('selected_plan');
    
    toast({
      title: "Pagamento aprovado!",
      description: "Seu plano premium foi ativado com sucesso.",
    });
  }, [toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src={logo} 
            alt="Corte & Arte" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-xl text-center">Pagamento Aprovado!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Crown className="h-5 w-5" />
            <span className="font-medium">Plano Premium Ativo</span>
          </div>
          
          <p className="text-muted-foreground">
            Parabéns! Seu plano premium foi ativado com sucesso. 
            Agora você tem acesso a todas as funcionalidades avançadas.
          </p>
          
          <div className="space-y-2 pt-4">
            <Button asChild className="w-full">
              <Link to="/dashboard">
                Acessar Dashboard
              </Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link to="/">
                Voltar ao Início
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;