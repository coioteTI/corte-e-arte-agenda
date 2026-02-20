import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SistemaConfig } from "@/types/configuracoes";
import { Download, Smartphone, Monitor, CheckCircle } from "lucide-react";

interface SistemaSectionProps {
  configuracoes: SistemaConfig;
  onSwitchChange: (campo: string, valor: boolean) => void;
}

export const SistemaSection = ({ configuracoes, onSwitchChange }: SistemaSectionProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
      setIsInstalling(false);
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      if (isIOS) {
        alert('Para instalar no iPhone/iPad:\n1. Toque no botão Compartilhar (⎙)\n2. Toque em "Adicionar à Tela de Início"\n3. Toque em "Adicionar"');
      } else if (isAndroid) {
        alert('Para instalar no Android:\n1. Toque no menu do navegador (⋮)\n2. Toque em "Adicionar à tela inicial"\n3. Confirme a instalação');
      } else {
        alert('Para instalar no computador:\n1. Clique no ícone de instalação (⊕) na barra de endereços\n2. Clique em "Instalar"\nUse Chrome ou Edge para melhor experiência.');
      }
    }
  };

  return (
    <>
      {/* Download / Install App Card */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Instalar Aplicativo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Instale a plataforma como um aplicativo no seu dispositivo para acesso mais rápido, mesmo sem internet.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Acesso rápido pela tela inicial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Funciona sem internet (offline)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Notificações em tempo real</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span>Experiência de app nativo</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {isInstalled ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  Aplicativo já instalado!
                </span>
              </div>
            ) : (
              <>
                <Button onClick={handleInstallApp} disabled={isInstalling} className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  {isInstalling ? 'Instalando...' : 'Instalar no Celular'}
                </Button>
                <Button variant="outline" onClick={handleInstallApp} disabled={isInstalling} className="gap-2">
                  <Monitor className="h-4 w-4" />
                  Instalar no Computador
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">📱 Android</Badge>
            <Badge variant="secondary" className="text-xs">🍎 iPhone / iPad</Badge>
            <Badge variant="secondary" className="text-xs">💻 Windows / Mac</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="agendamento-online">Agendamento Online</Label>
              <p className="text-sm text-muted-foreground">Permitir que clientes agendem pela internet</p>
            </div>
            <Switch
              id="agendamento-online"
              checked={configuracoes.agendamentoOnline}
              onCheckedChange={(checked) => onSwitchChange("agendamentoOnline", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="pagamento-online">Pagamento Online</Label>
              <p className="text-sm text-muted-foreground">Aceitar pagamentos via cartão ou PIX</p>
            </div>
            <Switch
              id="pagamento-online"
              checked={configuracoes.pagamentoOnline}
              onCheckedChange={(checked) => onSwitchChange("pagamentoOnline", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="relatorios-avancados">Relatórios Avançados</Label>
              <p className="text-sm text-muted-foreground">Gerar relatórios detalhados de performance</p>
            </div>
            <Switch
              id="relatorios-avancados"
              checked={configuracoes.relatoriosAvancados}
              onCheckedChange={(checked) => onSwitchChange("relatoriosAvancados", checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="integracao-whatsapp">Integração WhatsApp</Label>
              <p className="text-sm text-muted-foreground">Conectar com API do WhatsApp Business</p>
            </div>
            <Switch
              id="integracao-whatsapp"
              checked={configuracoes.integracaoWhatsApp}
              onCheckedChange={(checked) => onSwitchChange("integracaoWhatsApp", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
};
