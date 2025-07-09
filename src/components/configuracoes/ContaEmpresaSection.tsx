import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, User, Mail, Phone, MapPin, X, Check, ImageIcon } from "lucide-react";
import { ContaEmpresaConfig } from "@/types/configuracoes";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContaEmpresaSectionProps {
  contaEmpresa: ContaEmpresaConfig;
  onInputChange: (campo: string, valor: string) => void;
  onSalvar: () => void;
  saving: boolean;
  companyId: string;
}

export const ContaEmpresaSection = ({ contaEmpresa, onInputChange, onSalvar, saving, companyId }: ContaEmpresaSectionProps) => {
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(contaEmpresa.logoUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione apenas arquivos JPG ou PNG.",
        variant: "destructive",
      });
      return;
    }

    // Validar tamanho do arquivo (2MB = 2 * 1024 * 1024 bytes)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Criar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/logo.${fileExt}`;

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública do arquivo
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Atualizar preview e estado
      setLogoPreview(publicUrl);
      onInputChange("logoUrl", publicUrl);

      toast({
        title: "Logo carregado com sucesso!",
        description: "Sua logo foi salva e aparecerá nos resultados de busca.",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível carregar a logo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview("");
    onInputChange("logoUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Dados da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome-empresa" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome da Empresa
            </Label>
            <Input
              id="nome-empresa"
              value={contaEmpresa.nome}
              onChange={(e) => onInputChange("nome", e.target.value)}
              placeholder="Nome da sua barbearia"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-empresa" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email de Acesso
            </Label>
            <Input
              id="email-empresa"
              type="email"
              value={contaEmpresa.email}
              onChange={(e) => onInputChange("email", e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefone-empresa" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefone
            </Label>
            <Input
              id="telefone-empresa"
              value={contaEmpresa.telefone}
              onChange={(e) => onInputChange("telefone", e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cep-empresa">CEP</Label>
            <Input
              id="cep-empresa"
              value={contaEmpresa.cep}
              onChange={(e) => onInputChange("cep", e.target.value)}
              placeholder="00000-000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endereco-empresa" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Endereço
          </Label>
          <Input
            id="endereco-empresa"
            value={contaEmpresa.endereco}
            onChange={(e) => onInputChange("endereco", e.target.value)}
            placeholder="Rua, número"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cidade-empresa">Cidade</Label>
            <Input
              id="cidade-empresa"
              value={contaEmpresa.cidade}
              onChange={(e) => onInputChange("cidade", e.target.value)}
              placeholder="São Paulo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estado-empresa">Estado</Label>
            <Input
              id="estado-empresa"
              value={contaEmpresa.estado}
              onChange={(e) => onInputChange("estado", e.target.value)}
              placeholder="SP"
            />
          </div>
        </div>

        {/* Logo Upload Section */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Logo da Barbearia
          </Label>
          
          {logoPreview ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img 
                  src={logoPreview} 
                  alt="Logo da empresa" 
                  className="w-32 h-32 object-cover rounded-lg border-2 border-muted"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                  onClick={handleRemoveLogo}
                  type="button"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Logo carregada com sucesso! Clique no X para remover.
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">
                Clique para fazer upload da sua logo
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Formatos aceitos: JPG, PNG (máx. 2MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                type="button"
              >
                {uploading ? "Carregando..." : "Escolher Logo"}
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onSalvar} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};