import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PersonalizacaoConfig } from "@/types/configuracoes";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X } from "lucide-react";

interface PersonalizacaoSectionProps {
  configuracoes: PersonalizacaoConfig;
  onInputChange: (campo: string, valor: string) => void;
  companyId?: string;
}

export const PersonalizacaoSection = ({ configuracoes, onInputChange, companyId }: PersonalizacaoSectionProps) => {
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !companyId) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro no upload",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro no upload",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/logo.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const logoUrl = data.publicUrl;
      setLogoPreview(logoUrl);
      
      // Update company logo URL in database
      const { error: updateError } = await supabase
        .from('companies')
        .update({ logo_url: logoUrl })
        .eq('id', companyId);

      if (updateError) throw updateError;

      toast({
        title: "Logo atualizada!",
        description: "Sua logo foi enviada com sucesso.",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a logo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    if (!companyId) return;
    
    try {
      const { error } = await supabase
        .from('companies')
        .update({ logo_url: null })
        .eq('id', companyId);

      if (error) throw error;

      setLogoPreview("");
      toast({
        title: "Logo removida",
        description: "A logo foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a logo.",
        variant: "destructive",
      });
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalização</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome-barbearia">Nome da Barbearia</Label>
            <Input
              id="nome-barbearia"
              value={configuracoes.nomeBarbearia}
              onChange={(e) => onInputChange("nomeBarbearia", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-contato">Email de Contato</Label>
            <Input
              id="email-contato"
              type="email"
              value={configuracoes.emailContato}
              onChange={(e) => onInputChange("emailContato", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={configuracoes.telefone}
            onChange={(e) => onInputChange("telefone", e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="space-y-2">
          <Label>Upload de Logo</Label>
          {logoPreview || configuracoes.logoUrl ? (
            <div className="relative border-2 border-dashed border-muted rounded-lg p-4">
              <img 
                src={logoPreview || configuracoes.logoUrl} 
                alt="Logo da empresa" 
                className="max-h-32 mx-auto rounded"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removeLogo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">
                Clique para fazer upload ou arraste sua logo aqui
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="logo-upload"
                disabled={uploading}
              />
              <Button 
                variant="outline" 
                className="mt-2" 
                onClick={() => document.getElementById('logo-upload')?.click()}
                disabled={uploading}
              >
                {uploading ? 'Enviando...' : 'Escolher Arquivo'}
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: JPG, PNG, GIF. Tamanho máximo: 5MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};