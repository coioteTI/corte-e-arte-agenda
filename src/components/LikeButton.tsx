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
    const ck = await getClientKey();
    setClientKey(ck);

    // total de likes
    const { count: total } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("target_type", targetType)
      .eq("target_id", targetId);

    setCount(total ?? 0);

    // se este cliente já curtiu
    const { data: mine, error } = await supabase
      .from("likes")
      .select("id")
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("client_key", ck)
      .maybeSingle();

    if (!error && mine) setLiked(true);
    else setLiked(false);
  }, [targetType, targetId]);

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates for likes count
    const channel = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'likes',
          filter: `target_type=eq.${targetType}`
        },
        (payload) => {
          // Only update if it's for our target
          const newTargetId = (payload.new as any)?.target_id;
          const oldTargetId = (payload.old as any)?.target_id;
          
          if (newTargetId === targetId || oldTargetId === targetId) {
            // Refetch the count to ensure accuracy
            fetchData();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, targetType, targetId]);

  const toggleLike = async () => {
    if (!clientKey || busy) return;
    setBusy(true);

    // otimista
    if (!liked) {
      setLiked(true);
      setCount((c) => c + 1);

      const { error } = await supabase.from("likes").insert({
        target_type: targetType,
        target_id: targetId,
        client_key: clientKey,
      });

      if (error) {
        // desfaz otimista
        setLiked(false);
        setCount((c) => Math.max(0, c - 1));
        console.error("like error:", error);
      }
    } else {
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));

      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("client_key", clientKey);

      if (error) {
        // desfaz otimista
        setLiked(true);
        setCount((c) => c + 1);
        console.error("unlike error:", error);
      }
    }

    setBusy(false);
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