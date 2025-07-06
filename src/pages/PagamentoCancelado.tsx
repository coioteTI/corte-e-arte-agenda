import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const PagamentoCancelado = () => {
  const nomeBarbearia = localStorage.getItem('nomeBarbearia') || '';

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
              <XCircle className="h-16 w-16 text-orange-500" />
            </div>
            <CardTitle className="text-xl text-orange-600">
              Pagamento Cancelado
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Olá, {nomeBarbearia}
              </h3>
              <p className="text-muted-foreground">
                Seu pagamento foi cancelado. Não se preocupe, nenhuma cobrança foi realizada.
              </p>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-orange-800 text-sm">
                Você pode tentar novamente a qualquer momento. 
                Nossa equipe está disponível para ajudar caso tenha alguma dúvida.
              </p>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link to="/plano-premium">
                  Tentar Novamente
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link to="/">
                  Voltar ao Início
                </Link>
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Precisa de ajuda?</p>
              <p>Entre em contato: <strong>suporte@corteearte.com</strong></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PagamentoCancelado;