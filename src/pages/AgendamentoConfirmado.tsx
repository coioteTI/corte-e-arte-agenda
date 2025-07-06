import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams } from "react-router-dom";
import { CheckCircle, Phone, MessageCircle } from "lucide-react";
import logo from "@/assets/logo.png";

const getBarbeariaConfirmacao = (slug: string) => {
  const barbearias = {
    "barbearia-do-joao": {
      nome: "Barbearia do João",
      telefone: "(11) 99999-9999",
      logo: logo
    }
  };
  
  return barbearias[slug as keyof typeof barbearias] || barbearias["barbearia-do-joao"];
};

const AgendamentoConfirmado = () => {
  const { slug } = useParams();
  const barbearia = getBarbeariaConfirmacao(slug || "barbearia-do-joao");

  const abrirWhatsApp = () => {
    const numero = barbearia.telefone.replace(/\D/g, '');
    const mensagem = `Olá! Acabei de fazer um pré-agendamento pelo site. Gostaria de confirmar o horário.`;
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          {/* Ícone de Sucesso */}
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>

          {/* Logo da Barbearia */}
          <img 
            src={barbearia.logo} 
            alt={barbearia.nome} 
            className="h-12 w-12 mx-auto rounded-full object-cover"
          />

          {/* Mensagem de Confirmação */}
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">
              Agendamento Enviado!
            </h1>
            <p className="text-muted-foreground">
              Seu pré-agendamento foi enviado para <strong>{barbearia.nome}</strong>.
            </p>
          </div>

          {/* Próximos Passos */}
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-left">
              <h3 className="font-medium mb-2">Próximos passos:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• A barbearia receberá sua solicitação</li>
                <li>• Eles entrarão em contato via WhatsApp</li>
                <li>• Confirmarão a disponibilidade do horário</li>
                <li>• Você receberá a confirmação final</li>
              </ul>
            </div>

            {/* Botão WhatsApp */}
            <Button onClick={abrirWhatsApp} className="w-full" size="lg">
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar no WhatsApp Agora
            </Button>

            {/* Informações de Contato */}
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-1">
                <Phone className="h-3 w-3" />
                {barbearia.telefone}
              </div>
            </div>
          </div>

          {/* Botões de Navegação */}
          <div className="space-y-2 pt-4 border-t">
            <Button asChild variant="outline" className="w-full">
              <Link to={`/barbearia/${slug}`}>
                Ver Perfil da Barbearia
              </Link>
            </Button>
            
            <Button asChild variant="ghost" className="w-full">
              <Link to="/buscar-barbearias">
                Buscar Outras Barbearias
              </Link>
            </Button>
            
            <div className="text-sm">
              <Link to="/" className="text-muted-foreground hover:text-foreground">
                ← Voltar ao início
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgendamentoConfirmado;