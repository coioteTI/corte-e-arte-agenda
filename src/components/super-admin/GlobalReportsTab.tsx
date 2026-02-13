import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  TrendingUp, DollarSign, Building2, Calendar, 
  ShoppingCart, Loader2, BarChart3, PieChart, Crown,
  ArrowUpDown, TrendingDown, Star, Package
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, PieChart as RePieChart, 
  Pie, Cell, Legend, Area, AreaChart
} from 'recharts';

interface GlobalReportsTabProps {
  sessionToken: string;
}

interface ReportData {
  totals: {
    totalRevenue: number;
    totalAppointmentRevenue: number;
    totalStockRevenue: number;
    totalCompanies: number;
    totalAppointments: number;
    totalStockSales: number;
    subscriptionRevenue?: number;
  };
  subscriptionRevenue?: {
    monthly: number;
    annual: number;
    monthlyCount: number;
    annualCount: number;
  };
  planDistribution: Record<string, number>;
  chartData: {
    month: string;
    label: string;
    appointmentRevenue: number;
    stockRevenue: number;
    totalRevenue: number;
    newCompanies: number;
    appointments: number;
  }[];
  topCompanies: {
    id: string;
    name: string;
    revenue: number;
    appointments: number;
    plan?: string;
  }[];
}

interface CompanyFinancials {
  company: { name: string; plan: string; subscription_status: string; subscription_end_date: string } | null;
  totals: {
    serviceRevenue: number;
    salesRevenue: number;
    totalRevenue: number;
    expenses: number;
    profit: number;
  };
  chartData: {
    month: string;
    label: string;
    serviceRevenue: number;
    salesRevenue: number;
    totalRevenue: number;
    expenses: number;
    profit: number;
  }[];
  topService: { name: string; count: number } | null;
  topProduct: { name: string; count: number } | null;
}

interface CompanyListItem {
  id: string;
  name: string;
}

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const getPlanLabel = (plan: string) => {
  switch (plan) {
    case 'premium_mensal': return 'Premium Mensal';
    case 'premium_anual': return 'Premium Anual';
    case 'trial': return 'Trial';
    case 'pro': return 'Pro';
    default: return plan;
  }
};

