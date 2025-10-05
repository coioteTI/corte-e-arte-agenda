import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface HeroSectionProps {
  onLoginClick: () => void;
}

export const HeroSection = ({ onLoginClick }: HeroSectionProps) => {
  return (
    <section className="py-20 bg-gradient-card">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            Agende seu <span className="text-primary">Corte</span> com Estilo
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sistema profissional de agendamentos para empresas de beleza. 
            Marque seu horário de forma rápida e prática.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-8 py-3"
              onClick={() => {
                document.getElementById('agendamento')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
            >
              Agendar Agora
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-3"
              onClick={onLoginClick}
            >
              Fazer Login
            </Button>
          </div>

          {/* Cards de benefícios */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="shadow-card hover:shadow-elegant transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📅</span>
                </div>
                <h3 className="font-semibold mb-2">Agendamento Fácil</h3>
                <p className="text-sm text-muted-foreground">
                  Reserve seu horário em poucos cliques, 24 horas por dia
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-elegant transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✂️</span>
                </div>
                <h3 className="font-semibold mb-2">Profissionais Qualificados</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha entre nossos barbeiros e cabeleireiros especializados
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-card hover:shadow-elegant transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⏰</span>
                </div>
                <h3 className="font-semibold mb-2">Horários Flexíveis</h3>
                <p className="text-sm text-muted-foreground">
                  Funcionamos de segunda a sábado com horários estendidos
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};