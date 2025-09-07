import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { validateProfessional } from "@/utils/validation";
import { useSupabaseOperations } from "@/hooks/useSupabaseOperations";
import { toast } from "sonner";

interface ProfessionalFormProps {
  companyId: string;
  editingProfessional?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProfessionalForm = ({ companyId, editingProfessional, onSuccess, onCancel }: ProfessionalFormProps) => {
  const { insertData, updateData, loading } = useSupabaseOperations();
  
  const [formData, setFormData] = useState({
    nome: editingProfessional?.name || "",
    email: editingProfessional?.email || "",
    telefone: editingProfessional?.phone || "",
    especialidade: editingProfessional?.specialty || "",
    disponivel: editingProfessional?.is_available ?? true
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validar dados
    const validation = validateProfessional({
      name: formData.nome,
      email: formData.email,
      phone: formData.telefone
    });

    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    // Preparar dados para salvar
    const professionalData = {
      name: formData.nome,
      email: formData.email || null,
      phone: formData.telefone || null,
      specialty: formData.especialidade || null,
      company_id: companyId,
      is_available: formData.disponivel
    };

    let result;
    if (editingProfessional) {
      result = await updateData('professionals', professionalData, editingProfessional.id);
    } else {
      result = await insertData('professionals', professionalData);
    }

    if (result.success) {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome*</Label>
        <Input
          id="nome"
          placeholder="Nome completo"
          value={formData.nome}
          onChange={(e) => handleInputChange('nome', e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@exemplo.com"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          placeholder="(11) 99999-9999"
          value={formData.telefone}
          onChange={(e) => handleInputChange('telefone', e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="especialidade">Especialidade</Label>
        <Input
          id="especialidade"
          placeholder="Ex: Cortes masculinos, Barba, etc."
          value={formData.especialidade}
          onChange={(e) => handleInputChange('especialidade', e.target.value)}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="disponivel"
          checked={formData.disponivel}
          onCheckedChange={(checked) => handleInputChange('disponivel', checked)}
        />
        <Label htmlFor="disponivel">Profissional disponível para agendamentos</Label>
      </div>
      
      <div className="flex space-x-2 pt-4">
        <Button onClick={handleSubmit} disabled={loading} className="flex-1">
          {loading ? "Salvando..." : editingProfessional ? "Salvar Alterações" : "Adicionar"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
      </div>
    </div>
  );
};