export const GlobalReportsTab = ({ sessionToken }: GlobalReportsTabProps) => {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('12');
  const [companiesList, setCompaniesList] = useState<CompanyListItem[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companyFinancials, setCompanyFinancials] = useState<CompanyFinancials | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);

  useEffect(() => {
    loadReports();
    loadCompaniesList();
  }, [period]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadCompanyFinancials(selectedCompanyId);
    } else {
      setCompanyFinancials(null);
    }
  }, [selectedCompanyId, period]);

  const fetchData = async (action: string, params?: Record<string, any>) => {
    const response = await fetch(
      'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-data',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': sessionToken,
        },
        body: JSON.stringify({ action, params }),
      }
    );
    return response.json();
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const result = await fetchData('get_global_reports', { months: parseInt(period) });
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompaniesList = async () => {
    try {
      const result = await fetchData('get_companies_list');
      if (result.success) {
        setCompaniesList(result.data || []);
      }
    } catch (error) {
      console.error('Error loading companies list:', error);
    }
  };

  const loadCompanyFinancials = async (companyId: string) => {
    setLoadingCompany(true);
    try {
      const result = await fetchData('get_company_financials', { company_id: companyId, months: parseInt(period) });
      if (result.success) {
        setCompanyFinancials(result.data);
      }
    } catch (error) {
      console.error('Error loading company financials:', error);
    } finally {
      setLoadingCompany(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Erro ao carregar relatórios
        </CardContent>
      </Card>
    );
  }

  const planData = Object.entries(data.planDistribution).map(([name, value]) => ({
    name: getPlanLabel(name),
    value,
  }));

  // Plan growth data for the new section
  const planGrowthData = Object.entries(data.planDistribution).map(([plan, count]) => {
    let pricePerMonth = 0;
    if (plan === 'premium_mensal') pricePerMonth = 79.90;
    else if (plan === 'premium_anual') pricePerMonth = 799.00 / 12;
    return {
      plan: getPlanLabel(plan),
      count,
      monthlyValue: count * pricePerMonth,
    };
  });

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Últimos 3 meses</SelectItem>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(data.totals.totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">Receita Total</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <p className="text-lg font-bold">{formatCurrency(data.totals.totalAppointmentRevenue)}</p>
              <p className="text-xs text-muted-foreground">Agendamentos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
              <p className="text-lg font-bold">{formatCurrency(data.totals.totalStockRevenue)}</p>
              <p className="text-xs text-muted-foreground">Vendas Estoque</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <Building2 className="w-5 h-5 text-orange-600" />
              <p className="text-lg font-bold">{data.totals.totalCompanies}</p>
              <p className="text-xs text-muted-foreground">Empresas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              <p className="text-lg font-bold">{data.totals.totalAppointments.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">Agendamentos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <ShoppingCart className="w-5 h-5 text-pink-600" />
              <p className="text-lg font-bold">{data.totals.totalStockSales.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-muted-foreground">Vendas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Revenue */}
      {data.subscriptionRevenue && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="w-4 h-4 text-purple-600" />
              Receita de Assinaturas
            </CardTitle>
            <CardDescription>Receita recorrente das lojas assinantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Assinantes Mensais</p>
                <p className="text-xl font-bold">{data.subscriptionRevenue.monthlyCount}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(data.subscriptionRevenue.monthly)}/mês</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Assinantes Anuais</p>
                <p className="text-xl font-bold">{data.subscriptionRevenue.annualCount}</p>
                <p className="text-sm text-muted-foreground">{formatCurrency(data.subscriptionRevenue.annual)}/ano</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Receita Recorrente</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(data.subscriptionRevenue.monthly + data.subscriptionRevenue.annual)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Assinantes</p>
                <p className="text-xl font-bold">
                  {data.subscriptionRevenue.monthlyCount + data.subscriptionRevenue.annualCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Growth Section */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Crescimento de Planos
          </CardTitle>
          <CardDescription>Quantidade de empresas por plano e valor mensal gerado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {planGrowthData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <div>
                    <p className="font-medium text-sm">{item.plan}</p>
                    <p className="text-xs text-muted-foreground">{item.count} empresa(s)</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm font-semibold">
                  {item.monthlyValue > 0 ? `${formatCurrency(item.monthlyValue)}/mês` : 'Gratuito'}
                </Badge>
              </div>
            ))}
            <div className="pt-2 border-t flex items-center justify-between">
              <p className="text-sm font-medium">Total de Empresas</p>
              <p className="text-lg font-bold">{data.totals.totalCompanies}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4" />
              Receita Mensal
            </CardTitle>
            <CardDescription>Evolução da receita por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalRevenue" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                    name="Receita Total"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="w-4 h-4" />
              Distribuição de Planos
            </CardTitle>
            <CardDescription>Empresas por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {planData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value} empresas`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4" />
              Crescimento de Empresas
            </CardTitle>
            <CardDescription>Novas empresas por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip 
                    formatter={(value: number) => `${value} empresas`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="newCompanies" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                    name="Novas Empresas"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" />
              Volume de Agendamentos
            </CardTitle>
            <CardDescription>Total de agendamentos por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString('pt-BR')} agendamentos`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="appointments" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    name="Agendamentos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Companies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="w-4 h-4" />
            Top 10 Empresas por Faturamento
          </CardTitle>
          <CardDescription>Empresas com maior receita no período</CardDescription>
        </CardHeader>
        <CardContent>
          {data.topCompanies.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado de faturamento disponível
            </p>
          ) : (
            <div className="space-y-3">
              {data.topCompanies.map((company, index) => (
                <div 
                  key={company.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500 text-yellow-950' :
                      index === 1 ? 'bg-gray-400 text-gray-950' :
                      index === 2 ? 'bg-orange-600 text-orange-950' :
                      'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.appointments} agendamentos pagos
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-base font-semibold">
                    {formatCurrency(company.revenue)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== COMPANY FINANCIAL DETAILS ========== */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowUpDown className="w-4 h-4 text-primary" />
            Financeiro por Empresa
          </CardTitle>
          <CardDescription>Selecione uma empresa para ver entradas, saídas e lucro</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-full mb-4">
              <SelectValue placeholder="Selecione uma empresa..." />
            </SelectTrigger>
            <SelectContent>
              {companiesList.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loadingCompany && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {companyFinancials && !loadingCompany && (
            <div className="space-y-6">
              {/* Company info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Building2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-semibold">{companyFinancials.company?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Plano: {getPlanLabel(companyFinancials.company?.plan || '')} • 
                    Status: {companyFinancials.company?.subscription_status || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Financial summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="bg-green-500/10 border-green-500/20">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Serviços</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(companyFinancials.totals.serviceRevenue)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10 border-blue-500/20">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Vendas</p>
                    <p className="text-sm font-bold text-blue-600">{formatCurrency(companyFinancials.totals.salesRevenue)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-500/10 border-purple-500/20">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Total Entrada</p>
                    <p className="text-sm font-bold text-purple-600">{formatCurrency(companyFinancials.totals.totalRevenue)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/10 border-red-500/20">
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Despesas</p>
                    <p className="text-sm font-bold text-red-600">{formatCurrency(companyFinancials.totals.expenses)}</p>
                  </CardContent>
                </Card>
                <Card className={`${companyFinancials.totals.profit >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <CardContent className="pt-4 pb-3">
                    <p className="text-[10px] text-muted-foreground uppercase">Lucro</p>
                    <p className={`text-sm font-bold ${companyFinancials.totals.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(companyFinancials.totals.profit)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Company chart */}
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={companyFinancials.chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} className="text-muted-foreground" />
                    <Tooltip 
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="serviceRevenue" fill="#10B981" name="Serviços" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="salesRevenue" fill="#3B82F6" name="Vendas" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="expenses" fill="#EF4444" name="Despesas" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top service & product */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyFinancials.topService && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Serviço Mais Solicitado</p>
                      <p className="font-medium text-sm">{companyFinancials.topService.name}</p>
                      <p className="text-xs text-muted-foreground">{companyFinancials.topService.count} agendamentos</p>
                    </div>
                  </div>
                )}
                {companyFinancials.topProduct && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Package className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Produto Mais Vendido</p>
                      <p className="font-medium text-sm">{companyFinancials.topProduct.name}</p>
                      <p className="text-xs text-muted-foreground">{companyFinancials.topProduct.count} unidades</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!selectedCompanyId && !loadingCompany && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Selecione uma empresa acima para ver os dados financeiros detalhados
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
