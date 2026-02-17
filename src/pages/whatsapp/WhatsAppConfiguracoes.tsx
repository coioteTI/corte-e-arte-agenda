import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Building2, MessageSquare, Cake, Key, Loader2, Copy, ExternalLink } from "lucide-react";

interface Tenant {
  id: string;
  company_name: string;
  address: string | null;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  business_hours: any;
  whatsapp_phone_number_id: string | null;
  whatsapp_access_token: string | null;
  whatsapp_business_account_id: string | null;
  whatsapp_verify_token: string | null;
  bot_enabled: boolean;
  birthday_message_enabled: boolean;
  birthday_message_template: string | null;
}

const daysMap: Record<string, string> = {
  monday: "Segunda", tuesday: "Terça", wednesday: "Quarta",
  thursday: "Quinta", friday: "Sexta", saturday: "Sábado", sunday: "Domingo",
};

const WhatsAppConfiguracoes = () => {
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => { loadTenant(); }, []);

  const loadTenant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("whatsapp_tenants").select("*").eq("user_id", user.id).maybeSingle();
    if (data) { setTenant(data as Tenant); setForm(data); }
  };

  const handleSave = async (fields: Partial<Tenant>) => {
    if (!tenant) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("whatsapp_tenants").update(fields).eq("id", tenant.id);
      if (error) throw error;
      toast({ title: "Configurações salvas!" });
      loadTenant();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const webhookUrl = tenant
    ? `https://gwyickztdeiplcciebyt.supabase.co/functions/v1/whatsapp-webhook?tenant=${tenant.id}`
    : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  if (!tenant) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Configurações</h1>

      <Tabs defaultValue="empresa">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp API</TabsTrigger>
          <TabsTrigger value="bot">Bot & Aniversário</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Nome da Empresa</Label><Input value={form.company_name || ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
              <div><Label>Endereço</Label><Input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>E-mail</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Telefone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div><Label>Instagram</Label><Input value={form.instagram || ""} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@suaempresa" /></div>
              <Button onClick={() => handleSave({ company_name: form.company_name, address: form.address, email: form.email, phone: form.phone, instagram: form.instagram })} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horarios" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Horário de Funcionamento</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(daysMap).map(([key, label]) => {
                const day = form.business_hours?.[key] || { start: "08:00", end: "18:00", isOpen: true };
                return (
                  <div key={key} className="flex items-center gap-3 flex-wrap">
                    <Switch
                      checked={day.isOpen}
                      onCheckedChange={(checked) => {
                        const updated = { ...form.business_hours, [key]: { ...day, isOpen: checked } };
                        setForm({ ...form, business_hours: updated });
                      }}
                    />
                    <span className="w-24 text-sm font-medium">{label}</span>
                    <Input type="time" value={day.start} className="w-28" disabled={!day.isOpen}
                      onChange={(e) => {
                        const updated = { ...form.business_hours, [key]: { ...day, start: e.target.value } };
                        setForm({ ...form, business_hours: updated });
                      }} />
                    <span className="text-sm">até</span>
                    <Input type="time" value={day.end} className="w-28" disabled={!day.isOpen}
                      onChange={(e) => {
                        const updated = { ...form.business_hours, [key]: { ...day, end: e.target.value } };
                        setForm({ ...form, business_hours: updated });
                      }} />
                  </div>
                );
              })}
              <Button onClick={() => handleSave({ business_hours: form.business_hours })} disabled={loading} className="mt-4">Salvar Horários</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" /> Meta WhatsApp Cloud API</CardTitle>
              <CardDescription>
                Configure suas credenciais da Meta para conectar seu número de WhatsApp.{" "}
                <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                  Guia de configuração <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Phone Number ID</Label><Input value={form.whatsapp_phone_number_id || ""} onChange={(e) => setForm({ ...form, whatsapp_phone_number_id: e.target.value })} placeholder="Encontre no Meta Business Suite" /></div>
              <div><Label>Access Token (permanente)</Label><Input type="password" value={form.whatsapp_access_token || ""} onChange={(e) => setForm({ ...form, whatsapp_access_token: e.target.value })} /></div>
              <div><Label>Business Account ID</Label><Input value={form.whatsapp_business_account_id || ""} onChange={(e) => setForm({ ...form, whatsapp_business_account_id: e.target.value })} /></div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <Label className="text-sm font-semibold">URL do Webhook (cole na Meta)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={webhookUrl} className="text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}><Copy className="h-4 w-4" /></Button>
                </div>
                <Label className="text-sm font-semibold">Verify Token</Label>
                <div className="flex gap-2">
                  <Input readOnly value={form.whatsapp_verify_token || ""} className="text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(form.whatsapp_verify_token || "")}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>

              <Button onClick={() => handleSave({ whatsapp_phone_number_id: form.whatsapp_phone_number_id, whatsapp_access_token: form.whatsapp_access_token, whatsapp_business_account_id: form.whatsapp_business_account_id })} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar Credenciais
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bot" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Bot Inteligente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Bot Ativado</Label><p className="text-xs text-muted-foreground">O bot responderá automaticamente com base nos dados da empresa</p></div>
                <Switch checked={form.bot_enabled ?? true} onCheckedChange={(v) => { setForm({ ...form, bot_enabled: v }); handleSave({ bot_enabled: v }); }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cake className="h-5 w-5" /> Mensagem de Aniversário</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label>Envio Automático</Label><p className="text-xs text-muted-foreground">Enviar mensagem de aniversário automaticamente</p></div>
                <Switch checked={form.birthday_message_enabled ?? true} onCheckedChange={(v) => { setForm({ ...form, birthday_message_enabled: v }); handleSave({ birthday_message_enabled: v }); }} />
              </div>
              <div>
                <Label>Modelo da Mensagem</Label>
                <p className="text-xs text-muted-foreground mb-1">Use {"{nome}"} para o nome do cliente e {"{empresa}"} para o nome da empresa</p>
                <Textarea
                  value={form.birthday_message_template || ""}
                  onChange={(e) => setForm({ ...form, birthday_message_template: e.target.value })}
                  rows={3}
                />
              </div>
              <Button onClick={() => handleSave({ birthday_message_template: form.birthday_message_template })} disabled={loading}>Salvar Mensagem</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppConfiguracoes;
