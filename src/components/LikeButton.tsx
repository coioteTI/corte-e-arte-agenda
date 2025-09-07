import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getClientKey } from "@/lib/getClientKey";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

type Props = {
  targetType: string;               // 'company' | 'service' | 'post'...
  targetId: string;                 // id do alvo
  className?: string;
};

export default function LikeButton({ targetType, targetId, className }: Props) {
  const [count, setCount] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [clientKey, setClientKey] = useState<string>("");

  const fetchData = useCallback(async () => {
    try {
      const ck = await getClientKey();
      setClientKey(ck);

      // total de likes
      const { count: total, error: countError } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("target_type", targetType)
        .eq("target_id", targetId);

      if (countError) {
        console.error("Error fetching likes count:", countError);
        return;
      }

      setCount(total ?? 0);

      // se este cliente já curtiu
      const { data: mine, error } = await supabase
        .from("likes")
        .select("id")
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("client_key", ck)
        .maybeSingle();

      if (error) {
        console.error("Error checking user like:", error);
        setLiked(false);
      } else {
        setLiked(!!mine);
      }
    } catch (error) {
      console.error("Error in fetchData:", error);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates for likes
    const channel = supabase
      .channel(`likes-${targetType}-${targetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'likes',
          filter: `target_type=eq.${targetType}.and.target_id=eq.${targetId}`
        },
        (payload) => {
          console.log('Like realtime update:', payload);
          // Refetch data to ensure accuracy
          fetchData();
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, targetType, targetId]);

  const toggleLike = async () => {
    if (!clientKey || busy) return;
    setBusy(true);

    try {
      if (!liked) {
        // Optimistic update
        setLiked(true);
        setCount((c) => c + 1);

        const { error } = await supabase.from("likes").insert({
          target_type: targetType,
          target_id: targetId,
          client_key: clientKey,
        });

        if (error) {
          console.error("Like error:", error);
          // Rollback optimistic update
          setLiked(false);
          setCount((c) => Math.max(0, c - 1));
        } else {
          console.log("Like added successfully");
        }
      } else {
        // Optimistic update
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));

        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("target_type", targetType)
          .eq("target_id", targetId)
          .eq("client_key", clientKey);

        if (error) {
          console.error("Unlike error:", error);
          // Rollback optimistic update
          setLiked(true);
          setCount((c) => c + 1);
        } else {
          console.log("Like removed successfully");
        }
      }
    } catch (error) {
      console.error("Toggle like error:", error);
      // Refresh data to sync with actual state
      fetchData();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={liked ? "default" : "outline"}
      onClick={toggleLike}
      disabled={busy}
      className={className}
    >
      <Heart className={`h-4 w-4 mr-2 ${liked ? "fill-current" : ""}`} />
      {liked ? "Curtido" : "Curtir"} • {count}
    </Button>
  );
}