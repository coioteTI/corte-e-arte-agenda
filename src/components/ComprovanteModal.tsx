import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface ComprovanteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comprovanteUrl: string;
  clientName?: string;
}

export function ComprovanteModal({ open, onOpenChange, comprovanteUrl, clientName }: ComprovanteModalProps) {
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && comprovanteUrl) {
      generateSignedUrl();
    }
  }, [open, comprovanteUrl]);

  const generateSignedUrl = async () => {
    setLoading(true);
    try {
      // Extract the file path from the full URL
      const url = new URL(comprovanteUrl);
      const filePath = url.pathname.split('/object/public/payment-proofs/')[1] || url.pathname.split('/storage/v1/object/public/payment-proofs/')[1];
      
      if (filePath) {
        const { data, error } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

        if (error) {
          console.error('Error generating signed URL:', error);
          setSignedUrl(comprovanteUrl); // Fallback to original URL
        } else {
          setSignedUrl(data.signedUrl);
        }
      } else {
        setSignedUrl(comprovanteUrl);
      }
    } catch (error) {
      console.error('Error processing URL:', error);
      setSignedUrl(comprovanteUrl);
    }
    setLoading(false);
  };

  const displayUrl = signedUrl || comprovanteUrl;
  const isImage = displayUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isPdf = displayUrl.match(/\.pdf$/i);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = displayUrl;
    link.download = `comprovante-${clientName || 'cliente'}.${displayUrl.split('.').pop()}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Comprovante de Pagamento {clientName && `- ${clientName}`}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          <div className="flex-1 overflow-auto max-h-[70vh] bg-muted rounded-lg p-4">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : isImage ? (
              <img 
                src={displayUrl} 
                alt="Comprovante de pagamento" 
                className="w-full h-auto object-contain rounded-lg"
                onError={(e) => {
                  console.error('Erro ao carregar imagem:', e);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : isPdf ? (
              <iframe
                src={displayUrl}
                className="w-full h-[60vh] rounded-lg border-0"
                title="Comprovante PDF"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <p>Formato não suportado para visualização</p>
                <p className="text-sm mt-2">Clique em "Baixar" para abrir o arquivo</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Baixar Comprovante
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}