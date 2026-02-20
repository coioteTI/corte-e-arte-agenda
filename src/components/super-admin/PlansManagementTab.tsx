import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Crown, Plus, Edit, Save, X, Link, DollarSign, 
  CheckCircle, Loader2, Trash2, GripVertical
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PlanSetting {
  id: string;
  plan_key: string;
  plan_name: string;
  price: number;
  description: string | null;
  features: string[];
  payment_link: string | null;
  is_active: boolean;
  sort_order: number;
  billing_period: string;
  created_at: string;
  updated_at: string;
}

interface PlansManagementTabProps {
  fetchData: (action: string, params?: Record<string, any>) => Promise<any>;
}

const defaultPlan: Omit<PlanSetting, 'id' | 'created_at' | 'updated_at'> = {
  plan_key: '',
  plan_name: '',
  price: 0,
  description: '',
  features: [''],
  payment_link: '',
  is_active: true,
  sort_order: 0,
  billing_period: 'mensal',
};

export default function PlansManagementTab({ fetchData }: PlansManagementTabProps) {
  const [plans, setPlans] = useState<PlanSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanSetting | null>(null);
  const [formData, setFormData] = useState(defaultPlan);
  const [featuresText, setFeaturesText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await fetchData('get_plan_settings');
      if (data) setPlans(data);
    } catch {
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPlan(null);
    setFormData(defaultPlan);
    setFeaturesText('');
    setShowDialog(true);
  };

  const openEdit = (plan: PlanSetting) => {
    setEditingPlan(plan);
    setFormData({
      plan_key: plan.plan_key,
      plan_name: plan.plan_name,
      price: plan.price,
      description: plan.description || '',
      features: plan.features,
      payment_link: plan.payment_link || '',
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      billing_period: plan.billing_period,
    });
    setFeaturesText((plan.features || []).join('\n'));
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.plan_name || !formData.plan_key) {
      toast.error('Nome e chave do plano são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const features = featuresText
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const payload = {
        ...formData,
        features,
        price: Number(formData.price),
        sort_order: Number(formData.sort_order),
        plan_id: editingPlan?.id,
      };

      const action = editingPlan ? 'update_plan_setting' : 'create_plan_setting';
      const result = await fetchData(action, payload);

      if (result?.success) {
        toast.success(editingPlan ? 'Plano atualizado!' : 'Plano criado!');
        setShowDialog(false);
        loadPlans();
      } else {
        toast.error(result?.error || 'Erro ao salvar plano');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (planId: string) => {
    setSaving(true);
    try {
      const result = await fetchData('delete_plan_setting', { plan_id: planId });
      if (result?.success) {
        toast.success('Plano removido');
        setDeleteConfirmId(null);
        loadPlans();
      } else {
        toast.error('Erro ao remover plano');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: PlanSetting) => {
    try {
      await fetchData('update_plan_setting', {
        plan_id: plan.id,
        plan_key: plan.plan_key,
        plan_name: plan.plan_name,
        price: plan.price,
        description: plan.description,
        features: plan.features,
        payment_link: plan.payment_link,
        is_active: !plan.is_active,
        sort_order: plan.sort_order,
        billing_period: plan.billing_period,
      });
      toast.success(`Plano ${!plan.is_active ? 'ativado' : 'desativado'}`);
      loadPlans();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Gerenciar Planos
              </CardTitle>
              <CardDescription>
                Configure os planos, preços e links de pagamento exibidos para as empresas
              </CardDescription>
            </div>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Plano
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Plans List */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Crown className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum plano configurado ainda.</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
              <Plus className="w-4 h-4" />
              Criar primeiro plano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((plan) => (
              <Card key={plan.id} className={`transition-opacity ${!plan.is_active ? 'opacity-60' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Plan Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-lg">{plan.plan_name}</h3>
                        <Badge variant="outline" className="font-mono text-xs">{plan.plan_key}</Badge>
                        <Badge variant="secondary">{plan.billing_period}</Badge>
                        {plan.is_active ? (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                        <DollarSign className="w-5 h-5" />
                        R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                        <span className="text-sm font-normal text-muted-foreground">/{plan.billing_period}</span>
                      </div>

                      {plan.description && (
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      )}

                      {plan.features && plan.features.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {plan.features.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                              {f}
                            </div>
                          ))}
                        </div>
                      )}

                      {plan.payment_link && (
                        <div className="flex items-center gap-2 text-sm">
                          <Link className="w-4 h-4 text-blue-500" />
                          <a
                            href={plan.payment_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline truncate max-w-xs"
                          >
                            {plan.payment_link}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row lg:flex-col gap-2 lg:items-end">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Switch
                          checked={plan.is_active}
                          onCheckedChange={() => handleToggleActive(plan)}
                        />
                        <span>{plan.is_active ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(plan)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteConfirmId(plan.id)}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              {editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do plano que serão exibidos para as empresas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Plano *</Label>
                <Input
                  placeholder="ex: Premium Mensal"
                  value={formData.plan_name}
                  onChange={e => setFormData(p => ({ ...p, plan_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Chave Interna *</Label>
                <Input
                  placeholder="ex: premium_mensal"
                  value={formData.plan_key}
                  onChange={e => setFormData(p => ({ ...p, plan_key: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                  disabled={!!editingPlan}
                />
                {editingPlan && <p className="text-xs text-muted-foreground">A chave não pode ser alterada após criação</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="79.90"
                  value={formData.price}
                  onChange={e => setFormData(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Período de Cobrança</Label>
                <Input
                  placeholder="ex: mês, ano"
                  value={formData.billing_period}
                  onChange={e => setFormData(p => ({ ...p, billing_period: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Breve descrição do plano"
                value={formData.description || ''}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Link de Pagamento (Kirvano ou outro)
              </Label>
              <Input
                placeholder="https://pay.kirvano.com/..."
                value={formData.payment_link || ''}
                onChange={e => setFormData(p => ({ ...p, payment_link: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Cole aqui o link de pagamento da Kirvano, Stripe ou qualquer outra plataforma
              </p>
            </div>

            <div className="space-y-2">
              <Label>Recursos Incluídos (um por linha)</Label>
              <Textarea
                placeholder={`Sistema completo de agendamentos\nGestão de clientes e serviços\nRelatórios avançados`}
                value={featuresText}
                onChange={e => setFeaturesText(e.target.value)}
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordem de Exibição</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={e => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={v => setFormData(p => ({ ...p, is_active: v }))}
                />
                <Label>{formData.is_active ? 'Plano ativo (visível)' : 'Plano inativo (oculto)'}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este plano? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
