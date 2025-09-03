import { useState, useEffect } from 'react';
import { Star, User, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getClientKey } from '@/lib/getClientKey';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  clients: {
    name: string;
    avatar_url?: string;
  };
  professionals?: {
    name: string;
  };
}

interface ReviewSectionProps {
  companyId: string;
  professionalId?: string;
  canReview?: boolean;
  appointmentId?: string;
}

export const ReviewSection = ({ 
  companyId, 
  professionalId, 
  canReview = false,
  appointmentId 
}: ReviewSectionProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      let query = supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          clients:client_id (
            name,
            avatar_url
          ),
          professionals:professional_id (
            name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (professionalId) {
        query = query.eq('professional_id', professionalId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
      toast.error('Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [companyId, professionalId]);

  const submitReview = async () => {
    if (rating === 0) {
      toast.error('Por favor, selecione uma avaliação');
      return;
    }

    setSubmitting(true);
    try {
      const clientKey = await getClientKey();
      const { data: { user } } = await supabase.auth.getUser();
      
      // Buscar ou criar cliente
      let clientData;
      
      if (user) {
        // Usuário logado - buscar cliente pelo user_id
        let { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!existingClient) {
          // Criar cliente para usuário logado
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();

          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              user_id: user.id,
              name: profileData?.full_name || user.email?.split('@')[0] || 'Cliente',
              email: user.email,
              phone: ''
            })
            .select('id')
            .single();

          if (clientError) throw clientError;
          clientData = newClient;
        } else {
          clientData = existingClient;
        }
      } else {
        // Usuário anônimo - buscar cliente pelo phone (usando client_key como phone)
        let { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('phone', clientKey)
          .maybeSingle();

        if (!existingClient) {
          // Criar cliente anônimo
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              name: 'Cliente Anônimo',
              phone: clientKey, // Usar client_key como identificador
              email: null
            })
            .select('id')
            .single();

          if (clientError) throw clientError;
          clientData = newClient;
        } else {
          clientData = existingClient;
        }
      }

      const reviewData = {
        client_id: clientData.id,
        company_id: companyId,
        professional_id: professionalId || null,
        appointment_id: appointmentId || null,
        rating,
        comment: comment.trim() || null,
      };

      console.log('Dados da avaliação:', reviewData);

      const { error } = await supabase
        .from('reviews')
        .insert(reviewData);

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      toast.success('Avaliação enviada com sucesso!');
      setShowReviewForm(false);
      setRating(0);
      setComment('');
      fetchReviews();
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false, size = 'w-4 h-4') => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} cursor-${interactive ? 'pointer' : 'default'} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
            onClick={interactive ? () => setRating(star) : undefined}
          />
        ))}
      </div>
    );
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Avaliações
          {reviews.length > 0 && (
            <Badge variant="secondary">
              {averageRating.toFixed(1)} ⭐ ({reviews.length})
            </Badge>
          )}
        </CardTitle>
        {canReview && (
          <Button
            onClick={() => setShowReviewForm(!showReviewForm)}
            variant="outline"
            size="sm"
          >
            Avaliar Serviço
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showReviewForm && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/10">
            <h4 className="font-medium mb-3">Deixe sua avaliação</h4>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Avaliação:
                </label>
                {renderStars(rating, true, 'w-6 h-6')}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Comentário (opcional):
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Conte como foi sua experiência..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={submitReview}
                  disabled={submitting || rating === 0}
                  size="sm"
                >
                  {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                </Button>
                <Button
                  onClick={() => setShowReviewForm(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Ainda não há avaliações. Seja o primeiro a avaliar!
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.clients?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {review.clients?.name || 'Cliente'}
                      </span>
                      {renderStars(review.rating)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(review.created_at), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    {review.professionals && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Profissional: {review.professionals.name}
                      </p>
                    )}
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};