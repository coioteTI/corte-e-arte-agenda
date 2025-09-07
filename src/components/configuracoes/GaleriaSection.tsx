import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Trash2, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface GalleryItem {
  id: string;
  image_url: string;
  title: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface GaleriaSectionProps {
  companyId: string;
}

export const GaleriaSection = ({ companyId }: GaleriaSectionProps) => {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({ title: "", description: "" });
  const { toast } = useToast();

  useEffect(() => {
    if (companyId) {
      loadGallery();
    }
  }, [companyId]);

  const loadGallery = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGalleryItems(data || []);
    } catch (error) {
      console.error('Error loading gallery:', error);
      toast({
        title: "Erro ao carregar galeria",
        description: "Não foi possível carregar as fotos da galeria.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!newItem.title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Adicione um título para a foto antes de fazer o upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('gallery')
        .insert({
          company_id: companyId,
          image_url: publicUrl,
          title: newItem.title,
          description: newItem.description,
          is_active: true
        });

      if (dbError) throw dbError;

      setNewItem({ title: "", description: "" });
      loadGallery();
      
      toast({
        title: "Foto adicionada!",
        description: "A foto foi adicionada à sua galeria com sucesso.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer o upload da foto.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleItemStatus = async (itemId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('gallery')
        .update({ is_active: isActive })
        .eq('id', itemId);

      if (error) throw error;
      
      loadGallery();
      toast({
        title: isActive ? "Foto ativada" : "Foto desativada",
        description: isActive ? "A foto agora está visível na galeria." : "A foto foi ocultada da galeria.",
      });
    } catch (error) {
      console.error('Error updating item status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da foto.",
        variant: "destructive",
      });
    }
  };

  const deleteItem = async (itemId: string, imageUrl: string) => {
    try {
      // Extract file path from URL
      const filePath = imageUrl.split('/storage/v1/object/public/gallery/')[1];
      
      // Delete from storage
      if (filePath) {
        await supabase.storage.from('gallery').remove([filePath]);
      }
      
      // Delete from database
      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      loadGallery();
      toast({
        title: "Foto excluída",
        description: "A foto foi removida da galeria permanentemente.",
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a foto.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Carregando galeria...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Galeria de Fotos</CardTitle>
          <CardDescription>
            Adicione fotos dos seus trabalhos para mostrar aos clientes. As fotos ativas aparecerão na página de agendamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Foto*</Label>
              <Input
                id="title"
                placeholder="Ex: Corte degradê"
                value={newItem.title}
                onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input
                id="description"
                placeholder="Ex: Corte moderno com degradê nas laterais"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image">Selecionar Foto</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  Enviando...
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {galleryItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fotos da Galeria ({galleryItems.length})</CardTitle>
            <CardDescription>
              Gerencie as fotos da sua galeria. Use o botão de visibilidade para mostrar/ocultar fotos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {galleryItems.map((item) => (
                <div key={item.id} className="group relative">
                  <Card className="overflow-hidden hover:shadow-lg transition-all duration-200">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm truncate">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={(checked) => toggleItemStatus(item.id, checked)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {item.is_active ? "Visível" : "Oculta"}
                          </span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteItem(item.id, item.image_url)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {galleryItems.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sua galeria está vazia</h3>
            <p className="text-muted-foreground">
              Adicione fotos dos seus trabalhos para impressionar seus clientes e mostrar a qualidade dos seus serviços.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};