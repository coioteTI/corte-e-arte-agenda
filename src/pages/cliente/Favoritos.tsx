import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClientLayout from "@/components/client/ClientLayout";
import { Heart, MapPin, Star, Instagram, MessageCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Favoritos = () => {
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFavoritos();
  }, []);

  const fetchFavoritos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: favorites, error } = await supabase
        .from('favorites')
        .select(`
          *,
          companies:company_id(*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setFavoritos(favorites || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Erro ao carregar favoritos",
        description: "Não foi possível carregar suas barbearias favoritas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorito = async (favoriteId: string, companyId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      // Update company likes count
      const { error: updateError } = await supabase
        .from('companies')
        .update({ likes_count: Math.max(0, (favoritos.find(f => f.id === favoriteId)?.companies?.likes_count || 1) - 1) })
        .eq('id', companyId);

      if (updateError) console.error('Error updating likes:', updateError);

      toast({
        title: "Removido dos favoritos",
        description: "A barbearia foi removida dos seus favoritos.",
      });
      
      fetchFavoritos();
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover dos favoritos.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Favoritos</h1>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ClientLayout>
    );
  }

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
            {favoritos.map((favorito) => (
              <Card key={favorito.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                    {/* Logo/Imagem placeholder */}
                    <div className="space-y-2">
                      <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {favorito.companies?.name?.charAt(0) || 'B'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {favorito.companies?.name}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Informações */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-semibold">{favorito.companies?.name}</h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveFavorito(favorito.id, favorito.company_id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>4.8</span>
                            <span>(125)</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4 text-red-500" />
                            <span>{favorito.companies?.likes_count || 0} curtidas</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div>
                            {favorito.companies?.address && `${favorito.companies.address}, ${favorito.companies.number} - ${favorito.companies.neighborhood}, ${favorito.companies.city} - ${favorito.companies.state}`}
                          </div>
                        </div>
                      </div>

                      {favorito.companies?.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{favorito.companies.phone}</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <h4 className="font-medium text-sm">Plano:</h4>
                        <div className="text-sm text-muted-foreground capitalize">
                          {favorito.companies?.plan || 'Pro'}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="space-y-4">
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={() => window.location.href = `/agendar/${favorito.companies?.name?.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        Agendar Agora
                      </Button>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {favorito.companies?.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const numero = favorito.companies.phone.replace(/\D/g, '');
                              const whatsappUrl = `https://wa.me/55${numero}`;
                              window.open(whatsappUrl, '_blank');
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            WhatsApp
                          </Button>
                        )}
                        
                        {favorito.companies?.instagram && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://instagram.com/${favorito.companies.instagram.replace('@', '')}`, '_blank')}
                          >
                            <Instagram className="h-4 w-4 mr-1" />
                            Instagram
                          </Button>
                        )}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.location.href = `/barbearia/${favorito.companies?.name?.toLowerCase().replace(/\s+/g, '-')}`}
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