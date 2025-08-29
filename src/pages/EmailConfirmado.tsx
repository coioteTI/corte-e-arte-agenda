import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import logo from "@/assets/logo.png";

const EmailConfirmado = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  const handleAccessPlatform = () => {
    navigate("/planos");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <img 
            src={logo} 
            alt="Corte & Arte" 
            className="h-12 w-auto mx-auto"
          />
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            E-mail confirmado com sucesso!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Seu cadastro foi concluído e você já pode acessar nossa plataforma.
            Clique no botão abaixo para continuar.
          </p>
          
          <Button 
            onClick={handleAccessPlatform}
            size="lg" 
            className="w-full"
          >
            Acessar Plataforma
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Seja bem-vindo ao Corte & Arte!
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmado;