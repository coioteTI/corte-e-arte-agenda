import { useState, useEffect } from "react";
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
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  // Check if user has liked this company on mount
  useEffect(() => {
    checkUserLike();
  }, [companyId]);

  const checkUserLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: favorite } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .single();
        
        setLiked(!!favorite);
      }
    } catch (error) {
      // No favorite found or error - keep as false
    } finally {
      setInitialized(true);
    }
  };

  const handleLike = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Login necessário",
          description: "Faça login para curtir barbearias.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (liked) {
        // Remove like
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('company_id', companyId);

        if (error) {
          console.error('Error removing like:', error);
          throw error;
        }

        // Decrement likes count manually (since we don't have a decrement function)
        const { error: updateError } = await supabase
          .from('companies')
          .update({ 
            likes_count: Math.max(0, likesCount - 1)
          })
          .eq('id', companyId);

        if (updateError) {
          console.error('Error updating likes count:', updateError);
          // Don't throw error here to avoid reverting UI state
        }

        const newCount = Math.max(0, likesCount - 1);
        setLikesCount(newCount);
        setLiked(false);
        onLikeChange?.(newCount);

        toast({
          title: "Curtida removida",
          description: "Você descurtiu esta barbearia.",
        });
      } else {
        // Check if already liked (to prevent duplicates)
        const { data: existingLike } = await supabase
          .from('favorites')
          .select('id')
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .single();

        if (existingLike) {
          // Already liked, just update UI
          setLiked(true);
          toast({
            title: "Já curtido",
            description: "Você já curtiu esta barbearia!",
          });
          setLoading(false);
          return;
        }

        // Add like
        const { error: insertError } = await supabase
          .from('favorites')
          .insert({ 
            user_id: user.id, 
            company_id: companyId 
          });

        if (insertError) {
          console.error('Error adding like:', insertError);
          throw insertError;
        }

        // Increment likes count using the existing function
        const { error: incrementError } = await supabase.rpc('increment_likes', { company_id: companyId });

        if (incrementError) {
          console.error('Error incrementing likes:', incrementError);
          // Continue anyway as the favorite was added
        }

        const newCount = likesCount + 1;
        setLikesCount(newCount);
        setLiked(true);
        onLikeChange?.(newCount);

        toast({
          title: "Barbearia curtida!",
          description: "Você curtiu esta barbearia ❤️",
        });
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      
      // Handle specific duplicate key error
      if (error.code === '23505' && error.message.includes('favorites_user_id_company_id_key')) {
        // Duplicate like attempt, just update UI to show as liked
        setLiked(true);
        toast({
          title: "Já curtido",
          description: "Você já curtiu esta barbearia!",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível curtir a barbearia. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLike}
      disabled={loading || !initialized}
      className={`${liked ? 'text-red-500 border-red-200 bg-red-50 hover:bg-red-100' : ''} transition-all duration-200 ${loading ? 'opacity-70' : ''}`}
    >
      <Heart 
        className={`h-4 w-4 ${showCount ? 'mr-2' : ''} ${liked ? 'fill-current' : ''} ${loading ? 'animate-pulse' : ''}`} 
      />
      {showCount && (
        <span className={liked ? 'text-red-600' : ''}>
          {loading ? '...' : `${likesCount} ${likesCount === 1 ? 'curtida' : 'curtidas'}`}
        </span>
      )}
      {!showCount && (loading ? '...' : liked ? 'Curtido' : 'Curtir')}
    </Button>
  );
};