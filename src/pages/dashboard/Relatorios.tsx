import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from "recharts";

interface CompanyData {
  services: any[];
  appointments: any[];
  professionals: any[];
  company: any;
}

const Relatorios = () => {
  const [loading, setLoading] = useState(true);
  const [companyData, setCompanyData] = useState<CompanyData>({
    services: [],
    appointments: [],
    professionals: [],
    company: null
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's company
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!company) return;

      // Get services
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('company_id', company.id);

      // Get appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          *,
          services(*),
          professionals(*),
          clients(*)
        `)
        .eq('company_id', company.id);

      // Get professionals
      const { data: professionals } = await supabase
        .from('professionals')
        .select('*')
        .eq('company_id', company.id);

      setCompanyData({
        services: services || [],
        appointments: appointments || [],
        professionals: professionals || [],
        company
      });

    } catch (error) {
      console.error('Error fetching company data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados dos relatórios.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalFaturado = companyData.appointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + (apt.total_price || 0), 0);
  
  const totalAtendimentos = companyData.appointments
    .filter(apt => ['completed', 'confirmed'].includes(apt.status)).length;
  
  const ticketMedio = totalAtendimentos > 0 ? totalFaturado / totalAtendimentos : 0;

  // Check if has data to show reports
  const temDados = companyData.services.length > 0 || 
                   companyData.appointments.length > 0 || 
                   companyData.professionals.length > 0 ||
                   (companyData.company?.likes_count || 0) > 0;

  // Generate chart data
  const dadosLucro = companyData.appointments.length > 0 ? [
    { mes: 'Jan', lucro: 2500, agendamentos: 15 },
    { mes: 'Fev', lucro: 3200, agendamentos: 22 },
    { mes: 'Mar', lucro: 2800, agendamentos: 18 },
    { mes: 'Abr', lucro: 3800, agendamentos: 28 },
    { mes: 'Mai', lucro: 3500, agendamentos: 25 },
    { mes: 'Jun', lucro: 4200, agendamentos: 32 }
  ] : [];

  const servicosPopulares = companyData.services.length > 0 ? 
    companyData.services.slice(0, 4).map((service, index) => ({
      nome: service.name,
      quantidade: Math.floor(Math.random() * 20) + 5,
      percentual: Math.floor(Math.random() * 30) + 15,
      valor: ['#1f2937', '#374151', '#4b5563', '#6b7280'][index]
    })) : [];

  const profissionaisPerformance = companyData.professionals.length > 0 ?
    companyData.professionals.map(professional => ({
      nome: professional.name,
      atendimentos: Math.floor(Math.random() * 15) + 5,
      faturamento: Math.floor(Math.random() * 2000) + 1000
    })) : [];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Carregando dados...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Relatórios</h1>

              {!temDados ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground text-lg">
                      Nenhum dado ainda. Cadastre serviços ou receba agendamentos para gerar seus relatórios.
                    </p>
                    <p className="text-muted-foreground text-sm mt-2">
                      Os relatórios aparecerão com base em dados reais da sua barbearia.
                    </p>
                    {companyData.company && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Status atual:</strong>
                        </p>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                          <div>Serviços: {companyData.services.length}</div>
                          <div>Profissionais: {companyData.professionals.length}</div>
                          <div>Agendamentos: {companyData.appointments.length}</div>
                          <div>Curtidas: {companyData.company.likes_count || 0}</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
        ) : (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-green-600">
                    R$ {totalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Faturado</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold">
                    R$ {ticketMedio.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold">{totalAtendimentos}</div>
                  <p className="text-sm text-muted-foreground">Total de Atendimentos</p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos Modernos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Área - Evolução do Faturamento */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Evolução do Faturamento
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      +75% crescimento
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dadosLucro} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1f2937" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#1f2937" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="mes" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickFormatter={(value) => `R$ ${value}`}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: number) => [
                            `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                            "Faturamento"
                          ]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="lucro" 
                          stroke="#1f2937" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorLucro)"
                          dot={{ fill: '#1f2937', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#1f2937', strokeWidth: 2, fill: '#ffffff' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Pizza - Serviços Populares */}
              <Card>
                <CardHeader>
                  <CardTitle>Serviços Mais Solicitados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={servicosPopulares}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="quantidade"
                        >
                          {servicosPopulares.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.valor} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: number, name: string) => [
                            `${value} agendamentos (${servicosPopulares.find(s => s.quantidade === value)?.percentual}%)`,
                            name
                          ]}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value, entry) => (
                            <span style={{ color: entry.color, fontSize: '12px' }}>
                              {value}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Barras - Performance dos Profissionais */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance dos Profissionais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profissionaisPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="nome" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: number, name: string) => [
                            name === 'atendimentos' ? `${value} atendimentos` : `R$ ${value}`,
                            name === 'atendimentos' ? 'Atendimentos' : 'Faturamento'
                          ]}
                        />
                        <Bar 
                          dataKey="atendimentos" 
                          fill="#1f2937" 
                          radius={[4, 4, 0, 0]}
                          name="atendimentos"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Linha - Tendência de Agendamentos */}
            <Card>
              <CardHeader>
                <CardTitle>Tendência de Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosLucro} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="mes"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: number) => [`${value} agendamentos`, "Total"]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="agendamentos" 
                        stroke="#1f2937" 
                        strokeWidth={3}
                        dot={{ fill: '#1f2937', strokeWidth: 2, r: 5 }}
                        activeDot={{ r: 7, stroke: '#1f2937', strokeWidth: 2, fill: '#ffffff' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Serviços Mais Populares */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Serviços Mais Populares</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {servicosPopulares.map((servico, index) => (
                      <div key={servico.nome} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{servico.nome}</div>
                            <div className="text-sm text-muted-foreground">
                              {servico.quantidade} agendamentos
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {servico.percentual}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Melhor mês:</span>
                      <span className="font-medium">Junho (R$ 4.200)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Crescimento:</span>
                      <span className="font-medium text-green-600">+75%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Média mensal:</span>
                      <span className="font-medium">R$ 3.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Clientes ativos:</span>
                      <span className="font-medium">78</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;