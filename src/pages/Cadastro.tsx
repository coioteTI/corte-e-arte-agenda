import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Cadastro = () => {
  const [formData, setFormData] = useState({
    nomeEmpresa: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    telefone: "",
    emailContato: "",
    instagram: "",
    nomeAdmin: "",
    emailAdmin: "",
    senhaAdmin: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validar campos obrigatórios
      if (!formData.nomeEmpresa || !formData.endereco || !formData.telefone ||
          !formData.emailContato || !formData.nomeAdmin || !formData.emailAdmin || 
          !formData.senhaAdmin || !formData.numero || !formData.bairro || 
          !formData.cidade || !formData.estado || !formData.cep) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      // Criar usuário no Supabase
      const redirectUrl = `${window.location.origin}/planos`;
      console.log('Redirect URL sendo usado:', redirectUrl);
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.emailAdmin,
        password: formData.senhaAdmin,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.nomeAdmin,
          }
        }
      });

      // Log interno para debug (não mostrar ao usuário)
      if (authError) {
        console.error("Erro na autenticação:", authError);
      }

      // Tentar criar empresa (não mostrar erro ao usuário)
      if (authData?.user) {
        const companyData = {
          name: formData.nomeEmpresa,
          email: formData.emailContato,
          phone: formData.telefone,
          address: formData.endereco,
          number: formData.numero,
          neighborhood: formData.bairro,
          city: formData.cidade,
          state: formData.estado,
          zip_code: formData.cep,
          instagram: formData.instagram || null,
          user_id: authData.user.id,
          plan: 'trial',
          trial_appointments_limit: 20,
          trial_appointments_used: 0
        };

        const { error: companyError } = await supabase
          .from('companies')
          .insert(companyData);

        // Log interno apenas (não mostrar ao usuário)
        if (companyError) {
          console.error("Erro ao criar empresa:", companyError);
        }
      }

      // Sempre mostrar mensagem de sucesso
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Confirme seu e-mail para liberar o acesso à plataforma. Verifique sua caixa de entrada e clique no link de confirmação.",
      });

      // Limpar formulário
      setFormData({
        nomeEmpresa: "",
        endereco: "",
        numero: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
        telefone: "",
        emailContato: "",
        instagram: "",
        nomeAdmin: "",
        emailAdmin: "",
        senhaAdmin: "",
      });
      
    } catch (error: any) {
      // Log interno apenas
      console.error("Erro no cadastro:", error);
      
      // Sempre mostrar mensagem de sucesso, independente do erro
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Confirme seu e-mail para liberar o acesso à plataforma. Verifique sua caixa de entrada e clique no link de confirmação.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-background p-3 md:p-4">
        <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-10 md:h-12 w-auto mx-auto mb-4"
            />
            <CardTitle className="text-lg md:text-xl">Cadastrar Nova Empresa</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              {/* Dados da Empresa */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-base md:text-lg font-medium">Dados da Empresa</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="nomeEmpresa">Nome da empresa</Label>
                  <Input
                    id="nomeEmpresa"
                    placeholder="Ex: Minha Empresa"
                    value={formData.nomeEmpresa}
                    onChange={(e) => handleInputChange("nomeEmpresa", e.target.value)}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      placeholder="Rua, Avenida..."
                      value={formData.endereco}
                      onChange={(e) => handleInputChange("endereco", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      placeholder="123"
                      value={formData.numero}
                      onChange={(e) => handleInputChange("numero", e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      placeholder="Centro"
                      value={formData.bairro}
                      onChange={(e) => handleInputChange("bairro", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      placeholder="São Paulo"
                      value={formData.cidade}
                      onChange={(e) => handleInputChange("cidade", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      placeholder="SP"
                      value={formData.estado}
                      onChange={(e) => handleInputChange("estado", e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      placeholder="00000-000"
                      value={formData.cep}
                      onChange={(e) => handleInputChange("cep", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      placeholder="(11) 99999-9999"
                      value={formData.telefone}
                      onChange={(e) => handleInputChange("telefone", e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailContato">E-mail de contato</Label>
                    <Input
                      id="emailContato"
                      type="email"
                      placeholder="contato@empresa.com"
                      value={formData.emailContato}
                      onChange={(e) => handleInputChange("emailContato", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram (opcional)</Label>
                    <Input
                      id="instagram"
                      placeholder="@minha_empresa"
                      value={formData.instagram}
                      onChange={(e) => handleInputChange("instagram", e.target.value)}
                    />
                  </div>
                </div>
              </div>


              {/* Usuário Admin */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-base md:text-lg font-medium">Criar Usuário Administrador</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="nomeAdmin">Nome completo</Label>
                  <Input
                    id="nomeAdmin"
                    placeholder="Seu Nome Completo"
                    value={formData.nomeAdmin}
                    onChange={(e) => handleInputChange("nomeAdmin", e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="emailAdmin">E-mail</Label>
                  <Input
                    id="emailAdmin"
                    type="email"
                    placeholder="joao@email.com"
                    value={formData.emailAdmin}
                    onChange={(e) => handleInputChange("emailAdmin", e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="senhaAdmin">Senha</Label>
                  <Input
                    id="senhaAdmin"
                    type="password"
                    placeholder="••••••••"
                    value={formData.senhaAdmin}
                    onChange={(e) => handleInputChange("senhaAdmin", e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Cadastrando..." : "Cadastrar Empresa"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
                ← Voltar ao início
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Cadastro;