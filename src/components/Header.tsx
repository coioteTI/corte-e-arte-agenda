import logo from "@/assets/logo.png";

export const Header = () => {
  return (
    <header className="bg-white shadow-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-10 w-auto"
            />
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Corte & Arte
              </h1>
              <p className="text-sm text-muted-foreground">
                Sistema Profissional de Agendamentos
              </p>
            </div>
          </div>
          
          <nav className="hidden md:flex space-x-6">
            <a 
              href="#agendamento" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Agendamento
            </a>
            <a 
              href="#servicos" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Serviços
            </a>
            <a 
              href="#contato" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contato
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};