import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Search, MapPin, Star, Navigation, Crown } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";

// Mock data para barbearias
const barbearias = [
  {
    id: 1,
    nome: "Barbearia do João",
    cidade: "São Paulo",
    estado: "SP",
    logo: logo,
    slug: "barbearia-do-joao",
    rating: 4.8,
    agendamentos: 1250,
    destaque: true
  },
  {
    id: 2,
    nome: "Salão Elite",
    cidade: "Rio de Janeiro", 
    estado: "RJ",
    logo: logo,
    slug: "salao-elite",
    rating: 4.9,
    agendamentos: 980,
    destaque: true
  },
  {
    id: 3,
    nome: "Corte & Arte Premium",
    cidade: "Belo Horizonte",
    estado: "MG", 
    logo: logo,
    slug: "corte-arte-premium",
    rating: 4.7,
    agendamentos: 756,
    destaque: true
  },
  {
    id: 4,
    nome: "Barbearia Central",
    cidade: "São Paulo",
    estado: "SP",
    logo: logo,
    slug: "barbearia-central",
    rating: 4.5,
    agendamentos: 650
  },
  {
    id: 5,
    nome: "Style Hair",
    cidade: "Salvador",
    estado: "BA",
    logo: logo,
    slug: "style-hair",
    rating: 4.6,
    agendamentos: 540
  }
];

const BuscarBarbearias = () => {
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [resultados, setResultados] = useState(barbearias);
  const [localizacaoPermitida, setLocalizacaoPermitida] = useState(false);
  const [carregandoLocalizacao, setCarregandoLocalizacao] = useState(false);
  const { toast } = useToast();

  // Top barbearias para o carrossel
  const topBarbearias = barbearias
    .filter(b => b.destaque)
    .sort((a, b) => b.agendamentos - a.agendamentos)
    .slice(0, 3);

  const handleBuscar = () => {
    let filtrados = barbearias;
    
    if (estado) {
      filtrados = filtrados.filter(b => 
        b.estado.toLowerCase().includes(estado.toLowerCase())
      );
    }
    
    if (cidade) {
      filtrados = filtrados.filter(b => 
        b.cidade.toLowerCase().includes(cidade.toLowerCase())
      );
    }
    
    setResultados(filtrados);
  };

  const solicitarLocalizacao = () => {
    setCarregandoLocalizacao(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCarregandoLocalizacao(false);
          setLocalizacaoPermitida(true);
          // Simular filtragem por localização próxima
          const barbeariasPróximas = barbearias.filter(b => 
            b.cidade === "São Paulo" || b.estado === "SP"
          );
          setResultados(barbeariasPróximas);
          toast({
            title: "Localização ativada!",
            description: "Mostrando barbearias próximas a você.",
          });
        },
        (error) => {
          setCarregandoLocalizacao(false);
          toast({
            title: "Localização não disponível",
            description: "Use os filtros manuais para buscar.",
            variant: "destructive"
          });
        }
      );
    } else {
      setCarregandoLocalizacao(false);
      toast({
        title: "Geolocalização não suportada",
        description: "Use os filtros manuais para buscar.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <img 
            src={logo} 
            alt="Corte & Arte" 
            className="h-12 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Encontre sua barbearia ideal
          </h1>
          <p className="text-muted-foreground">
            Descubra os melhores profissionais perto de você
          </p>
        </div>

        {/* Geolocalização */}
        {!localizacaoPermitida && (
          <Card className="mb-6 border-2 border-dashed border-primary/20 animate-scale-in">
            <CardContent className="p-6 text-center">
              <Navigation className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-medium mb-2">Usar sua localização?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Encontre salões próximos a você automaticamente
              </p>
              <Button 
                onClick={solicitarLocalizacao}
                disabled={carregandoLocalizacao}
                className="w-full sm:w-auto"
              >
                {carregandoLocalizacao ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Localizando...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Usar Minha Localização
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Top Barbearias - Carrossel */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Top Barbearias</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topBarbearias.map((barbearia, index) => (
              <Card key={barbearia.id} className="hover:shadow-lg transition-all duration-300 animate-scale-in border-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <img
                        src={barbearia.logo}
                        alt={barbearia.nome}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{barbearia.nome}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {barbearia.cidade}, {barbearia.estado}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{barbearia.rating}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {barbearia.agendamentos}+ agendamentos
                    </div>
                  </div>
                  <Button asChild size="sm" className="w-full">
                    <Link to={`/barbearia/${barbearia.slug}`}>
                      Ver Perfil
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Barbearias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  placeholder="Ex: SP, RJ, MG..."
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  placeholder="Ex: São Paulo, Rio de Janeiro..."
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>
              
              <div className="flex items-end">
                <Button onClick={handleBuscar} className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium">
            {resultados.length} barbearia(s) encontrada(s)
          </h2>
          
          {resultados.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground text-lg">
                  Nenhuma barbearia encontrada
                </p>
                <p className="text-muted-foreground text-sm mt-2">
                  Tente ajustar os filtros de busca
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resultados.map((barbearia) => (
                <Card key={barbearia.id} className="hover:shadow-lg transition-all duration-300 animate-fade-in group">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="relative">
                        <img
                          src={barbearia.logo}
                          alt={barbearia.nome}
                          className="h-16 w-16 mx-auto rounded-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        {barbearia.destaque && (
                          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                            TOP
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-lg">{barbearia.nome}</h3>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2">
                          <MapPin className="h-4 w-4" />
                          {barbearia.cidade}, {barbearia.estado}
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{barbearia.rating}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            ({barbearia.agendamentos} agendamentos)
                          </span>
                        </div>
                      </div>
                      
                      <Button asChild className="w-full group-hover:scale-105 transition-transform duration-200">
                        <Link to={`/barbearia/${barbearia.slug}`}>
                          Ver Perfil
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Voltar */}
        <div className="mt-8 text-center">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BuscarBarbearias;