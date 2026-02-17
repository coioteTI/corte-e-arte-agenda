import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Search, Pencil, Trash2 } from "lucide-react";

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
}

const WhatsAppContatos = () => {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", birth_date: "", notes: "" });

  useEffect(() => { loadTenant(); }, []);

  const loadTenant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("whatsapp_tenants").select("id").eq("user_id", user.id).maybeSingle();
    if (data) { setTenantId(data.id); loadContacts(data.id); }
  };

  const loadContacts = async (tId: string) => {
    const { data } = await supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("tenant_id", tId)
      .order("created_at", { ascending: false });
    if (data) setContacts(data);
  };

  const handleSave = async () => {
    if (!tenantId || !form.phone.trim()) {
      toast({ title: "Erro", description: "Telefone é obrigatório", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        tenant_id: tenantId,
        phone: form.phone.trim(),
        name: form.name.trim() || null,
        birth_date: form.birth_date || null,
        notes: form.notes.trim() || null,
      };

      if (editingContact) {
        const { error } = await supabase.from("whatsapp_contacts").update(payload).eq("id", editingContact.id);
        if (error) throw error;
        toast({ title: "Contato atualizado!" });
      } else {
        const { error } = await supabase.from("whatsapp_contacts").insert(payload);
        if (error) throw error;
        toast({ title: "Contato adicionado!" });
      }
      setIsOpen(false);
      setEditingContact(null);
      setForm({ name: "", phone: "", birth_date: "", notes: "" });
      loadContacts(tenantId);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenantId) return;
    const { error } = await supabase.from("whatsapp_contacts").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Contato removido" });
    loadContacts(tenantId);
  };

  const openEdit = (c: Contact) => {
    setEditingContact(c);
    setForm({ name: c.name || "", phone: c.phone, birth_date: c.birth_date || "", notes: c.notes || "" });
    setIsOpen(true);
  };

  const filtered = contacts.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" /> Contatos</h1>
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setEditingContact(null); setForm({ name: "", phone: "", birth_date: "", notes: "" }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo Contato</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingContact ? "Editar Contato" : "Novo Contato"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Telefone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="5511999999999" /></div>
              <div><Label>Data de Nascimento</Label><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
              <div><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={handleSave}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar contato..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Aniversário</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum contato encontrado</TableCell></TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name || "—"}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.birth_date ? new Date(c.birth_date + 'T12:00:00').toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default WhatsAppContatos;
