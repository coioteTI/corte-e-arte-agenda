import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ClientLayout from "@/components/client/ClientLayout";
import { Heart, MapPin, Star, Instagram, MessageCircle } from "lucide-react";

const favoritosExemplo = [
  {
    id: 1,
    nome: "Barbearia do João",
    endereco: "Rua das Flores, 123 - Centro, São Paulo - SP",
    distancia: "1.2 km",
    avaliacao: 4.8,
    totalAvaliacoes: 245,
    curtidas: 1250,
    servicos: ["Corte Masculino - R$ 25", "Barba - R$ 15", "Corte + Barba - R$ 35"],
    whatsapp: "(11) 99999-9999",
    instagram: "@barbearia_joao",
    fotos: [
      "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1622286346003-c2c7847b3a7c?w=300&h=200&fit=crop"
    ]
  },
  {
    id: 2,
    nome: "Salão Elegante",
    endereco: "Av. Principal, 456 - Jardim, São Paulo - SP",
    distancia: "2.5 km",
    avaliacao: 4.9,
    totalAvaliacoes: 189,
    curtidas: 890,
    servicos: ["Corte Feminino - R$ 40", "Escova - R$ 25", "Hidratação - R$ 60"],
    whatsapp: "(11) 88888-8888",
    instagram: "@salao_elegante",
    fotos: [
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=200&fit=crop",
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=300&h=200&fit=crop"
    ]
  },
];

const Favoritos = () => {
  const [favoritos, setFavoritos] = useState(favoritosExemplo);

  const handleRemoveFavorito = (id: number) => {
    setFavoritos(prev => prev.filter(f => f.id !== id));
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Meus Favoritos</h1>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span className="text-sm text-muted-foreground">
              {favoritos.length} favorito{favoritos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {favoritos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">
                Você ainda não tem favoritos
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Favorite suas barbearias preferidas para encontrá-las mais facilmente
              </p>
              <Button className="mt-4" onClick={() => window.location.href = '/buscar-barbearias'}>
                Buscar Barbearias
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {favoritos.map((barbearia) => (
              <Card key={barbearia.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                    {/* Galeria de Fotos */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {barbearia.fotos.map((foto, index) => (
                          <img
                            key={index}
                            src={foto}
                            alt={`${barbearia.nome} - ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Informações */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-semibold">{barbearia.nome}</h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFavorito(barbearia.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{barbearia.avaliacao}</span>
                            <span>({barbearia.totalAvaliacoes})</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span>{barbearia.curtidas} curtidas</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div>{barbearia.endereco}</div>
                          <div className="font-medium text-foreground">{barbearia.distancia} de distância</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">Serviços:</h4>
                        {barbearia.servicos.map((servico, index) => (
                          <div key={index} className="text-sm text-muted-foreground">
                            {servico}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="space-y-4">
                      <Button className="w-full" size="lg">
                        Agendar Agora
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://wa.me/55${barbearia.whatsapp.replace(/\D/g, '')}`, '_blank')}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          WhatsApp
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`https://instagram.com/${barbearia.instagram.replace('@', '')}`, '_blank')}
                        >
                          <Instagram className="h-4 w-4 mr-1" />
                          Instagram
                        </Button>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.location.href = `/barbearia/${barbearia.nome.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        Ver Perfil Completo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default Favoritos;