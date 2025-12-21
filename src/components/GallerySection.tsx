import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

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
        .limit(12);

      if (error) throw error;
      setGalleryItems(data || []);
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? Math.max(0, galleryItems.length - 3) : Math.max(0, prev - 1)));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= galleryItems.length - 3 ? 0 : prev + 1));
  };

  const handleModalPrevious = () => {
    setModalIndex((prev) => (prev === 0 ? galleryItems.length - 1 : prev - 1));
  };

  const handleModalNext = () => {
    setModalIndex((prev) => (prev === galleryItems.length - 1 ? 0 : prev + 1));
  };

  const openModal = (index: number) => {
    setModalIndex(index);
    setIsModalOpen(true);
  };

  // Se não há fotos ou está carregando, não mostrar a seção
  if (loading || galleryItems.length === 0) {
    return null;
  }

  const visibleItems = galleryItems.slice(currentIndex, currentIndex + 3);
  // Fill with items from start if we don't have enough
  const displayItems = visibleItems.length < 3 && galleryItems.length > 3
    ? [...visibleItems, ...galleryItems.slice(0, 3 - visibleItems.length)]
    : visibleItems;

  return (
    <>
      <Card className="mb-4 bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Nossos Trabalhos</CardTitle>
            <Badge variant="secondary">{galleryItems.length} foto{galleryItems.length !== 1 ? 's' : ''}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Navigation Arrows */}
            {galleryItems.length > 3 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-background/90 hover:bg-background shadow-lg"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-background/90 hover:bg-background shadow-lg"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {/* Gallery Grid */}
            <div className="grid grid-cols-3 gap-4 px-2">
              {displayItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="group relative overflow-hidden rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer"
                  onClick={() => openModal(currentIndex + index)}
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={item.image_url}
                      alt={item.title || 'Trabalho da galeria'}
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

            {/* Dots Indicator */}
            {galleryItems.length > 3 && (
              <div className="flex justify-center gap-1 mt-4">
                {Array.from({ length: Math.ceil(galleryItems.length / 3) }).map((_, i) => (
                  <button
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      Math.floor(currentIndex / 3) === i ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                    onClick={() => setCurrentIndex(i * 3)}
                  />
                ))}
              </div>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            ✨ Confira a qualidade do nosso trabalho
          </p>
        </CardContent>
      </Card>

      {/* Modal for full image view */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <DialogTitle className="sr-only">
            {galleryItems[modalIndex]?.title || 'Imagem da galeria'}
          </DialogTitle>
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {/* Navigation in modal */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
              onClick={handleModalPrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/20"
              onClick={handleModalNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>

            {/* Image */}
            <img
              src={galleryItems[modalIndex]?.image_url}
              alt={galleryItems[modalIndex]?.title || 'Trabalho da galeria'}
              className="max-h-[80vh] max-w-full object-contain"
            />

            {/* Image info */}
            {(galleryItems[modalIndex]?.title || galleryItems[modalIndex]?.description) && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                {galleryItems[modalIndex]?.title && (
                  <h3 className="font-semibold text-lg">{galleryItems[modalIndex].title}</h3>
                )}
                {galleryItems[modalIndex]?.description && (
                  <p className="text-sm opacity-90">{galleryItems[modalIndex].description}</p>
                )}
              </div>
            )}

            {/* Counter */}
            <div className="absolute top-4 right-4 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
              {modalIndex + 1} / {galleryItems.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};