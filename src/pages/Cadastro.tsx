import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";

const Cadastro = () => {
  const [formData, setFormData] = useState({
    nomeBarbearia: "",
    endereco: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    cep: "",
    telefone: "",
    emailContato: "",
    instagram: "",
    plano: "pro",
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
    
    // Simular cadastro por enquanto
    setTimeout(() => {
      setIsLoading(false);
      
      // Salvar dados da empresa
      localStorage.setItem('nomeBarbearia', formData.nomeBarbearia);
      localStorage.setItem('planoSelecionado', formData.plano);
      
      toast({
        title: "Cadastro realizado com sucesso!",
        description: `Plano ${formData.plano === 'pro' ? 'Pro' : 'Premium'} selecionado. Redirecionando para pagamento...`,
      });
      
      // Redirecionar para página de pagamento (simulado)
      setTimeout(() => {
        navigate("/login");
      }, 1000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="h-12 w-auto mx-auto mb-4"
            />
            <CardTitle className="text-xl">Cadastrar Barbearia & Salão</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados da Barbearia */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dados da Barbearia/Salão</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="nomeBarbearia">Nome da barbearia/salão</Label>
                  <Input
                    id="nomeBarbearia"
                    placeholder="Ex: Barbearia do João"
                    value={formData.nomeBarbearia}
                    onChange={(e) => handleInputChange("nomeBarbearia", e.target.value)}
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
                      placeholder="contato@barbearia.com"
                      value={formData.emailContato}
                      onChange={(e) => handleInputChange("emailContato", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram (opcional)</Label>
                    <Input
                      id="instagram"
                      placeholder="@barbearia_do_joao"
                      value={formData.instagram}
                      onChange={(e) => handleInputChange("instagram", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Plano */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Escolha seu Plano</h3>
                <RadioGroup value={formData.plano} onValueChange={(value) => handleInputChange("plano", value)}>
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="pro" id="pro" />
                    <Label htmlFor="pro" className="flex-1">
                      <div className="font-medium">Plano Pro - R$ 29/mês</div>
                      <div className="text-sm text-muted-foreground">
                        Acesso completo, agenda ilimitada, relatórios básicos
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-4 border rounded-lg">
                    <RadioGroupItem value="premium" id="premium" />
                    <Label htmlFor="premium" className="flex-1">
                      <div className="font-medium">Plano Premium - R$ 59/mês</div>
                      <div className="text-sm text-muted-foreground">
                        Tudo do Pro + notificações WhatsApp, relatórios avançados, fidelização
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Usuário Admin */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Criar Usuário Administrador</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="nomeAdmin">Nome completo</Label>
                  <Input
                    id="nomeAdmin"
                    placeholder="João Silva"
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
                {isLoading ? "Cadastrando..." : "Cadastrar Barbearia"}
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