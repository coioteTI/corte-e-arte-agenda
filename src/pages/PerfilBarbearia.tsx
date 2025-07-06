import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "react-router-dom";
import { MapPin, Phone, Instagram, Clock, Star, MessageCircle, ExternalLink } from "lucide-react";
import logo from "@/assets/logo.png";

const getBarbearia = (slug: string) => {
  const barbearias = {
    "barbearia-do-joao": {
      nome: "Barbearia do João",
      descricao: "Tradição e qualidade em cortes masculinos há mais de 20 anos. Atendimento personalizado e ambiente acolhedor.",
      endereco: "Rua das Flores, 123 - Centro",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01234-567",
      telefone: "(11) 99999-9999",
      instagram: "@barbearia_do_joao",
      logo: logo,
      fotos: [logo, logo, logo, logo, logo],
      avaliacoes: 4.8,
      totalAvaliacoes: 156,
      agendamentos: 1250,
      destaque: true,
      servicos: [
        { nome: "Corte Masculino", duracao: "30 min", valor: 25.00 },
        { nome: "Barba", duracao: "20 min", valor: 15.00 },
        { nome: "Corte + Barba", duracao: "45 min", valor: 35.00 },
        { nome: "Sobrancelha", duracao: "15 min", valor: 10.00 }
      ],
      horarios: [
        { dia: "Segunda-feira", inicio: "08:00", fim: "18:00" },
        { dia: "Terça-feira", inicio: "08:00", fim: "18:00" },
        { dia: "Quarta-feira", inicio: "08:00", fim: "18:00" },
        { dia: "Quinta-feira", inicio: "08:00", fim: "18:00" },
        { dia: "Sexta-feira", inicio: "08:00", fim: "19:00" },
        { dia: "Sábado", inicio: "08:00", fim: "16:00" },
        { dia: "Domingo", inicio: "Fechado", fim: "" }
      ]
    },
    "salao-elite": {
      nome: "Salão Elite",
      descricao: "Excelência em cortes e tratamentos capilares. Equipe especializada e produtos de qualidade.",
      endereco: "Av. Copacabana, 456 - Copacabana",
      cidade: "Rio de Janeiro",
      estado: "RJ", 
      cep: "22070-001",
      telefone: "(21) 88888-8888",
      instagram: "@salao_elite",
      logo: logo,
      fotos: [logo, logo, logo, logo],
      avaliacoes: 4.9,
      totalAvaliacoes: 98,
      agendamentos: 980,
      destaque: true,
      servicos: [
        { nome: "Corte Feminino", duracao: "45 min", valor: 40.00 },
        { nome: "Corte Masculino", duracao: "30 min", valor: 30.00 },
        { nome: "Escova", duracao: "40 min", valor: 25.00 },
        { nome: "Hidratação", duracao: "60 min", valor: 50.00 }
      ],
      horarios: [
        { dia: "Segunda-feira", inicio: "09:00", fim: "19:00" },
        { dia: "Terça-feira", inicio: "09:00", fim: "19:00" },
        { dia: "Quarta-feira", inicio: "09:00", fim: "19:00" },
        { dia: "Quinta-feira", inicio: "09:00", fim: "19:00" },
        { dia: "Sexta-feira", inicio: "09:00", fim: "20:00" },
        { dia: "Sábado", inicio: "08:00", fim: "18:00" },
        { dia: "Domingo", inicio: "Fechado", fim: "" }
      ]
    }
  };
  
  return barbearias[slug as keyof typeof barbearias] || barbearias["barbearia-do-joao"];
};

const PerfilBarbearia = () => {
  const { slug } = useParams();
  const barbearia = getBarbearia(slug || "barbearia-do-joao");

  const abrirWhatsApp = () => {
    const numero = barbearia.telefone.replace(/\D/g, '');
    const mensagem = `Olá! Gostaria de agendar um serviço na ${barbearia.nome}.`;
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const abrirMaps = () => {
    const endereco = `${barbearia.endereco}, ${barbearia.cidade}, ${barbearia.estado}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  };

  const abrirInstagram = () => {
    window.open(`https://instagram.com/${barbearia.instagram.replace('@', '')}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="relative inline-block mb-4">
            <img 
              src={barbearia.logo} 
              alt={barbearia.nome} 
              className="h-20 w-20 mx-auto rounded-full object-cover border-4 border-white shadow-lg"
            />
            {barbearia.destaque && (
              <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1">
                TOP
              </Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {barbearia.nome}
          </h1>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            {barbearia.descricao}
          </p>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <span className="font-semibold">{barbearia.avaliacoes}</span>
              <span className="text-muted-foreground">({barbearia.totalAvaliacoes} avaliações)</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {barbearia.agendamentos}+ agendamentos
            </div>
          </div>
        </div>

        {/* Informações de Contato */}
        <Card className="mb-6 animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Localização e Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Endereço</h4>
              <p className="text-muted-foreground text-sm">
                {barbearia.endereco}
              </p>
              <p className="text-muted-foreground text-sm">
                {barbearia.cidade}, {barbearia.estado} - CEP: {barbearia.cep}
              </p>
              <Button 
                variant="link" 
                onClick={abrirMaps}
                className="p-0 h-auto text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver no Google Maps
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={abrirWhatsApp} 
                className="w-full hover:scale-105 transition-transform duration-200" 
                size="lg"
                style={{ backgroundColor: '#25D366' }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp: {barbearia.telefone}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full hover:scale-105 transition-transform duration-200" 
                size="lg"
                onClick={abrirInstagram}
              >
                <Instagram className="h-4 w-4 mr-2" />
                {barbearia.instagram}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Galeria de Fotos */}
        <Card className="mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle>Galeria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {barbearia.fotos.map((foto, index) => (
                <div key={index} className="relative group">
                  <img
                    src={foto}
                    alt={`${barbearia.nome} - Foto ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Serviços e Preços */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Serviços e Preços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {barbearia.servicos.map((servico, index) => (
                <div key={index} className="flex justify-between items-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="font-medium">{servico.nome}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {servico.duracao}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-base font-semibold">
                    R$ {servico.valor.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Horários de Funcionamento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horários de Funcionamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {barbearia.horarios.map((horario, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-muted/50 last:border-0">
                  <span className="font-medium">{horario.dia}</span>
                  <span className={`${horario.inicio === "Fechado" ? "text-muted-foreground" : "text-foreground"}`}>
                    {horario.inicio === "Fechado" ? "Fechado" : `${horario.inicio} - ${horario.fim}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Botão de Agendamento */}
        <div className="text-center space-y-4">
          <Button asChild className="w-full animate-pulse-glow hover:scale-105 transition-transform duration-200" size="lg">
            <Link to={`/agendar/${slug}`}>
              Agendar Agora
            </Link>
          </Button>
          
          <div>
            <Link 
              to="/buscar-barbearias" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Voltar à busca
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilBarbearia;