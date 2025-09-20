import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TesteEmail = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingSimple, setIsTestingSimple] = useState(false);
  const [isTestingAppointment, setIsTestingAppointment] = useState(false);
  const { toast } = useToast();

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const currentOrigin = window.location.origin;
      console.log('Current origin:', currentOrigin);
      
      const redirectUrl = `${currentOrigin}/email-confirmado`;
      console.log('Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: "Teste Usuario"
          }
        }
      });

      console.log('Signup data:', data);
      console.log('Signup error:', error);

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Email de confirmação enviado! Verifique o console para logs.",
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSimpleEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Erro",
        description: "Por favor, insira um email para teste.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingSimple(true);
    
    try {
      console.log('🧪 Testando função de email simples...');
      
      const { data, error } = await supabase.functions.invoke('test-email', {
        body: { email: testEmail }
      });

      console.log('Test email response:', { data, error });

      if (error) {
        throw error;
      }

      toast({
        title: "✅ Sucesso",
        description: "Email de teste enviado com sucesso! Verifique sua caixa de entrada.",
      });
    } catch (error: any) {
      console.error('❌ Erro ao enviar email de teste:', error);
      toast({
        title: "❌ Erro",
        description: `Erro ao enviar email: ${error.message || error.toString()}`,
        variant: "destructive",
      });
    } finally {
      setIsTestingSimple(false);
    }
  };

  const handleTestAppointmentEmail = async () => {
    if (!testEmail) {
      toast({
        title: "Erro",
        description: "Por favor, insira um email para teste.",
        variant: "destructive",
      });
      return;
    }

    setIsTestingAppointment(true);
    
    try {
      console.log('🧪 Testando função de email de agendamento...');
      
      const testData = {
        clientName: "Cliente Teste",
        clientEmail: testEmail,
        companyName: "Barbearia Teste",
        serviceName: "Corte de Cabelo",
        professionalName: "João Barbeiro",
        appointmentDate: "2024-12-25",
        appointmentTime: "14:30",
        totalPrice: 50.00,
        paymentMethod: "no_local",
        companyPhone: "(11) 99999-9999",
        notes: "Este é um teste do sistema de agendamento"
      };
      
      const { data, error } = await supabase.functions.invoke('send-appointment-confirmation', {
        body: testData
      });

      console.log('Appointment email response:', { data, error });

      if (error) {
        throw error;
      }

      toast({
        title: "✅ Sucesso",
        description: "Email de confirmação de agendamento enviado com sucesso!",
      });
    } catch (error: any) {
      console.error('❌ Erro ao enviar email de agendamento:', error);
      toast({
        title: "❌ Erro",
        description: `Erro ao enviar email: ${error.message || error.toString()}`,
        variant: "destructive",
      });
    } finally {
      setIsTestingAppointment(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="grid gap-6 w-full max-w-2xl">
        
        {/* Teste de Email Simples */}
        <Card>
          <CardHeader>
            <CardTitle>🧪 Teste de Email Simples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Email para teste</Label>
              <Input
                id="testEmail"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleTestSimpleEmail} 
                disabled={isTestingSimple}
                className="flex-1"
              >
                {isTestingSimple ? "Enviando..." : "Testar Email Simples"}
              </Button>
              
              <Button 
                onClick={handleTestAppointmentEmail} 
                disabled={isTestingAppointment}
                variant="secondary"
                className="flex-1"
              >
                {isTestingAppointment ? "Enviando..." : "Testar Email Agendamento"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Teste de Email de Confirmação (Original) */}
        <Card>
          <CardHeader>
            <CardTitle>📧 Teste Email de Confirmação (Cadastro)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Testar Email de Cadastro"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TesteEmail;