import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

// Mock data para barbearias
const barbearias = [
  {
    id: 1,
    nome: "Barbearia do João",
    cidade: "São Paulo",
    estado: "SP",
    logo: logo,
    slug: "barbearia-do-joao"
  },
  {
    id: 2,
    nome: "Salão Elite",
    cidade: "Rio de Janeiro", 
    estado: "RJ",
    logo: logo,
    slug: "salao-elite"
  },
  {
    id: 3,
    nome: "Corte & Arte Premium",
    cidade: "Belo Horizonte",
    estado: "MG", 
    logo: logo,
    slug: "corte-arte-premium"
  }
];

const BuscarBarbearias = () => {
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [resultados, setResultados] = useState(barbearias);

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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
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
                <Card key={barbearia.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <img
                        src={barbearia.logo}
                        alt={barbearia.nome}
                        className="h-16 w-16 mx-auto rounded-full object-cover"
                      />
                      
                      <div>
                        <h3 className="font-semibold text-lg">{barbearia.nome}</h3>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
                          <MapPin className="h-4 w-4" />
                          {barbearia.cidade}, {barbearia.estado}
                        </div>
                      </div>
                      
                      <Button asChild className="w-full">
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