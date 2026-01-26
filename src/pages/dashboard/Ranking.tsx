import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RankingData {
  id: string;
  name: string;
  likes_count: number;
  ranking: number;
}

const Ranking = () => {
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [currentCompanyRanking, setCurrentCompanyRanking] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      // Get current company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const company = Array.isArray(companies) ? companies[0] : companies;
      if (!company) return;

      // Get rankings by likes
      const { data: rankingsData, error } = await supabase
        .rpc('get_company_rankings');

      if (error) throw error;

      setRankings(rankingsData || []);
      
      // Find current company ranking
      const currentRanking = rankingsData?.find(r => r.id === company.id);
      setCurrentCompanyRanking(currentRanking || null);

    } catch (error) {
      console.error('Error fetching rankings:', error);
      toast({
        title: "Erro ao carregar ranking",
        description: "Não foi possível carregar os dados do ranking.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankingIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <TrendingUp className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankingBadgeVariant = (position: number) => {
    switch (position) {
      case 1:
        return "default";
      case 2:
        return "secondary";
      case 3:
        return "outline";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Ranking de Curtidas</h1>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const top3 = rankings.slice(0, 3);
  const hasData = rankings.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Ranking de Curtidas</h1>
          <Badge variant="outline" className="flex items-center gap-1">
            ❤ Baseado em Curtidas
          </Badge>
        </div>

        {/* No data message */}
        {!hasData && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg">
                Nenhum dado de ranking ainda.
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                O ranking aparecerá quando houver curtidas de clientes.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Current Company Position */}
        {currentCompanyRanking && hasData && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Sua Posição</h3>
                  <p className="text-muted-foreground">
                    Você está em <span className="font-semibold text-primary">
                      {currentCompanyRanking.ranking}º lugar
                    </span> no ranking de curtidas com{" "}
                    <span className="font-semibold">
                      {currentCompanyRanking.likes_count} curtidas
                    </span>.
                  </p>
                </div>
                <div className="flex items-center">
                  {getRankingIcon(Number(currentCompanyRanking.ranking))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 3 Companies */}
        {hasData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Top 3 Empresas Mais Curtidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {top3.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getRankingIcon(Number(company.ranking))}
                        <Badge variant={getRankingBadgeVariant(Number(company.ranking))}>
                          {company.ranking}º
                        </Badge>
                      </div>
                      <div>
                        <h4 className="font-medium">💈 {company.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ❤ {company.likes_count} curtidas
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Rankings */}
        {rankings.length > 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Ranking Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rankings.slice(3).map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-3 text-sm border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="w-8 justify-center">
                        {company.ranking}º
                      </Badge>
                      <span className="font-medium">💈 {company.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      ❤ {company.likes_count} curtidas
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Ranking;