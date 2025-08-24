import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Bell } from "lucide-react";
import { MensagensAutomaticasConfig, MessageType } from "@/types/configuracoes";

interface MensagensAutomaticasSectionProps {
  mensagensAutomaticas: MensagensAutomaticasConfig;
  onEditMessage: (tipo: string) => void;
}

export const MensagensAutomaticasSection = ({ 
  mensagensAutomaticas, 
  onEditMessage 
}: MensagensAutomaticasSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Mensagens Automáticas Personalizadas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Seção de mensagens automáticas desabilitada.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};