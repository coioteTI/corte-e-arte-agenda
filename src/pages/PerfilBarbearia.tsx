import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "react-router-dom";
import { MapPin, Phone, Instagram, Clock, Star } from "lucide-react";
import logo from "@/assets/logo.png";

// Mock data para barbearia específica
const getBarbeariaData = (slug: string) => {
  const barbearias = {
    "barbearia-do-joao": {
      nome: "Barbearia do João",
      descricao: "Tradição e qualidade em cortes masculinos há mais de 10 anos. Ambiente acolhedor e profissionais especializados.",
      endereco: "Rua das Flores, 123 - Centro, São Paulo - SP",
      telefone: "(11) 99999-9999",
      instagram: "@barbearia_do_joao",
      logo: logo,
      galeria: [logo, logo, logo, logo, logo],
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
    }
  };
  
  return barbearias[slug as keyof typeof barbearias] || barbearias["barbearia-do-joao"];
};

const PerfilBarbearia = () => {
  const { slug } = useParams();
  const barbearia = getBarbeariaData(slug || "barbearia-do-joao");
  const [imagemSelecionada, setImagemSelecionada] = useState(0);

  const abrirWhatsApp = () => {
    const numero = barbearia.telefone.replace(/\D/g, '');
    const mensagem = `Olá! Gostaria de agendar um serviço na ${barbearia.nome}.`;
    window.open(`https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const abrirMaps = () => {
    const endereco = encodeURIComponent(barbearia.endereco);
    window.open(`https://maps.google.com/?q=${endereco}`, '_blank');
  };

  const abrirInstagram = () => {
    window.open(`https://instagram.com/${barbearia.instagram.replace('@', '')}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header da Barbearia */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <img
                src={barbearia.logo}
                alt={barbearia.nome}
                className="h-24 w-24 rounded-full object-cover"
              />
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {barbearia.nome}
                </h1>
                <p className="text-muted-foreground mb-4">
                  {barbearia.descricao}
                </p>
                
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  <Button onClick={abrirMaps} variant="outline" size="sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    Ver no Maps
                  </Button>
                  <Button onClick={abrirWhatsApp} variant="outline" size="sm">
                    <Phone className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button onClick={abrirInstagram} variant="outline" size="sm">
                    <Instagram className="h-4 w-4 mr-2" />
                    Instagram
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Galeria de Fotos */}
        <Card>
          <CardHeader>
            <CardTitle>Galeria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {barbearia.galeria.map((foto, index) => (
                <img
                  key={index}
                  src={foto}
                  alt={`Foto ${index + 1}`}
                  className={`h-20 w-full object-cover rounded cursor-pointer transition-opacity ${
                    imagemSelecionada === index ? 'opacity-100 ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
                  }`}
                  onClick={() => setImagemSelecionada(index)}
                />
              ))}
            </div>
            <div className="mt-4">
              <img
                src={barbearia.galeria[imagemSelecionada]}
                alt="Foto em destaque"
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Serviços e Preços */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços e Preços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {barbearia.servicos.map((servico, index) => (
                <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{servico.nome}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {servico.duracao}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    R$ {servico.valor.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Horários de Funcionamento */}
        <Card>
          <CardHeader>
            <CardTitle>Horários de Funcionamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {barbearia.horarios.map((horario, index) => (
                <div key={index} className="flex justify-between items-center py-2">
                  <span className="font-medium">{horario.dia}</span>
                  <span className="text-muted-foreground">
                    {horario.inicio === "Fechado" ? "Fechado" : `${horario.inicio} - ${horario.fim}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Localização */}
        <Card>
          <CardHeader>
            <CardTitle>Localização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span>{barbearia.endereco}</span>
              </div>
              <Button onClick={abrirMaps} variant="outline" size="sm">
                Ver no Google Maps
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Botão de Agendamento */}
        <div className="text-center space-y-4">
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link to={`/agendar/${slug}`}>
              Agendar Agora
            </Link>
          </Button>
          
          <div>
            <Link to="/buscar-barbearias" className="text-muted-foreground hover:text-foreground">
              ← Voltar à busca
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerfilBarbearia;