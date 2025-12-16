import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Users, ShoppingBag, TrendingUp, Package, Download, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

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
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
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

  // Filter by month
  const filterByMonth = (dateString: string) => {
    const itemDate = new Date(dateString);
    const [year, month] = selectedMonth.split('-').map(Number);
    return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
  };

  // Filter appointments by selected professional and month
  const filteredAppointments = companyData.appointments
    .filter(apt => filterByMonth(apt.appointment_date))
    .filter(apt => selectedProfessional === "all" || apt.professional_id === selectedProfessional);

  // Filter stock sales by month
  const filteredStockSales = companyData.stockSales.filter(sale => filterByMonth(sale.sold_at));

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

  // Generate chart data - daily evolution within selected month
  const getDailyData = () => {
    const dailyData: { [key: string]: { lucro: number; agendamentos: number; date: Date } } = {};
    
    filteredAppointments.forEach(apt => {
      if (apt.status === 'completed' || apt.status === 'confirmed') {
        const date = new Date(apt.appointment_date);
        const dayKey = date.toISOString().split('T')[0];
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = { lucro: 0, agendamentos: 0, date };
        }
        dailyData[dayKey].lucro += apt.total_price || 0;
        dailyData[dayKey].agendamentos += 1;
      }
    });

    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => ({
        dia: new Date(key).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        lucro: data.lucro,
        agendamentos: data.agendamentos
      }));
  };

  const dadosLucro = filteredAppointments.length > 0 ? getDailyData() : [];

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

  // Calculate most requested services based on appointments
  const getServicosPopulares = () => {
    const serviceCounts: { [key: string]: { nome: string; quantidade: number } } = {};
    
    filteredAppointments.forEach(apt => {
      const serviceId = apt.service_id;
      const serviceName = apt.services?.name || 'Não especificado';
      
      if (!serviceCounts[serviceId]) {
        serviceCounts[serviceId] = { nome: serviceName, quantidade: 0 };
      }
      serviceCounts[serviceId].quantidade += 1;
    });

    const totalAppointments = filteredAppointments.length;
    const colors = ['#F0D18A', '#E6C875', '#DCC060', '#D2B84B', '#C8B036', '#BEA821'];

    return Object.values(serviceCounts)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 6)
      .map((service, index) => ({
        nome: service.nome,
        quantidade: service.quantidade,
        percentual: totalAppointments > 0 ? Math.round((service.quantidade / totalAppointments) * 100) : 0,
        valor: colors[index] || '#9CA3AF'
      }));
  };

  const servicosPopulares = getServicosPopulares();

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

  // Generate month options
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  };

  const monthOptions = getMonthOptions();

  // PDF Generation - Complete Report
  const generatePDF = async () => {
    setGeneratingPdf(true);
    toast({
      title: "Gerando PDF...",
      description: "Por favor aguarde enquanto o relatório é gerado.",
    });

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;
      const lineHeight = 7;

      const monthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
      
      // Helper function to add text
      const addText = (text: string, fontSize: number = 10, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.setFontSize(fontSize);
        pdf.setTextColor(color[0], color[1], color[2]);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        pdf.text(text, margin, y);
        y += lineHeight;
      };

      const addLine = () => {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 5;
      };

      // Header
      addText(`RELATÓRIO MENSAL - ${companyData.company?.name || 'Empresa'}`, 16, true);
      addText(`Período: ${monthLabel}`, 12);
      addText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 10);
      y += 5;
      addLine();

      // SEÇÃO 1: VISÃO GERAL
      addText('VISÃO GERAL', 14, true, [59, 130, 246]);
      y += 3;
      
      addText(`Total Faturado: R$ ${totalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 11, true, [34, 197, 94]);
      addText(`Ticket Médio: R$ ${ticketMedio.toFixed(2)}`, 11);
      addText(`Total de Atendimentos: ${totalAtendimentos}`, 11);
      addText(`Clientes Únicos: ${clientesUnicos}`, 11);
      addText(`Total de Agendamentos: ${filteredAppointments.length}`, 11);
      y += 5;
      addLine();

      // SEÇÃO 2: SERVIÇOS MAIS SOLICITADOS
      addText('SERVIÇOS MAIS SOLICITADOS', 14, true, [59, 130, 246]);
      y += 3;
      
      if (servicosPopulares.length > 0) {
        servicosPopulares.forEach((servico, index) => {
          addText(`${index + 1}. ${servico.nome}`, 11, true);
          addText(`   Quantidade: ${servico.quantidade} | Percentual: ${servico.percentual}%`, 10);
        });
      } else {
        addText('Nenhum serviço registrado no período.', 10);
      }
      y += 5;
      addLine();

      // SEÇÃO 3: AGENDAMENTOS DETALHADOS
      addText('AGENDAMENTOS DO MÊS', 14, true, [59, 130, 246]);
      y += 3;

      if (filteredAppointments.length > 0) {
        const sortedAppointments = [...filteredAppointments].sort((a, b) => 
          new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
        );
        
        sortedAppointments.slice(0, 50).forEach((apt, index) => {
          if (y > pageHeight - 30) {
            pdf.addPage();
            y = margin;
            addText('AGENDAMENTOS (continuação)', 14, true, [59, 130, 246]);
            y += 3;
          }
          const date = new Date(apt.appointment_date).toLocaleDateString('pt-BR');
          const serviceName = apt.services?.name || 'Serviço não especificado';
          const clientName = apt.clients?.name || 'Cliente não especificado';
          const professionalName = apt.professionals?.name || 'Profissional não especificado';
          const status = apt.status === 'completed' ? 'Concluído' : apt.status === 'confirmed' ? 'Confirmado' : apt.status;
          const price = apt.total_price ? `R$ ${apt.total_price.toFixed(2)}` : 'N/A';
          
          addText(`${index + 1}. ${date} - ${apt.appointment_time}`, 10, true);
          addText(`   Cliente: ${clientName} | Serviço: ${serviceName}`, 9);
          addText(`   Profissional: ${professionalName} | Valor: ${price} | Status: ${status}`, 9);
          y += 2;
        });
        
        if (filteredAppointments.length > 50) {
          addText(`... e mais ${filteredAppointments.length - 50} agendamentos.`, 10);
        }
      } else {
        addText('Nenhum agendamento no período.', 10);
      }
      y += 5;
      addLine();

      // SEÇÃO 4: VENDAS DE PRODUTOS (ESTOQUE)
      addText('VENDAS DE PRODUTOS', 14, true, [59, 130, 246]);
      y += 3;

      const stockTotal = filteredStockSales.reduce((sum, sale) => sum + (sale.total_price || 0), 0);
      addText(`Total de Vendas de Produtos: R$ ${stockTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 11, true, [34, 197, 94]);
      addText(`Quantidade de Vendas: ${filteredStockSales.length}`, 11);
      y += 3;

      if (filteredStockSales.length > 0) {
        filteredStockSales.slice(0, 30).forEach((sale, index) => {
          if (y > pageHeight - 20) {
            pdf.addPage();
            y = margin;
            addText('VENDAS DE PRODUTOS (continuação)', 14, true, [59, 130, 246]);
            y += 3;
          }
          const date = new Date(sale.sold_at).toLocaleDateString('pt-BR');
          const productName = sale.stock_products?.name || 'Produto';
          addText(`${index + 1}. ${date} - ${productName}`, 10, true);
          addText(`   Cliente: ${sale.client_name} | Qtd: ${sale.quantity} | Total: R$ ${sale.total_price?.toFixed(2)}`, 9);
        });
        
        if (filteredStockSales.length > 30) {
          addText(`... e mais ${filteredStockSales.length - 30} vendas.`, 10);
        }
      } else {
        addText('Nenhuma venda de produtos no período.', 10);
      }
      y += 5;
      addLine();

      // SEÇÃO 5: FATURAMENTO TOTAL
      addText('RESUMO FINANCEIRO', 14, true, [59, 130, 246]);
      y += 3;
      
      const faturamentoServicos = totalFaturado;
      const faturamentoProdutos = stockTotal;
      const faturamentoTotal = faturamentoServicos + faturamentoProdutos;
      
      addText(`Faturamento com Serviços: R$ ${faturamentoServicos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 11);
      addText(`Faturamento com Produtos: R$ ${faturamentoProdutos.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 11);
      addText(`FATURAMENTO TOTAL: R$ ${faturamentoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 12, true, [34, 197, 94]);
      y += 5;
      addLine();

      // SEÇÃO 6: PROFISSIONAIS
      addText('DESEMPENHO DOS PROFISSIONAIS', 14, true, [59, 130, 246]);
      y += 3;

      if (profissionaisPerformance.length > 0) {
        profissionaisPerformance
          .sort((a, b) => b.faturamento - a.faturamento)
          .forEach((prof, index) => {
            if (y > pageHeight - 20) {
              pdf.addPage();
              y = margin;
              addText('PROFISSIONAIS (continuação)', 14, true, [59, 130, 246]);
              y += 3;
            }
            addText(`${index + 1}. ${prof.nome}`, 11, true);
            addText(`   Atendimentos: ${prof.atendimentos} | Clientes: ${prof.clientes} | Faturamento: R$ ${prof.faturamento.toFixed(2)}`, 9);
          });
      } else {
        addText('Nenhum profissional cadastrado.', 10);
      }

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
        pdf.text(`${companyData.company?.name || 'Empresa'}`, margin, pageHeight - 10);
      }

      pdf.save(`relatorio-${monthLabel.toLowerCase().replace(/ /g, '-')}.pdf`);

      toast({
        title: "PDF gerado com sucesso!",
        description: "O download foi iniciado automaticamente.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório em PDF.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Selecionar mês" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os profissionais</SelectItem>
                {companyData.professionals.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={generatePDF}
              disabled={generatingPdf || !temDados}
              className="gap-2"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Baixar PDF
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="bg-background">
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
                        <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
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

              {/* Serviços Mais Solicitados - Full Width */}
              <Card>
                <CardHeader>
                  <CardTitle>Serviços Mais Solicitados</CardTitle>
                </CardHeader>
                <CardContent>
                  {servicosPopulares.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum agendamento registrado ainda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Gráfico de Pizza */}
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
                              label={({ percentual }) => `${percentual}%`}
                            >
                              {servicosPopulares.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.valor} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000' }}
                              formatter={(value: number, name: string, props: any) => [
                                `${value} agendamentos (${props.payload.percentual}%)`,
                                props.payload.nome
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Lista com Percentagens */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm text-muted-foreground mb-4">Detalhes dos Serviços</h4>
                        {servicosPopulares.map((servico, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div 
                              className="w-4 h-4 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: servico.valor }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">{servico.nome}</span>
                                <Badge variant="secondary" className="flex-shrink-0">
                                  {servico.percentual}%
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <div className="w-full bg-muted rounded-full h-2 mr-3">
                                  <div 
                                    className="h-2 rounded-full transition-all duration-500" 
                                    style={{ 
                                      width: `${servico.percentual}%`,
                                      backgroundColor: servico.valor 
                                    }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground flex-shrink-0">
                                  {servico.quantidade} agend.
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumo do Período */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Melhor dia</span>
                      <div className="font-medium mt-1">
                        {dadosLucro.length > 0 
                          ? `${dadosLucro.reduce((max, day) => day.lucro > max.lucro ? day : max).dia}`
                          : 'N/A'}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Total faturado</span>
                      <div className="font-medium text-green-600 mt-1">
                        R$ {totalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Média/atend.</span>
                      <div className="font-medium mt-1">R$ {ticketMedio.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Clientes únicos</span>
                      <div className="font-medium mt-1">{clientesUnicos}</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Agendamentos</span>
                      <div className="font-medium mt-1">{filteredAppointments.length}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
      </div>
    </DashboardLayout>
  );
};

export default Relatorios;
