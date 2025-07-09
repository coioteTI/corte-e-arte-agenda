import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Search, MapPin, Star, Navigation, Crown, Heart } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LikeButton } from "@/components/LikeButton";

// Interface para as barbearias - simplifciada para evitar conflitos
interface Barbearia {
  id: string;
  name: string;
  city: string;
  state: string;
  likes_count: number;
  slug: string;
  is_favorite?: boolean;
  ranking?: number;
  [key: string]: any; // Allow additional properties from Supabase
}

// Mock rating data since we don't have reviews table yet
const getMockRating = () => (4.5 + Math.random() * 0.5);

const BuscarBarbearias = () => {
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [resultados, setResultados] = useState<Barbearia[]>([]);
  const [topBarbearias, setTopBarbearias] = useState<Barbearia[]>([]);
  const [localizacaoPermitida, setLocalizacaoPermitida] = useState(false);
  const [carregandoLocalizacao, setCarregandoLocalizacao] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Fetch companies and rankings
      await Promise.all([
        fetchCompanies(),
        fetchTopRankings()
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .order('likes_count', { ascending: false });

      if (error) throw error;

      let companiesWithFavorites: Barbearia[] = [];

      // If user is logged in, check favorites
      if (user) {
        const { data: favorites, error: favError } = await supabase
          .from('favorites')
          .select('company_id')
          .eq('user_id', user.id);

        if (!favError && favorites) {
          const favoriteIds = favorites.map(f => f.company_id);
          companiesWithFavorites = (companies || []).map(company => ({
            ...company,
            slug: company.name.toLowerCase().replace(/\s+/g, '-'),
            is_favorite: favoriteIds.includes(company.id)
          })) as Barbearia[];
        }
      } else {
        companiesWithFavorites = (companies || []).map(company => ({
          ...company,
          slug: company.name.toLowerCase().replace(/\s+/g, '-'),
          is_favorite: false
        })) as Barbearia[];
      }

      setResultados(companiesWithFavorites);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Erro ao carregar barbearias",
        description: "Não foi possível carregar as barbearias.",
        variant: "destructive",
      });
    }
  };

  const fetchTopRankings = async () => {
    try {
      const { data: rankings, error } = await supabase.rpc('get_company_rankings');
      
      if (error) throw error;
      
      // Get full company data for top 3
      const top3Ids = (rankings || []).slice(0, 3).map(r => r.id);
      
      if (top3Ids.length > 0) {
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('*')
          .in('id', top3Ids);
        
        if (!companiesError && companies) {
          const top3: Barbearia[] = companies.map(company => ({
            ...company,
            slug: company.name.toLowerCase().replace(/\s+/g, '-'),
            is_favorite: false,
            ranking: rankings.find(r => r.id === company.id)?.ranking || 0
          })) as Barbearia[];
          
          setTopBarbearias(top3);
        }
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    }
  };

  const handleBuscar = async () => {
    setLoading(true);
    try {
      let query = supabase.from('companies').select('*');
      
      // Apply filters in sequence for better results
      if (estado.trim()) {
        query = query.ilike('state', `%${estado.trim()}%`);
      }
      
      if (cidade.trim()) {
        query = query.ilike('city', `%${cidade.trim()}%`);
      }
      
      const { data: companies, error } = await query.order('likes_count', { ascending: false });
      
      if (error) throw error;
      
      let companiesWithFavorites: Barbearia[] = [];
      
      // Check favorites if user is logged in
      if (user) {
        const { data: favorites, error: favError } = await supabase
          .from('favorites')
          .select('company_id')
          .eq('user_id', user.id);

        if (!favError && favorites) {
          const favoriteIds = favorites.map(f => f.company_id);
          companiesWithFavorites = (companies || []).map(company => ({
            ...company,
            slug: company.name.toLowerCase().replace(/\s+/g, '-'),
            is_favorite: favoriteIds.includes(company.id)
          })) as Barbearia[];
        }
      } else {
        companiesWithFavorites = (companies || []).map(company => ({
          ...company,
          slug: company.name.toLowerCase().replace(/\s+/g, '-'),
          is_favorite: false
        })) as Barbearia[];
      }
      
      setResultados(companiesWithFavorites);
    } catch (error) {
      console.error('Error searching companies:', error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível realizar a busca.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const solicitarLocalizacao = () => {
    setCarregandoLocalizacao(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCarregandoLocalizacao(false);
          setLocalizacaoPermitida(true);
          // Simular filtragem por localização próxima
          const barbeariasPróximas = resultados.filter(b => 
            b.city === "São Paulo" || b.state === "SP"
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
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {barbearia.name?.charAt(0) || 'B'}
                        </span>
                      </div>
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      {index === 0 && (
                        <Crown className="absolute -top-2 -left-2 h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{barbearia.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {barbearia.city}, {barbearia.state}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">{getMockRating().toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="h-3 w-3 text-red-500" />
                      {barbearia.likes_count} curtidas
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
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="h-16 w-16 mx-auto bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resultados.map((barbearia) => (
                <Card key={barbearia.id} className="hover:shadow-lg transition-all duration-300 animate-fade-in group">
                  <CardContent className="p-6">
                    <div className="text-center space-y-4">
                      <div className="relative">
                        <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <span className="text-2xl font-bold text-primary">
                            {barbearia.name?.charAt(0) || 'B'}
                          </span>
                        </div>
                        {barbearia.likes_count >= 5000 && (
                          <div className="absolute -top-3 -left-3 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            TOP
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-lg">{barbearia.name}</h3>
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2">
                          <MapPin className="h-4 w-4" />
                          {barbearia.city}, {barbearia.state}
                        </div>
                        <div className="flex items-center justify-center gap-4 mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-sm font-medium">{getMockRating().toFixed(1)}</span>
                          </div>
                        </div>
                        
                        <LikeButton
                          companyId={barbearia.id}
                          initialLikesCount={barbearia.likes_count}
                          isLiked={barbearia.is_favorite}
                          size="sm"
                          variant="outline"
                          onLikeChange={(newCount) => {
                            setResultados(prev => prev.map(b => 
                              b.id === barbearia.id 
                                ? { ...b, likes_count: newCount }
                                : b
                            ));
                          }}
                        />
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