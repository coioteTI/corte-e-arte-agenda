import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Users, ShoppingBag, TrendingUp, Package } from "lucide-react";

interface CompanyData {
  services: any[];
  appointments: any[];
  professionals: any[];
  company: any;
  stockSales: any[];
  stockProducts: any[];
}

const Relatorios = () => {
  const [loading, setLoading] = useState(true);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [companyData, setCompanyData] = useState<CompanyData>({
    services: [],
    appointments: [],
    professionals: [],
    company: null,
    stockSales: [],
    stockProducts: []
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!company) return;

      const [servicesRes, appointmentsRes, professionalsRes, stockSalesRes, stockProductsRes] = await Promise.all([
        supabase.from('services').select('*').eq('company_id', company.id),
        supabase.from('appointments').select(`*, services(*), professionals(*), clients(*)`).eq('company_id', company.id),
        supabase.from('professionals').select('*').eq('company_id', company.id),
        supabase.from('stock_sales').select(`*, stock_products(*)`).eq('company_id', company.id),
        supabase.from('stock_products').select('*').eq('company_id', company.id)
      ]);

      setCompanyData({
        services: servicesRes.data || [],
        appointments: appointmentsRes.data || [],
        professionals: professionalsRes.data || [],
        company,
        stockSales: stockSalesRes.data || [],
        stockProducts: stockProductsRes.data || []
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

  // Filter appointments by selected professional
  const filteredAppointments = selectedProfessional === "all" 
    ? companyData.appointments 
    : companyData.appointments.filter(apt => apt.professional_id === selectedProfessional);

  // Calculate metrics based on filtered data
  const totalFaturado = filteredAppointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + (apt.total_price || 0), 0);
  
  const totalAtendimentos = filteredAppointments
    .filter(apt => ['completed', 'confirmed'].includes(apt.status)).length;
  
  const ticketMedio = totalAtendimentos > 0 ? totalFaturado / totalAtendimentos : 0;

  const clientesUnicos = new Set(filteredAppointments.map(apt => apt.client_id)).size;

  // Check if has data to show reports
  const temDados = companyData.services.length > 0 || 
                   companyData.appointments.length > 0 || 
                   companyData.professionals.length > 0 ||
                   companyData.stockSales.length > 0 ||
                   (companyData.company?.likes_count || 0) > 0;

  // Generate chart data from filtered appointments
  const getMonthlyData = () => {
    const monthlyData: { [key: string]: { lucro: number; agendamentos: number } } = {};
    
    filteredAppointments.forEach(apt => {
      if (apt.status === 'completed' || apt.status === 'confirmed') {
        const month = new Date(apt.created_at).toLocaleDateString('pt-BR', { month: 'short' });
        if (!monthlyData[month]) {
          monthlyData[month] = { lucro: 0, agendamentos: 0 };
        }
        monthlyData[month].lucro += apt.total_price || 0;
        monthlyData[month].agendamentos += 1;
      }
    });

    return Object.entries(monthlyData).map(([mes, data]) => ({
      mes,
      ...data
    }));
  };

  const dadosLucro = filteredAppointments.length > 0 ? getMonthlyData() : [];

  // Professional performance data
  const getProfessionalDetails = (professionalId: string) => {
    const profAppointments = companyData.appointments.filter(apt => 
      apt.professional_id === professionalId && (apt.status === 'completed' || apt.status === 'confirmed')
    );
    
    const servicesCount: { [key: string]: number } = {};
    profAppointments.forEach(apt => {
      const serviceName = apt.services?.name || 'Não especificado';
      servicesCount[serviceName] = (servicesCount[serviceName] || 0) + 1;
    });

    return {
      totalAtendimentos: profAppointments.length,
      totalFaturamento: profAppointments.reduce((sum, apt) => sum + (apt.total_price || 0), 0),
      clientesUnicos: new Set(profAppointments.map(apt => apt.client_id)).size,
      servicosRealizados: Object.entries(servicesCount).map(([nome, quantidade]) => ({ nome, quantidade }))
    };
  };

  const profissionaisPerformance = companyData.professionals.map(professional => {
    const details = getProfessionalDetails(professional.id);
    return {
      id: professional.id,
      nome: professional.name,
      atendimentos: details.totalAtendimentos,
      faturamento: details.totalFaturamento,
      clientes: details.clientesUnicos
    };
  });

  // Stock sales data
  const getStockSalesData = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const monthlySales = companyData.stockSales.filter(sale => 
      new Date(sale.sold_at) >= startOfMonth
    );

    const weeklySales = companyData.stockSales.filter(sale => 
      new Date(sale.sold_at) >= startOfWeek
    );

    const monthlyTotal = monthlySales.reduce((sum, sale) => sum + (sale.total_price || 0), 0);
    const weeklyTotal = weeklySales.reduce((sum, sale) => sum + (sale.total_price || 0), 0);

    // Daily sales for chart
    const dailySales: { [key: string]: { vendas: number; valor: number } } = {};
    companyData.stockSales.forEach(sale => {
      const day = new Date(sale.sold_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      if (!dailySales[day]) {
        dailySales[day] = { vendas: 0, valor: 0 };
      }
      dailySales[day].vendas += sale.quantity || 1;
      dailySales[day].valor += sale.total_price || 0;
    });

    return {
      monthlyCount: monthlySales.length,
      weeklyCount: weeklySales.length,
      monthlyTotal,
      weeklyTotal,
      chartData: Object.entries(dailySales).slice(-14).map(([dia, data]) => ({ dia, ...data }))
    };
  };

  const stockSalesData = getStockSalesData();

  // Most popular products
  const getPopularProducts = () => {
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    companyData.stockSales.forEach(sale => {
      const productId = sale.product_id;
      const productName = sale.stock_products?.name || 'Produto não encontrado';
      
      if (!productSales[productId]) {
        productSales[productId] = { name: productName, quantity: 0, revenue: 0 };
      }
      productSales[productId].quantity += sale.quantity || 1;
      productSales[productId].revenue += sale.total_price || 0;
    });

    return Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  };

  const popularProducts = getPopularProducts();

  const servicosPopulares = companyData.services.slice(0, 4).map((service, index) => {
    const serviceAppointments = filteredAppointments.filter(apt => apt.service_id === service.id);
    return {
      nome: service.name,
      quantidade: serviceAppointments.length,
      percentual: filteredAppointments.length > 0 ? Math.round((serviceAppointments.length / filteredAppointments.length) * 100) : 0,
      valor: ['#F0D18A', '#E6C875', '#DCC060', '#D2B84B'][index]
    };
  });

  const calculateGrowthPercentage = () => {
    if (dadosLucro.length < 2) return 0;
    const sortedData = [...dadosLucro];
    const firstMonth = sortedData[0]?.lucro || 0;
    const lastMonth = sortedData[sortedData.length - 1]?.lucro || 0;
    if (firstMonth === 0) return 0;
    return ((lastMonth - firstMonth) / firstMonth * 100);
  };

  const growthPercentage = calculateGrowthPercentage();

  // Get selected professional details
  const selectedProfessionalData = selectedProfessional !== "all" 
    ? getProfessionalDetails(selectedProfessional)
    : null;

  const selectedProfessionalInfo = selectedProfessional !== "all"
    ? companyData.professionals.find(p => p.id === selectedProfessional)
    : null;

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          
          {companyData.professionals.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtrar por profissional:</span>
              <Select 
                value={selectedProfessional} 
                onValueChange={(value) => {
                  console.log("Profissional selecionado:", value);
                  setSelectedProfessional(value);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os profissionais" />
                </SelectTrigger>
                <SelectContent className="z-[9999]" position="popper" sideOffset={4}>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {companyData.professionals.map(prof => (
                    <SelectItem key={prof.id} value={prof.id}>{prof.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {!temDados ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg">
                Nenhum dado ainda. Cadastre serviços ou receba agendamentos para gerar seus relatórios.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="geral" className="space-y-6">
            <TabsList>
              <TabsTrigger value="geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
            </TabsList>

            {/* Aba Visão Geral */}
            <TabsContent value="geral" className="space-y-6">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          R$ {totalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Faturado</p>
                      </div>
                    </div>
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

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{clientesUnicos}</div>
                        <p className="text-sm text-muted-foreground">Clientes Únicos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Selected Professional Details */}
              {selectedProfessionalData && selectedProfessionalInfo && (
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Detalhes de {selectedProfessionalInfo.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{selectedProfessionalData.totalAtendimentos}</div>
                        <p className="text-sm text-muted-foreground">Serviços Realizados</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          R$ {selectedProfessionalData.totalFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-sm text-muted-foreground">Faturamento Total</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{selectedProfessionalData.clientesUnicos}</div>
                        <p className="text-sm text-muted-foreground">Clientes Atendidos</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          R$ {selectedProfessionalData.totalAtendimentos > 0 
                            ? (selectedProfessionalData.totalFaturamento / selectedProfessionalData.totalAtendimentos).toFixed(2)
                            : '0.00'}
                        </div>
                        <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      </div>
                    </div>
                    
                    {selectedProfessionalData.servicosRealizados.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Serviços Mais Realizados</h4>
                        <div className="space-y-2">
                          {selectedProfessionalData.servicosRealizados
                            .sort((a, b) => b.quantidade - a.quantidade)
                            .slice(0, 5)
                            .map((servico, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <span>{servico.nome}</span>
                              <Badge variant="secondary">{servico.quantidade}x</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Gráfico de Área - Evolução do Faturamento */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Evolução do Faturamento
                    <Badge variant="secondary" className={growthPercentage >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {growthPercentage >= 0 ? '+' : ''}{growthPercentage.toFixed(1)}% {dadosLucro.length < 2 ? '(dados insuficientes)' : 'crescimento'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dadosLucro} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F0D18A" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#F0D18A" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => `R$ ${value}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000' }}
                          formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Faturamento"]}
                        />
                        <Area type="monotone" dataKey="lucro" stroke="#F0D18A" strokeWidth={3} fillOpacity={1} fill="url(#colorLucro)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gráficos de Serviços e Resumo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Serviços Mais Solicitados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={servicosPopulares} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="quantidade">
                            {servicosPopulares.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.valor} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000' }} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
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
                        <span className="font-medium">
                          {dadosLucro.length > 0 
                            ? `${dadosLucro.reduce((max, month) => month.lucro > max.lucro ? month : max).mes}`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total faturado:</span>
                        <span className="font-medium text-green-600">
                          R$ {totalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Média por atendimento:</span>
                        <span className="font-medium">R$ {ticketMedio.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clientes únicos:</span>
                        <span className="font-medium">{clientesUnicos}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total de agendamentos:</span>
                        <span className="font-medium">{filteredAppointments.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Profissionais */}
            <TabsContent value="profissionais" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance dos Profissionais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profissionaisPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000' }}
                          formatter={(value: number, name: string) => [
                            name === 'atendimentos' ? `${value} atendimentos` : name === 'clientes' ? `${value} clientes` : `R$ ${value}`,
                            name === 'atendimentos' ? 'Atendimentos' : name === 'clientes' ? 'Clientes' : 'Faturamento'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="atendimentos" fill="#F0D18A" radius={[4, 4, 0, 0]} name="Atendimentos" />
                        <Bar dataKey="clientes" fill="#82ca9d" radius={[4, 4, 0, 0]} name="Clientes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Ranking de Profissionais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ranking por Atendimentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {profissionaisPerformance
                        .sort((a, b) => b.atendimentos - a.atendimentos)
                        .map((prof, index) => (
                        <div key={prof.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500 text-white' : 
                              index === 1 ? 'bg-gray-400 text-white' : 
                              index === 2 ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-medium">{prof.nome}</span>
                          </div>
                          <Badge>{prof.atendimentos} atendimentos</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ranking por Faturamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {profissionaisPerformance
                        .sort((a, b) => b.faturamento - a.faturamento)
                        .map((prof, index) => (
                        <div key={prof.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500 text-white' : 
                              index === 1 ? 'bg-gray-400 text-white' : 
                              index === 2 ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="font-medium">{prof.nome}</span>
                          </div>
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            R$ {prof.faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Aba Estoque */}
            <TabsContent value="estoque" className="space-y-6">
              {/* Cards de Resumo do Estoque */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <ShoppingBag className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stockSalesData.monthlyCount}</div>
                        <p className="text-sm text-muted-foreground">Vendas no Mês</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stockSalesData.weeklyCount}</div>
                        <p className="text-sm text-muted-foreground">Vendas na Semana</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-green-600">
                      R$ {stockSalesData.monthlyTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-sm text-muted-foreground">Faturamento Mensal</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-blue-600">
                      R$ {stockSalesData.weeklyTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-sm text-muted-foreground">Faturamento Semanal</p>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfico de Vendas do Estoque */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendas de Estoque (Últimos 14 dias)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {stockSalesData.chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stockSalesData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000' }}
                            formatter={(value: number, name: string) => [
                              name === 'vendas' ? `${value} unidades` : `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                              name === 'vendas' ? 'Quantidade' : 'Valor'
                            ]}
                          />
                          <Legend />
                          <Bar dataKey="vendas" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Quantidade" />
                          <Bar dataKey="valor" fill="#22c55e" radius={[4, 4, 0, 0]} name="Valor (R$)" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Nenhuma venda de estoque registrada ainda
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Produtos Mais Populares */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produtos Mais Populares
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {popularProducts.length > 0 ? (
                    <div className="space-y-4">
                      {popularProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-500 text-white' : 
                              index === 1 ? 'bg-gray-400 text-white' : 
                              index === 2 ? 'bg-amber-600 text-white' : 'bg-muted-foreground/20 text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {product.quantity} unidades vendidas
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              R$ {product.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum produto vendido ainda</p>
                      <p className="text-sm">As vendas aparecerão aqui conforme forem registradas</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;
