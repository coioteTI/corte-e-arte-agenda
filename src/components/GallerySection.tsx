import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface GalleryItem {
  id: string;
  image_url: string;
  title: string;
  description: string;
}

interface GallerySectionProps {
  companyId: string;
}

export const GallerySection = ({ companyId }: GallerySectionProps) => {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      loadGallery();
    }
  }, [companyId]);

  const loadGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('id, image_url, title, description')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6); // Limitar a 6 fotos na página de agendamento

      if (error) throw error;
      setGalleryItems(data || []);
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  // Se não há fotos ou está carregando, não mostrar a seção
  if (loading || galleryItems.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4 bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Nossos Trabalhos</CardTitle>
          <Badge variant="secondary">{galleryItems.length} foto{galleryItems.length !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryItems.map((item, index) => (
            <div 
              key={item.id} 
              className={`group relative overflow-hidden rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                index === 0 ? 'md:col-span-2 md:row-span-2' : ''
              }`}
            >
              <div className={`aspect-square ${index === 0 ? 'md:aspect-[2/1]' : ''} overflow-hidden`}>
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                {/* Overlay com informações */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <div className="text-white">
                    <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs opacity-90 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          ✨ Confira a qualidade do nosso trabalho
        </p>
      </CardContent>
    </Card>
  );
};