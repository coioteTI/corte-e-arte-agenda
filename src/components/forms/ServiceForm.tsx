import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tag } from "lucide-react";
import { validateService } from "@/utils/validation";
import { useSupabaseOperations } from "@/hooks/useSupabaseOperations";
import { toast } from "sonner";

interface ServiceFormProps {
  companyId: string;
  editingService?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ServiceForm = ({ companyId, editingService, onSuccess, onCancel }: ServiceFormProps) => {
  const { insertData, updateData, loading } = useSupabaseOperations();
  
  const [formData, setFormData] = useState({
    nome: editingService?.name || "",
    descricao: editingService?.description || "",
    duracao: editingService?.duration?.toString() || "",
    valor: editingService?.price?.toString() || "",
    profissional: editingService?.professional_responsible || "",
    isPromocao: editingService?.is_promotion || false,
    valorPromocional: editingService?.promotional_price?.toString() || "",
    validadePromocao: editingService?.promotion_valid_until || ""
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validar dados
    const validation = validateService({
      name: formData.nome,
      price: formData.valor,
      duration: formData.duracao
    });

    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    // Preparar dados para salvar
    const serviceData = {
      name: formData.nome,
      description: formData.descricao || null,
      duration: parseInt(formData.duracao),
      price: parseFloat(formData.valor),
      company_id: companyId,
      professional_responsible: formData.profissional || null,
      is_promotion: formData.isPromocao,
      promotional_price: formData.valorPromocional ? parseFloat(formData.valorPromocional) : null,
      promotion_valid_until: formData.validadePromocao || null
    };

    let result;
    if (editingService) {
      result = await updateData('services', serviceData, editingService.id);
    } else {
      result = await insertData('services', serviceData);
    }

    if (result.success) {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do serviço*</Label>
        <Input
          id="nome"
          placeholder="Ex: Corte Masculino"
          value={formData.nome}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          placeholder="Descrição do serviço"
          value={formData.descricao}
          onChange={(e) => handleInputChange('descricao', e.target.value)}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duracao">Duração (min)*</Label>
          <Input
            id="duracao"
            type="number"
            placeholder="30"
            min="1"
            max="480"
            value={formData.duracao}
            onChange={(e) => handleInputChange('duracao', e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="valor">Valor (R$)*</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="25.00"
            value={formData.valor}
            onChange={(e) => handleInputChange('valor', e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="profissional">Profissional responsável</Label>
        <Input
          id="profissional"
          placeholder="Ex: Pedro"
          value={formData.profissional}
          onChange={(e) => handleInputChange('profissional', e.target.value)}
        />
      </div>

      {/* Seção de Promoção */}
      <div className="border-t pt-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="promocao"
            checked={formData.isPromocao}
            onCheckedChange={(checked) => handleInputChange('isPromocao', checked as boolean)}
          />
          <Label htmlFor="promocao" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Marcar este serviço como promoção
          </Label>
        </div>
        
        {formData.isPromocao && (
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-2">
              <Label htmlFor="valor-promocional">Valor promocional (R$)</Label>
              <Input
                id="valor-promocional"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="19.90"
                value={formData.valorPromocional}
                onChange={(e) => handleInputChange('valorPromocional', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="validade-promocao">Válido até</Label>
              <Input
                id="validade-promocao"
                type="date"
                value={formData.validadePromocao}
                onChange={(e) => handleInputChange('validadePromocao', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      
      <div className="flex space-x-2 pt-4">
        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
          {loading ? "Salvando..." : editingService ? "Salvar Alterações" : "Adicionar"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </div>
  );
};