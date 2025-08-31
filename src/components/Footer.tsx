import logo from "@/assets/logo.png";

export const Footer = () => {
  return (
    <footer className="bg-secondary border-t border-border py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Logo e Descrição */}
          <div className="sm:col-span-2 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img 
                src={logo} 
                alt="Corte & Arte" 
                className="h-8 w-auto"
              />
              <div>
                <h3 className="font-semibold text-foreground">Corte & Arte</h3>
                <p className="text-sm text-muted-foreground">
                  Sistema Profissional de Agendamentos
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Conectamos clientes e profissionais de beleza através de uma plataforma 
              moderna e eficiente. Agende seus serviços de forma prática e segura.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                📧 corteearte.suporte@gmail.com
              </a>
            </div>
          </div>

          {/* Links Úteis */}
          <div>
            <h4 className="font-semibold mb-4">Links Úteis</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#agendamento" className="text-muted-foreground hover:text-foreground transition-colors">
                  Agendamento
                </a>
              </li>
              <li>
                <a href="#servicos" className="text-muted-foreground hover:text-foreground transition-colors">
                  Serviços
                </a>
              </li>
              <li>
                <a href="#contato" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contato
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Política de Privacidade
                </a>
              </li>
            </ul>
          </div>

          {/* Horários */}
          <div>
            <h4 className="font-semibold mb-4">Horário de Funcionamento</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Segunda a Sexta: 9h às 18h</li>
              <li>Sábado: 9h às 16h</li>
              <li>Domingo: Fechado</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Corte & Arte. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};