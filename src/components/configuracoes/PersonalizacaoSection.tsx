import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PersonalizacaoConfig } from "@/types/configuracoes";

interface PersonalizacaoSectionProps {
  configuracoes: PersonalizacaoConfig;
  onInputChange: (campo: string, valor: string) => void;
}

export const PersonalizacaoSection = ({ configuracoes, onInputChange }: PersonalizacaoSectionProps) => {
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              value={configuracoes.telefone}
              onChange={(e) => onInputChange("telefone", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cor-primaria">Cor Primária</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Esta cor será aplicada em botões, links e destaques da interface
            </p>
            <div className="flex space-x-2">
              <Input
                id="cor-primaria"
                type="color"
                value={configuracoes.corPrimaria}
                onChange={(e) => {
                  onInputChange("corPrimaria", e.target.value);
                  // Apply color immediately as preview
                  document.documentElement.style.setProperty('--primary', `${e.target.value}`);
                }}
                className="w-16 h-10"
              />
              <Input
                value={configuracoes.corPrimaria}
                onChange={(e) => {
                  onInputChange("corPrimaria", e.target.value);
                  // Apply color immediately as preview
                  document.documentElement.style.setProperty('--primary', `${e.target.value}`);
                }}
                className="flex-1"
                placeholder="#8B5CF6"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div 
                className="w-6 h-6 rounded border-2 border-muted"
                style={{ backgroundColor: configuracoes.corPrimaria }}
              />
              <span className="text-sm text-muted-foreground">
                Pré-visualização da cor selecionada
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Upload de Logo</Label>
          <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
            <p className="text-muted-foreground">
              Clique para fazer upload ou arraste sua logo aqui
            </p>
            <Button variant="outline" className="mt-2">
              Escolher Arquivo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};