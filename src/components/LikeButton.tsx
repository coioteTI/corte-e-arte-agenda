import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LikeButtonProps {
  companyId: string;
  initialLikesCount: number;
  isLiked?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  showCount?: boolean;
  onLikeChange?: (newLikesCount: number) => void;
}

export const LikeButton = ({ 
  companyId, 
  initialLikesCount, 
  isLiked = false, 
  size = "default",
  variant = "outline",
  showCount = true,
  onLikeChange 
}: LikeButtonProps) => {
  const [liked, setLiked] = useState(isLiked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLike = async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Login necessário",
          description: "Faça login para curtir barbearias.",
          variant: "destructive",
        });
        return;
      }

      if (liked) {
        // Remove like
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('company_id', companyId);

        if (error) throw error;

        // Decrement likes count
        const { error: updateError } = await supabase
          .from('companies')
          .update({ 
            likes_count: Math.max(0, likesCount - 1)
          })
          .eq('id', companyId);

        if (updateError) console.error('Error updating likes:', updateError);

        const newCount = Math.max(0, likesCount - 1);
        setLikesCount(newCount);
        setLiked(false);
        onLikeChange?.(newCount);

        toast({
          title: "Curtida removida",
          description: "Você descurtiu esta barbearia.",
        });
      } else {
        // Add like
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, company_id: companyId });

        if (error) throw error;

        // Increment likes count using the existing function
        await supabase.rpc('increment_likes', { company_id: companyId });

        const newCount = likesCount + 1;
        setLikesCount(newCount);
        setLiked(true);
        onLikeChange?.(newCount);

        toast({
          title: "Barbearia curtida!",
          description: "Você curtiu esta barbearia ❤️",
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Erro",
        description: "Não foi possível curtir a barbearia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLike}
      disabled={loading}
      className={`${liked ? 'text-red-500 border-red-200 bg-red-50 hover:bg-red-100' : ''} transition-all duration-200`}
    >
      <Heart 
        className={`h-4 w-4 ${showCount ? 'mr-2' : ''} ${liked ? 'fill-current' : ''}`} 
      />
      {showCount && (
        <span className={liked ? 'text-red-600' : ''}>
          {likesCount} {likesCount === 1 ? 'curtida' : 'curtidas'}
        </span>
      )}
      {!showCount && (liked ? 'Curtido' : 'Curtir')}
    </Button>
  );
};