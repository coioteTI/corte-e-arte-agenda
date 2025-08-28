import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonalizacaoConfig } from "@/types/configuracoes";

interface PersonalizacaoSectionProps {
  configuracoes: PersonalizacaoConfig;
  onInputChange: (campo: string, valor: string) => void;
  companyId?: string;
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
          <Label htmlFor="instagram">Instagram</Label>
          <Input
            id="instagram"
            value={configuracoes.instagram || ""}
            onChange={(e) => onInputChange("instagram", e.target.value)}
            placeholder="@sua_barbearia"
          />
        </div>

      </CardContent>
    </Card>
  );
};