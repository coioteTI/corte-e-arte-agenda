import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Settings, Bell } from "lucide-react";
import ClientLayout from "@/components/client/ClientLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/AvatarUpload";
import { NotificationSettings } from "@/components/NotificationSettings";

const ConfiguracoesCliente = () => {
  const [user, setUser] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar_url: '',
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      // Buscar dados do perfil
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      const profileData = Array.isArray(profiles) ? profiles[0] : profiles;
      if (profileData) {
        setProfile(profileData);
      }

      // Buscar dados do cliente
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientData) {
        setClient(clientData);
        setFormData({
          name: clientData.name || profileData?.full_name || '',
          email: clientData.email || user.email || '',
          phone: clientData.phone || profileData?.phone || '',
          avatar_url: clientData.avatar_url || '',
        });
      } else {
        setFormData({
          name: profileData?.full_name || '',
          email: user.email || '',
          phone: profileData?.phone || '',
          avatar_url: '',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      toast.error('Erro ao carregar suas informações');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpdate = (newAvatarUrl: string) => {
    setFormData(prev => ({ ...prev, avatar_url: newAvatarUrl }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!user) throw new Error('Usuário não autenticado');

      // Atualizar ou criar perfil
      const profileData = {
        user_id: user.id,
        full_name: formData.name,
        phone: formData.phone,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (profileError) throw profileError;

      // Atualizar ou criar cliente
      const clientData = {
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        avatar_url: formData.avatar_url,
      };

      if (client) {
        const { error: updateError } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', client.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('clients')
          .insert(clientData);

        if (insertError) throw insertError;
      }

      toast.success('Informações atualizadas com sucesso!');
      fetchUserData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar suas informações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Configurações</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Configurações</h1>
        </div>

        {/* Perfil do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Meu Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Upload de Avatar */}
            <div className="text-center">
              <AvatarUpload
                currentAvatarUrl={formData.avatar_url}
                userId={user?.id}
                onAvatarUpdate={handleAvatarUpdate}
                size="lg"
              />
            </div>

            <Separator />

            {/* Informações Pessoais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Notificação */}
        <NotificationSettings isClient={true} />

        {/* Informações da Conta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p><strong>ID do Usuário:</strong> {user?.id}</p>
              <p><strong>Email da Conta:</strong> {user?.email}</p>
              <p><strong>Conta Criada em:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'Não disponível'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
};

export default ConfiguracoesCliente;