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
import LikeButton from "@/components/LikeButton";

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

// Generate random rating for display purposes  
const getRandomRating = () => (4.0 + Math.random() * 1.0);

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
    const cleanup = initializeData();
    
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then(cleanupFn => cleanupFn && cleanupFn());
      }
    };
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

      // Subscribe to realtime changes for companies (likes_count updates)
      const companiesChannel = supabase
        .channel('companies-likes-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'companies',
            filter: 'likes_count=neq.null'
          },
          (payload) => {
            console.log('Company likes_count updated:', payload);
            const updatedCompany = payload.new as any;
            
            // Update resultados
            setResultados(prev => prev.map(company => 
              company.id === updatedCompany.id 
                ? { ...company, likes_count: updatedCompany.likes_count }
                : company
            ));
            
            // Update topBarbearias
            setTopBarbearias(prev => prev.map(company => 
              company.id === updatedCompany.id 
                ? { ...company, likes_count: updatedCompany.likes_count }
                : company
            ));
          }
        )
        .subscribe((status) => {
          console.log('Companies realtime subscription status:', status);
        });

      // Cleanup function
      return () => {
        supabase.removeChannel(companiesChannel);
      };
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data: companies, error } = await supabase
        .rpc('get_public_company_data')
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
          .rpc('get_public_company_data');
        
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
      const { data: allCompanies, error } = await supabase.rpc('get_public_company_data');
      
      if (error) throw error;
      
      // Apply filters client-side since RPC doesn't support complex filtering
      let companies = allCompanies || [];
      
      if (estado.trim()) {
        companies = companies.filter(c => 
          c.state?.toLowerCase().includes(estado.trim().toLowerCase())
        );
      }
      
      if (cidade.trim()) {
        companies = companies.filter(c => 
          c.city?.toLowerCase().includes(cidade.trim().toLowerCase())
        );
      }
      
      // Only get companies that have location data
      companies = companies.filter(c => c.state && c.city);
      
      // Sort by likes
      companies.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      
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
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Usar API de geocoding para obter cidade e estado
            const response = await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=b8a86b8d6c1f42a58c8e5a0d1e6f1234&language=pt&pretty=1`);
            const data = await response.json();
            
            if (data.results && data.results[0]) {
              const result = data.results[0];
              const cidade = result.components.city || result.components.town || result.components.village || '';
              const estado = result.components.state_code || result.components.state || '';
              
              // Atualizar os campos de busca
              setCidade(cidade);
              setEstado(estado);
              
              // Buscar barbearias próximas
              const { data: allCompanies, error: searchError } = await supabase.rpc('get_public_company_data');
              
              if (searchError) throw searchError;
              
              let companies = allCompanies || [];
              
              if (estado) {
                companies = companies.filter(c => 
                  c.state?.toLowerCase().includes(estado.toLowerCase())
                );
              }
              
              if (cidade) {
                companies = companies.filter(c => 
                  c.city?.toLowerCase().includes(cidade.toLowerCase())
                );
              }
              
              companies.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
              
              if (companies) {
                let companiesWithFavorites: Barbearia[] = [];
                
                if (user) {
                  const { data: favorites, error: favError } = await supabase
                    .from('favorites')
                    .select('company_id')
                    .eq('user_id', user.id);

                  if (!favError && favorites) {
                    const favoriteIds = favorites.map(f => f.company_id);
                    companiesWithFavorites = companies.map(company => ({
                      ...company,
                      slug: company.name.toLowerCase().replace(/\s+/g, '-'),
                      is_favorite: favoriteIds.includes(company.id)
                    })) as Barbearia[];
                  }
                } else {
                  companiesWithFavorites = companies.map(company => ({
                    ...company,
                    slug: company.name.toLowerCase().replace(/\s+/g, '-'),
                    is_favorite: false
                  })) as Barbearia[];
                }
                
                setResultados(companiesWithFavorites);
              }
              
              setLocalizacaoPermitida(true);
              toast({
                title: "Localização ativada!",
                description: `Mostrando barbearias em ${cidade}, ${estado}`,
              });
            } else {
              throw new Error('Não foi possível obter a localização');
            }
          } catch (error) {
            console.error('Erro ao obter localização:', error);
            // Fallback para busca geral
            setLocalizacaoPermitida(true);
            toast({
              title: "Localização aproximada",
              description: "Mostrando todas as barbearias disponíveis.",
            });
          } finally {
            setCarregandoLocalizacao(false);
          }
        },
        (error) => {
          setCarregandoLocalizacao(false);
          console.error('Erro de geolocalização:', error);
          toast({
            title: "Localização negada",
            description: "Use os filtros manuais para buscar por cidade e estado.",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      setCarregandoLocalizacao(false);
      toast({
        title: "Geolocalização não suportada",
        description: "Use os filtros manuais para buscar por cidade e estado.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 animate-fade-in px-2">
          <img 
            src={logo} 
            alt="Corte & Arte" 
            className="h-10 sm:h-12 w-auto mx-auto mb-3 sm:mb-4"
          />
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
            Encontre sua barbearia ideal
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Descubra os melhores profissionais perto de você
          </p>
        </div>

        {/* Geolocalização */}
        {!localizacaoPermitida && (
          <div className="mb-4 sm:mb-6 mx-2 sm:mx-0">
            <Card className="border-2 border-dashed border-primary/20 animate-scale-in">
              <CardContent className="p-4 sm:p-6 text-center">
                <Navigation className="h-6 sm:h-8 w-6 sm:w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-medium mb-2 text-sm sm:text-base">Usar sua localização?</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 px-2">
                  Encontre salões próximos a você automaticamente
                </p>
                <Button 
                  onClick={solicitarLocalizacao}
                  disabled={carregandoLocalizacao}
                  className="w-full sm:w-auto text-sm"
                  size="sm"
                >
                  {carregandoLocalizacao ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Localizando...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3 w-3 mr-2" />
                      Usar Minha Localização
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Top Barbearias - Carrossel */}
        <div className="mb-6 sm:mb-8 mx-2 sm:mx-0">
          <div className="flex items-center gap-2 mb-3 sm:mb-4 px-1">
            <Crown className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-semibold">Top Barbearias</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {topBarbearias.map((barbearia, index) => (
              <Card key={barbearia.id} className="hover:shadow-lg transition-all duration-300 animate-scale-in border-primary/10 mx-1 sm:mx-0">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3">
                    <div className="relative">
                      {barbearia.logo_url ? (
                        <img
                          src={barbearia.logo_url}
                          alt={`Logo da ${barbearia.name}`}
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-primary/20"
                        />
                      ) : (
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <span className="text-sm sm:text-lg font-bold text-primary">
                            {barbearia.name?.charAt(0) || 'B'}
                          </span>
                        </div>
                      )}
                      <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      {index === 0 && (
                        <Crown className="absolute -top-2 -left-2 h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-xs sm:text-sm truncate">{barbearia.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{barbearia.city}, {barbearia.state}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
                      <span className="text-xs sm:text-sm font-medium">{getRandomRating().toFixed(1)}</span>
                    </div>
                  </div>
                  <Button asChild size="sm" className="w-full text-xs sm:text-sm">
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
        <div className="mb-6 sm:mb-8 mx-2 sm:mx-0">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Search className="h-4 sm:h-5 w-4 sm:w-5" />
                Buscar Barbearias
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4 sm:grid sm:grid-cols-1 sm:space-y-0 md:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-sm">Estado</Label>
                  <Input
                    id="estado"
                    placeholder="Ex: SP, RJ, MG..."
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cidade" className="text-sm">Cidade</Label>
                  <Input
                    id="cidade"
                    placeholder="Ex: São Paulo, Jandira..."
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                <div className="flex items-end mt-4 sm:mt-0">
                  <Button onClick={handleBuscar} className="w-full sm:w-auto text-sm" size="sm">
                    <Search className="h-3 w-3 mr-2" />
                    Buscar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resultados */}
        <div className="space-y-4 mx-2 sm:mx-0">
          <h2 className="text-base sm:text-lg font-medium px-1">
            {resultados.length} barbearia(s) encontrada(s)
          </h2>
          
          {resultados.length === 0 ? (
            <Card>
              <CardContent className="p-8 sm:p-12 text-center">
                <p className="text-muted-foreground text-base sm:text-lg">
                  Nenhuma barbearia encontrada
                </p>
                <p className="text-muted-foreground text-xs sm:text-sm mt-2">
                  Tente ajustar os filtros de busca
                </p>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      <div className="h-12 w-12 sm:h-16 sm:w-16 mx-auto bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                        <div className="h-2 sm:h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resultados.map((barbearia) => (
                <Card key={barbearia.id} className="hover:shadow-lg transition-all duration-300 animate-fade-in group">
                  <CardContent className="p-4 sm:p-6">
                    <div className="text-center space-y-3 sm:space-y-4">
                      <div className="relative">
                        {barbearia.logo_url ? (
                          <img
                            src={barbearia.logo_url}
                            alt={`Logo da ${barbearia.name}`}
                            className="h-12 w-12 sm:h-16 sm:w-16 mx-auto rounded-full object-cover border-2 border-primary/20 group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="h-12 w-12 sm:h-16 sm:w-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <span className="text-lg sm:text-2xl font-bold text-primary">
                              {barbearia.name?.charAt(0) || 'B'}
                            </span>
                          </div>
                        )}
                        {barbearia.likes_count >= 5000 && (
                          <div className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 bg-yellow-500 text-white text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full font-medium flex items-center gap-1">
                            <Crown className="h-2 w-2 sm:h-3 sm:w-3" />
                            <span className="text-xs">TOP</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm sm:text-lg leading-tight">{barbearia.name}</h3>
                        {(barbearia.city || barbearia.state) && (
                          <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs sm:text-sm">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="truncate">
                              {barbearia.city && barbearia.state 
                                ? `${barbearia.city}, ${barbearia.state}`
                                : barbearia.city || barbearia.state || 'Localização não informada'
                              }
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-4 mb-2">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
                            <span className="text-xs sm:text-sm font-medium">{getRandomRating().toFixed(1)}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-center py-2">
                          {barbearia.id && barbearia.id.length > 0 && (
                            <LikeButton
                              key={`like-${barbearia.id}`}
                              targetType="company"
                              targetId={barbearia.id}
                            />
                          )}
                        </div>
                      </div>
                      
                      <Button asChild className="w-full group-hover:scale-105 transition-transform duration-200 text-xs sm:text-sm" size="sm">
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
        <div className="mt-6 sm:mt-8 text-center pb-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground text-sm sm:text-base">
            ← Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BuscarBarbearias;