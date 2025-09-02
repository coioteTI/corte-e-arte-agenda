import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { ThemeDemo } from "@/components/ThemeDemo";
import logo from "@/assets/logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 md:p-8 text-center space-y-6 md:space-y-8">
            <div className="space-y-3 md:space-y-4">
              <img 
                src={logo} 
                alt="Corte & Arte" 
                className="h-12 md:h-16 w-auto mx-auto"
              />
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
                  Corte & Arte
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
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
              <Link to="/cadastro" className="hover:text-foreground transition-colors">
                Cadastrar nova barbearia/salão
              </Link>
            </div>
          </CardContent>
        </Card>
        
        {/* Theme Demo */}
        <ThemeDemo />
      </div>
    </div>
  );
};

export default Index;
