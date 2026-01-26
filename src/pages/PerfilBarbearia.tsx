import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "react-router-dom";
import { MapPin, Phone, Instagram, Clock, Star, MessageCircle, ExternalLink, Heart, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import WhatsAppWidget from "@/components/WhatsAppWidget";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import { ReviewSection } from "@/components/ReviewSection";

const PerfilBarbearia = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [company, setCompany] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [serviceIndex, setServiceIndex] = useState(0);
  const [isBookingEnabled, setIsBookingEnabled] = useState(true);

  useEffect(() => {
    fetchCompanyData();
  }, [slug]);

  const fetchCompanyData = async () => {
    try {
      // Get company by matching slug-like pattern
      const { data: companies, error } = await supabase
        .rpc('get_public_company_data');

      if (error) throw error;

      console.log('Companies found:', companies);
      console.log('Looking for slug:', slug);

      // Find company by slug match or use first one
      const foundCompany = companies?.find(c => {
        const companySlug = c.name.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, ''); // Remove special characters
        console.log(`Comparing "${companySlug}" with "${slug}"`);
        return companySlug === slug;
      }) || companies?.[0];

      if (foundCompany) {
        setCompany(foundCompany);
        
        // Fetch services for this company
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('company_id', foundCompany.id)
          .order('price', { ascending: true });

        console.log('Services data:', servicesData);
        console.log('Services error:', servicesError);

        if (!servicesError) {
          setServices(servicesData || []);
        }

        // Fetch professionals for this company
        const { data: professionalsData, error: profError } = await supabase
          .from('professionals')
          .select('*')
          .eq('company_id', foundCompany.id)
          .eq('is_available', true);

        console.log('Professionals data:', professionalsData);
        console.log('Professionals error:', profError);

        if (!profError) {
          setProfessionals(professionalsData || []);
        }

        // Check if public booking is enabled for this company
        const { data: moduleSettings } = await supabase
          .from('module_settings')
          .select('is_enabled')
          .eq('company_id', foundCompany.id)
          .eq('module_key', 'agendamento_publico')
          .maybeSingle();
        
        // Default to true if no setting found
        setIsBookingEnabled(moduleSettings?.is_enabled ?? true);

        // Check if user already liked this company
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: favorite } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('company_id', foundCompany.id)
            .maybeSingle();
          
          setIsLiked(!!favorite);
        }
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados da barbearia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirWhatsApp = () => {
    if (!company?.phone) return;
    const numero = company.phone.replace(/\D/g, '');
    const mensagem = `Olá! Gostaria de agendar um serviço na ${company.name}.`;
    const whatsappUrl = `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, '_blank');
  };

  const abrirMaps = () => {
    if (!company) return;
    const endereco = `${company.address}, ${company.city}, ${company.state}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
  };

  const abrirInstagram = () => {
    if (!company?.instagram) return;
    window.open(`https://instagram.com/${company.instagram.replace('@', '')}`, '_blank');
  };

  const handleLikeChange = (newLikesCount: number) => {
    setCompany(prev => ({ ...prev, likes_count: newLikesCount }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg mb-6"></div>
            <div className="h-96 bg-muted rounded-lg mb-6"></div>
            <div className="h-48 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Barbearia não encontrada</h1>
          <Link to="/buscar-barbearias" className="text-primary hover:underline">
            ← Voltar à busca
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <Link 
            to="/buscar-barbearias" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à busca
          </Link>
        </div>

        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="relative inline-block mb-4">
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={`Logo da ${company.name}`}
                className="h-20 w-20 mx-auto rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-white shadow-lg">
                <span className="text-2xl font-bold text-primary">
                  {company.name.charAt(0)}
                </span>
              </div>
            )}
            <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1">
              TOP
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {company.name}
          </h1>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Tradição e qualidade em cortes masculinos. Atendimento personalizado e ambiente acolhedor.
          </p>
          
          {/* Total Likes Display */}
          <div className="flex justify-center mb-4">
            <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              ❤️ {company.likes_count || 0} curtidas no total
            </div>
          </div>
        </div>


        {/* Profissionais */}
        {professionals.length > 0 && (
          <Card className="mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle>Nossa Equipe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {professionals.map((professional) => (
                  <div key={professional.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {professional.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium">{professional.name}</h3>
                      {professional.specialty && (
                        <p className="text-sm text-muted-foreground">{professional.specialty}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Serviços e Preços - Carousel */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Serviços e Preços</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum serviço cadastrado ainda.
              </p>
            ) : (
              <div className="relative">
                {services.length > 2 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-background/90 hover:bg-background shadow-lg"
                      onClick={() => setServiceIndex(prev => prev === 0 ? Math.max(0, services.length - 2) : prev - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-background/90 hover:bg-background shadow-lg"
                      onClick={() => setServiceIndex(prev => prev >= services.length - 2 ? 0 : prev + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
                  {services.slice(serviceIndex, serviceIndex + 2).map((service) => (
                    <div key={service.id} className="flex justify-between items-center p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div>
                        <h3 className="font-medium flex items-center gap-2">
                          {service.name}
                          {service.is_promotion && (
                            <Badge variant="destructive" className="text-xs">
                              PROMOÇÃO
                            </Badge>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.duration} min
                        </p>
                        {service.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {service.is_promotion && service.promotional_price ? (
                          <div>
                            <Badge variant="destructive" className="text-base font-semibold">
                              R$ {service.promotional_price.toFixed(2)}
                            </Badge>
                            <p className="text-xs text-muted-foreground line-through">
                              R$ {service.price.toFixed(2)}
                            </p>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="text-base font-semibold">
                            R$ {service.price.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {services.length > 2 && (
                  <div className="flex justify-center gap-1 mt-4">
                    {Array.from({ length: Math.ceil(services.length / 2) }).map((_, i) => (
                      <button
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          Math.floor(serviceIndex / 2) === i ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                        onClick={() => setServiceIndex(i * 2)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
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
            {company?.business_hours ? (
              <div className="space-y-3">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                  const hours = company.business_hours[day];
                  if (!hours) return null;
                  
                  const dayNames: { [key: string]: string } = {
                    'monday': 'Segunda-feira',
                    'tuesday': 'Terça-feira', 
                    'wednesday': 'Quarta-feira',
                    'thursday': 'Quinta-feira',
                    'friday': 'Sexta-feira',
                    'saturday': 'Sábado',
                    'sunday': 'Domingo'
                  };
                  
                  return (
                    <div key={day} className="flex justify-between items-center py-2 border-b border-muted/50 last:border-b-0">
                      <span className="font-medium">{dayNames[day]}</span>
                      <span className={`${!hours.isOpen ? 'text-muted-foreground' : ''}`}>
                        {hours.isOpen ? `${hours.start} - ${hours.end}` : 'Fechado'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Horários não informados</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botão de Agendamento - só aparece se módulo estiver ativo */}
        {isBookingEnabled && (
          <div className="text-center space-y-4">
            <Button 
              asChild 
              className="w-full animate-pulse hover:scale-105 transition-transform duration-200" 
              size="lg"
            >
              <Link to={`/agendar/${slug}`}>
                Agendar Agora
              </Link>
            </Button>
          </div>
        )}

        {/* Avaliações da barbearia */}
        <ReviewSection companyId={company.id} canReview={true} />
      </div>
      
      {/* WhatsApp Widget */}
      <WhatsAppWidget 
        companyPhone={company.phone} 
        companyName={company.name}
      />
    </div>
  );
};

export default PerfilBarbearia;