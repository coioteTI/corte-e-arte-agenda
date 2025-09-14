import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload, CheckCircle, XCircle, File } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PaymentProofUploadProps {
  onUploadComplete: (url: string) => void;
  onUploadStart?: () => void;
  appointmentId?: string;
  maxSize?: number; // em MB
  acceptedTypes?: string[];
}

export const PaymentProofUpload = ({
  onUploadComplete,
  onUploadStart,
  appointmentId,
  maxSize = 5,
  acceptedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"]
}: PaymentProofUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Validar tamanho
    if (file.size > maxSize * 1024 * 1024) {
      return `Arquivo muito grande. Máximo permitido: ${maxSize}MB`;
    }

    // Validar tipo
    if (!acceptedTypes.includes(file.type)) {
      return `Tipo de arquivo não permitido. Use: ${acceptedTypes.join(", ")}`;
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setUploadedFile(file);

    // Criar preview para imagens
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl("");
    }
  };

  const uploadFile = async () => {
    if (!uploadedFile) return;

    setUploading(true);
    onUploadStart?.();

    try {
      // Gerar nome único para o arquivo
      const fileExt = uploadedFile.name.split('.').pop();
      const timestamp = new Date().getTime();
      const fileName = `comprovante_${appointmentId || timestamp}.${fileExt}`;
      const filePath = `payment-proofs/${fileName}`;

      console.log("Uploading file:", filePath);

      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from('payment-proofs') // Usando o bucket específico para comprovantes
        .upload(filePath, uploadedFile, {
          cacheControl: '3600',
          upsert: true // Permitir substituição se arquivo já existir
        });

      if (error) {
        console.error("Upload error:", error);
        throw new Error(`Erro no upload: ${error.message}`);
      }

      console.log("Upload success:", data);

      // Obter URL pública
      const { data: publicUrlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(filePath);

      if (!publicUrlData.publicUrl) {
        throw new Error("Não foi possível obter URL pública do arquivo");
      }

      const publicUrl = publicUrlData.publicUrl;
      console.log("Public URL:", publicUrl);

      onUploadComplete(publicUrl);
      toast.success("Comprovante enviado com sucesso!");

    } catch (error) {
      console.error("Erro no upload:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erro desconhecido. Tente novamente.';
      toast.error(`Erro ao enviar comprovante: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="proof-upload" className="text-sm font-medium">
            Comprovante de Pagamento PIX *
          </Label>
          <div className="text-xs text-muted-foreground">
            Envie uma foto ou PDF do seu comprovante de pagamento PIX (máx. {maxSize}MB)
          </div>
        </div>

        {/* Input de arquivo */}
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            id="proof-upload"
            type="file"
            accept={acceptedTypes.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />

          {!uploadedFile ? (
            <Button
              type="button"
              variant="outline"
              className="w-full h-20 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Clique para selecionar o comprovante
                </span>
              </div>
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Preview do arquivo */}
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-background">
                <div className="flex-shrink-0">
                  {uploadedFile.type.startsWith('image/') ? (
                    previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                        <File className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )
                  ) : (
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded flex items-center justify-center">
                      <File className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{uploadedFile.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  disabled={uploading}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  Trocar arquivo
                </Button>
                <Button
                  type="button"
                  onClick={uploadFile}
                  disabled={uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Enviar Comprovante
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Preview expandido para imagens */}
        {previewUrl && uploadedFile?.type.startsWith('image/') && (
          <div className="mt-3">
            <Label className="text-sm font-medium">Preview:</Label>
            <div className="mt-2 p-2 border rounded-lg bg-muted/50">
              <img
                src={previewUrl}
                alt="Preview do comprovante"
                className="max-w-full h-40 object-contain mx-auto rounded"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};