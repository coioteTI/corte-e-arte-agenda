import { useState } from 'react';
import { Camera, Upload, User } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  userId: string;
  onAvatarUpdate: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const AvatarUpload = ({ 
  currentAvatarUrl, 
  userId, 
  onAvatarUpdate,
  size = 'md'
}: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-20 w-20',
    lg: 'h-32 w-32'
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você precisa selecionar uma imagem para upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Verificar tamanho do arquivo (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('A imagem deve ter no máximo 2MB');
      }

      // Verificar tipo do arquivo
      if (!file.type.startsWith('image/')) {
        throw new Error('Por favor, selecione apenas arquivos de imagem');
      }

      // Upload da imagem
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Atualizar o cliente com a nova URL do avatar
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (clientData) {
        const { error: updateError } = await supabase
          .from('clients')
          .update({ avatar_url: publicUrl })
          .eq('id', clientData.id);

        if (updateError) throw updateError;
      }

      onAvatarUpdate(publicUrl);
      toast.success('Avatar atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error(error.message || 'Erro ao fazer upload da imagem');
    } finally {
      setUploading(false);
    }
  };

  const generateAvatar = () => {
    // Gerar avatar automático usando uma API gratuita
    const seed = Math.random().toString(36).substring(7);
    const avatarUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${seed}`;
    onAvatarUpdate(avatarUrl);
    toast.success('Avatar gerado automaticamente!');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={currentAvatarUrl} alt="Avatar" />
        <AvatarFallback>
          <User className={size === 'lg' ? 'h-8 w-8' : 'h-4 w-4'} />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById('avatar-upload')?.click()}
        >
          <Camera className="h-4 w-4 mr-2" />
          {uploading ? 'Enviando...' : 'Alterar Foto'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={generateAvatar}
        >
          <Upload className="h-4 w-4 mr-2" />
          Avatar Automático
        </Button>
      </div>

      <input
        id="avatar-upload"
        type="file"
        accept="image/*"
        onChange={uploadAvatar}
        disabled={uploading}
        className="hidden"
      />
    </div>
  );
};