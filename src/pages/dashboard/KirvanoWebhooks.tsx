import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, RefreshCw, Send, AlertCircle, CheckCircle2, Clock, ChevronLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface KirvanoLog {
  id: string;
  email: string;
  evento: string;
  produto: string | null;
  recebido_em: string;
  status_execucao: string;
  detalhes: any;
  user_found: boolean;
  plan_updated: boolean;
  error_message: string | null;
  created_at: string;
}

export default function KirvanoWebhooks() {
  const [logs, setLogs] = useState<KirvanoLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<KirvanoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<KirvanoLog | null>(null);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [testEmail, setTestEmail] = useState("");
  const [testEvento, setTestEvento] = useState("");
  const [testProduto, setTestProduto] = useState("");
  const [testToken, setTestToken] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, eventFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Buscar empresa do usuário
      const { data: company } = await supabase
        .from("companies")
        .select("email")
        .eq("user_id", user.id)
        .single();

      if (!company) {
        toast({
          title: "Erro",
          description: "Empresa não encontrada",
          variant: "destructive",
        });
        return;
      }

      // Buscar logs da empresa
      const { data, error } = await supabase
        .from("kirvano_logs")
        .select("*")
        .eq("email", company.email)
        .order("recebido_em", { ascending: false });

      if (error) throw error;

      setLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
      toast({
        title: "Erro ao carregar logs",
        description: "Não foi possível carregar os logs do webhook",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    if (eventFilter === "all") {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter(log => 
        log.evento.toLowerCase().includes(eventFilter.toLowerCase())
      ));
    }
  };

  const testWebhook = async () => {
    if (!testEmail || !testEvento) {
      toast({
        title: "Campos obrigatórios",
        description: "Email e evento são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsTesting(true);
      
      const payload = {
        email: testEmail,
        evento: testEvento,
        produto: testProduto || undefined,
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (testToken) {
        headers['x-webhook-token'] = testToken;
      }

      const response = await fetch(
        'https://gwyickztdeiplccievyt.supabase.co/functions/v1/kirvano-webhook',
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Webhook testado com sucesso!",
          description: `Status: ${response.status}. ${result.message || ''}`,
        });
        await loadLogs();
      } else {
        toast({
          title: "Erro ao testar webhook",
          description: result.error || `Status: ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast({
        title: "Erro ao testar webhook",
        description: "Não foi possível conectar ao webhook",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const reprocessEvent = async (log: KirvanoLog) => {
    try {
      const payload = {
        email: log.email,
        evento: log.evento,
        produto: log.produto,
      };

      const response = await fetch(
        'https://gwyickztdeiplccievyt.supabase.co/functions/v1/kirvano-webhook',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-token': testToken || '',
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Evento reprocessado!",
          description: `${result.message || 'Sucesso'}`,
        });
        await loadLogs();
      } else {
        toast({
          title: "Erro ao reprocessar",
          description: result.error || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error reprocessing event:", error);
      toast({
        title: "Erro ao reprocessar",
        description: "Não foi possível reprocessar o evento",
        variant: "destructive",
      });
    }
  };

  const copyWebhookUrl = () => {
    const url = 'https://gwyickztdeiplccievyt.supabase.co/functions/v1/kirvano-webhook';
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copiada!",
      description: "A URL do webhook foi copiada para a área de transferência",
    });
  };

  const getStatusBadge = (log: KirvanoLog) => {
    if (log.status_execucao === 'error') {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Erro</Badge>;
    }
    if (log.status_execucao === 'success') {
      return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Sucesso</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Processado</Badge>;
  };

  const getEventoBadge = (evento: string) => {
    if (evento.toLowerCase().includes('renovada') || evento.toLowerCase().includes('aprovado')) {
      return <Badge variant="default" className="bg-green-600">{evento}</Badge>;
    }
    if (evento.toLowerCase().includes('cancelada')) {
      return <Badge variant="destructive">{evento}</Badge>;
    }
    if (evento.toLowerCase().includes('atrasada')) {
      return <Badge variant="secondary" className="bg-yellow-600">{evento}</Badge>;
    }
    return <Badge variant="outline">{evento}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Webhooks Kirvano</h1>
            <p className="text-muted-foreground mt-1">
              Monitore e gerencie os eventos de assinatura da Kirvano
            </p>
          </div>
          <Button onClick={loadLogs} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="test">Teste Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Eventos Recebidos</CardTitle>
              <CardDescription>
                Histórico de todos os webhooks recebidos da Kirvano
              </CardDescription>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <Label htmlFor="event-filter">Filtrar por evento</Label>
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger id="event-filter">
                      <SelectValue placeholder="Selecione o tipo de evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os eventos</SelectItem>
                      <SelectItem value="renovada">Assinatura Renovada</SelectItem>
                      <SelectItem value="cancelada">Assinatura Cancelada</SelectItem>
                      <SelectItem value="atrasada">Assinatura Atrasada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum evento encontrado
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {new Date(log.recebido_em).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>{log.email}</TableCell>
                          <TableCell>{getEventoBadge(log.evento)}</TableCell>
                          <TableCell>{log.produto || '-'}</TableCell>
                          <TableCell>{getStatusBadge(log)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedLog(log)}
                              >
                                Detalhes
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => reprocessEvent(log)}
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>URL do Webhook</CardTitle>
              <CardDescription>
                Configure esta URL na sua conta da Kirvano
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value="https://gwyickztdeiplccievyt.supabase.co/functions/v1/kirvano-webhook"
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={copyWebhookUrl} variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Instruções de Configuração:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Acesse o painel da Kirvano</li>
                  <li>Navegue até Configurações → Webhooks</li>
                  <li>Cole a URL acima no campo de webhook</li>
                  <li>Configure o header <code className="bg-muted px-1 py-0.5 rounded">x-webhook-token</code> com seu token secreto</li>
                  <li>Selecione os eventos: Assinatura Renovada, Assinatura Cancelada, Assinatura Atrasada</li>
                  <li>Salve as configurações</li>
                </ol>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Formato do Payload:</h4>
                <pre className="text-xs overflow-x-auto">
{`{
  "email": "cliente@exemplo.com",
  "evento": "assinatura renovada",
  "produto": "Anual Premium"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testar Webhook Manualmente</CardTitle>
              <CardDescription>
                Envie um evento de teste para o webhook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">Email *</Label>
                <Input
                  id="test-email"
                  placeholder="cliente@exemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-evento">Evento *</Label>
                <Select value={testEvento} onValueChange={setTestEvento}>
                  <SelectTrigger id="test-evento">
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assinatura renovada">Assinatura Renovada</SelectItem>
                    <SelectItem value="assinatura cancelada">Assinatura Cancelada</SelectItem>
                    <SelectItem value="assinatura atrasada">Assinatura Atrasada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-produto">Produto</Label>
                <Select value={testProduto} onValueChange={setTestProduto}>
                  <SelectTrigger id="test-produto">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mensal Premium">Mensal Premium</SelectItem>
                    <SelectItem value="Anual Premium">Anual Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-token">Token de Webhook (opcional)</Label>
                <Input
                  id="test-token"
                  type="password"
                  placeholder="Seu token secreto"
                  value={testToken}
                  onChange={(e) => setTestToken(e.target.value)}
                />
              </div>

              <Button
                onClick={testWebhook}
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Teste
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
            <DialogDescription>
              Informações completas sobre o evento do webhook
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold">Status</p>
                  <p className="text-sm">{getStatusBadge(selectedLog)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Data/Hora</p>
                  <p className="text-sm">{new Date(selectedLog.recebido_em).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Email</p>
                  <p className="text-sm">{selectedLog.email}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Evento</p>
                  <p className="text-sm">{selectedLog.evento}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Produto</p>
                  <p className="text-sm">{selectedLog.produto || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Usuário Encontrado</p>
                  <p className="text-sm">{selectedLog.user_found ? '✅ Sim' : '❌ Não'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">Plano Atualizado</p>
                  <p className="text-sm">{selectedLog.plan_updated ? '✅ Sim' : '❌ Não'}</p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="bg-destructive/10 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-destructive">Erro:</p>
                  <p className="text-sm text-destructive">{selectedLog.error_message}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold mb-2">Detalhes Completos:</p>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedLog.detalhes, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}