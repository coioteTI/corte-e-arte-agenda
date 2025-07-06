import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-8">
          <div className="space-y-4">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-16 w-auto mx-auto"
            />
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Corte & Arte
              </h1>
              <p className="text-muted-foreground">
                Agende com estilo. Administre com facilidade.
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link to="/buscar-barbearias">
                Sou Cliente – Procurar Barbearias
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full" size="lg">
              <Link to="/login">
                Sou Profissional – Entrar no Sistema
              </Link>
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <Link to="/cadastro" className="hover:text-foreground">
              Cadastrar nova barbearia/salão
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
