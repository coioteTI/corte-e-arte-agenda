import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, Globe, CheckCircle, XCircle, AlertCircle, Send } from "lucide-react";

interface WebhookLog {
  id: string;
  email: string;
  evento: string;
  produto: string | null;
  token_received: string | null;
  raw_payload: any;
  processed_at: string;
  user_found: boolean;
  plan_updated: boolean;
  error_message: string | null;
  created_at: string;
}

const WebhookLogs = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [testPayload, setTestPayload] = useState({
    email: "",
    evento: "assinatura renovada",
    produto: "Plano Premium Mensal",
    token: "tjud6lgfb19"
  });
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const { toast } = useToast();

  const webhookUrl = `https://gwyickztdeiplccievyt.supabase.co/functions/v1/kiwify-webhook`;

  useEffect(() => {
    loadWebhookLogs();
  }, []);

  const loadWebhookLogs = async () => {
    try {
      setLoading(true);
      
      // Get current user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from('companies')
        .select('email')
        .eq('user_id', user.id)
        .single();

      if (!company) return;

      // Load webhook logs for this company's email
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('email', company.email)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading webhook logs:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar logs de webhook",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    if (!testPayload.email || !testPayload.evento) {
      toast({
        title: "Erro",
        description: "Preencha pelo menos o email e evento",
        variant: "destructive"
      });
      return;
    }

    setIsTestingWebhook(true);
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Teste realizado com sucesso",
          description: "Webhook processado com sucesso. Atualize a página para ver o log.",
        });
        
        // Reload logs after a short delay
        setTimeout(() => {
          loadWebhookLogs();
        }, 1000);
      } else {
        toast({
          title: "Erro no teste",
          description: result.error || "Erro desconhecido",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: "Erro",
        description: "Erro ao testar webhook",
        variant: "destructive"
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "URL copiada!",
      description: "A URL do webhook foi copiada para a área de transferência",
    });
  };

  const getStatusBadge = (log: WebhookLog) => {
    if (log.error_message) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Erro
      </Badge>;
    }
    
    if (log.plan_updated) {
      return <Badge variant="default" className="flex items-center gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Sucesso
      </Badge>;
    }

    return <Badge variant="secondary" className="flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      Processado
    </Badge>;
  };

  const getEventoBadge = (evento: string) => {
    const eventLower = evento.toLowerCase();
    
    if (eventLower.includes('renovada') || eventLower.includes('aprovada')) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
        {evento}
      </Badge>;
    }
    
    if (eventLower.includes('cancelada') || eventLower.includes('atrasada')) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
        {evento}
      </Badge>;
    }
    
    return <Badge variant="outline">
      {evento}
    </Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando logs...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Logs de Webhook Kiwify</h1>
          <p className="text-muted-foreground">
            Monitore e teste a integração com a Kiwify
          </p>
        </div>

        <Tabs defaultValue="logs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="logs">Logs de Eventos</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="test">Teste Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Logs Recentes</h2>
                <Badge variant="outline">{logs.length} eventos</Badge>
              </div>
              <Button onClick={loadWebhookLogs} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Globe className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">
                              Nenhum evento de webhook registrado ainda
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Configure o webhook na Kiwify para começar a receber eventos
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.email}
                          </TableCell>
                          <TableCell>
                            {getEventoBadge(log.evento)}
                          </TableCell>
                          <TableCell>
                            {log.produto || '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log)}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedLog(log)}
                                >
                                  Ver Detalhes
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Detalhes do Webhook</DialogTitle>
                                </DialogHeader>
                                {selectedLog && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <Label className="text-sm font-medium">Status</Label>
                                        <div className="mt-1">{getStatusBadge(selectedLog)}</div>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Processado em</Label>
                                        <p className="text-sm">
                                          {format(new Date(selectedLog.processed_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Usuário Encontrado</Label>
                                        <p className="text-sm">
                                          {selectedLog.user_found ? "✅ Sim" : "❌ Não"}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="text-sm font-medium">Plano Atualizado</Label>
                                        <p className="text-sm">
                                          {selectedLog.plan_updated ? "✅ Sim" : "❌ Não"}
                                        </p>
                                      </div>
                                    </div>

                                    {selectedLog.error_message && (
                                      <div>
                                        <Label className="text-sm font-medium text-red-600">Erro</Label>
                                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                          {selectedLog.error_message}
                                        </p>
                                      </div>
                                    )}

                                    <div>
                                      <Label className="text-sm font-medium">Payload Completo</Label>
                                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-60">
                                        {JSON.stringify(selectedLog.raw_payload, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  URL do Webhook
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">URL para configurar na Kiwify:</Label>
                  <div className="flex gap-2 mt-2">
                    <Input 
                      value={webhookUrl} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button onClick={copyWebhookUrl} variant="outline">
                      Copiar
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Como configurar na Kiwify:</h4>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>Acesse sua conta na Kiwify</li>
                    <li>Vá em Configurações → Webhooks</li>
                    <li>Cole a URL acima no campo de webhook</li>
                    <li>Selecione os eventos: Assinatura cancelada, Assinatura atrasada, Assinatura renovada, Compra aprovada</li>
                    <li>Ative o webhook</li>
                  </ol>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Token de Segurança:</h4>
                  <p className="text-sm">
                    O token de segurança <code className="bg-gray-100 px-1 rounded">tjud6lgfb19</code> é 
                    validado automaticamente. Certifique-se de que a Kiwify está enviando este token.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Teste Manual do Webhook
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="test-email">Email do Cliente</Label>
                    <Input
                      id="test-email"
                      value={testPayload.email}
                      onChange={(e) => setTestPayload({...testPayload, email: e.target.value})}
                      placeholder="cliente@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-evento">Evento</Label>
                    <select
                      id="test-evento"
                      value={testPayload.evento}
                      onChange={(e) => setTestPayload({...testPayload, evento: e.target.value})}
                      className="w-full px-3 py-2 border border-input rounded-md"
                    >
                      <option value="assinatura renovada">Assinatura Renovada</option>
                      <option value="assinatura aprovada">Assinatura Aprovada</option>
                      <option value="assinatura cancelada">Assinatura Cancelada</option>
                      <option value="assinatura atrasada">Assinatura Atrasada</option>
                      <option value="compra aprovada">Compra Aprovada</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="test-produto">Produto</Label>
                    <select
                      id="test-produto"
                      value={testPayload.produto}
                      onChange={(e) => setTestPayload({...testPayload, produto: e.target.value})}
                      className="w-full px-3 py-2 border border-input rounded-md"
                    >
                      <option value="Plano Premium Mensal">Plano Premium Mensal</option>
                      <option value="Plano Premium Anual">Plano Premium Anual</option>
                      <option value="Plano Básico">Plano Básico</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="test-token">Token</Label>
                    <Input
                      id="test-token"
                      value={testPayload.token}
                      onChange={(e) => setTestPayload({...testPayload, token: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label>Payload que será enviado:</Label>
                  <Textarea
                    value={JSON.stringify(testPayload, null, 2)}
                    readOnly
                    className="font-mono text-sm h-32"
                  />
                </div>

                <Button 
                  onClick={testWebhook} 
                  disabled={isTestingWebhook}
                  className="w-full"
                >
                  {isTestingWebhook ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Testar Webhook
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WebhookLogs;