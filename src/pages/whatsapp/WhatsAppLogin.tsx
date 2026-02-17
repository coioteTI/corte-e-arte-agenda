import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Loader2 } from "lucide-react";

const WhatsAppLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regCompany, setRegCompany] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");

      const { data: tenant } = await supabase
        .from("whatsapp_tenants")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!tenant) {
        navigate("/whatsapp/setup");
      } else {
        navigate("/whatsapp/dashboard");
      }
    } catch (error: any) {
      toast({ title: "Erro no login", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCompany.trim()) {
      toast({ title: "Erro", description: "Nome da empresa é obrigatório", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar conta");

      const { error: tenantError } = await supabase
        .from("whatsapp_tenants")
        .insert({ user_id: authData.user.id, company_name: regCompany.trim(), email: regEmail });
      if (tenantError) throw tenantError;

      toast({ title: "Conta criada!", description: "Bem-vindo ao WhatsApp CRM." });
      navigate("/whatsapp/dashboard");
    } catch (error: any) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-xl bg-primary flex items-center justify-center mb-3">
            <MessageSquare className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">WhatsApp CRM</CardTitle>
          <CardDescription>Gestão e atendimento via WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div>
                  <Label>Nome da Empresa</Label>
                  <Input value={regCompany} onChange={(e) => setRegCompany(e.target.value)} required />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar Conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppLogin;
