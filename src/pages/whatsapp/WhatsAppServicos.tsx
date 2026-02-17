import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, Plus, Pencil, Trash2 } from "lucide-react";

interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  is_active: boolean;
}

const WhatsAppServicos = () => {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", duration: "30" });

  useEffect(() => { loadTenant(); }, []);

  const loadTenant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("whatsapp_tenants").select("id").eq("user_id", user.id).maybeSingle();
    if (data) { setTenantId(data.id); loadServices(data.id); }
  };

  const loadServices = async (tId: string) => {
    const { data } = await supabase.from("whatsapp_services").select("*").eq("tenant_id", tId).order("name");
    if (data) setServices(data);
  };

  const handleSave = async () => {
    if (!tenantId || !form.name.trim() || !form.price) {
      toast({ title: "Erro", description: "Nome e preço são obrigatórios", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        tenant_id: tenantId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: parseFloat(form.price),
        duration: parseInt(form.duration) || 30,
      };
      if (editing) {
        const { error } = await supabase.from("whatsapp_services").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_services").insert(payload);
        if (error) throw error;
      }
      toast({ title: editing ? "Serviço atualizado!" : "Serviço criado!" });
      setIsOpen(false);
      setEditing(null);
      setForm({ name: "", description: "", price: "", duration: "30" });
      loadServices(tenantId);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const toggleActive = async (s: Service) => {
    await supabase.from("whatsapp_services").update({ is_active: !s.is_active }).eq("id", s.id);
    if (tenantId) loadServices(tenantId);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("whatsapp_services").delete().eq("id", id);
    if (tenantId) loadServices(tenantId);
    toast({ title: "Serviço removido" });
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description || "", price: String(s.price), duration: String(s.duration) });
    setIsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Briefcase className="h-6 w-6" /> Serviços</h1>
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setEditing(null); setForm({ name: "", description: "", price: "", duration: "30" }); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo Serviço</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço (R$) *</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Duração (min)</Label><Input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
              </div>
              <Button className="w-full" onClick={handleSave}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum serviço cadastrado</TableCell></TableRow>
              ) : (
                services.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>R$ {s.price.toFixed(2)}</TableCell>
                    <TableCell>{s.duration} min</TableCell>
                    <TableCell><Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppServicos;
