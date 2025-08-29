import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-foreground">404</h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-6">Oops! Página não encontrada</p>
        <p className="text-sm text-muted-foreground mb-8">A página que você procura não existe ou foi movida.</p>
        <Button asChild>
          <a href="/" className="inline-flex items-center">
            Voltar ao Início
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
