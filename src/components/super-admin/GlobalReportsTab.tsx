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
   ShoppingCart, Loader2, BarChart3, PieChart, Crown
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
 
   useEffect(() => {
     loadReports();
   }, [period]);
 
   const loadReports = async () => {
     setLoading(true);
     try {
       const response = await fetch(
         'https://gwyickztdeiplccievyt.supabase.co/functions/v1/super-admin-data',
         {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'x-super-admin-token': sessionToken,
           },
           body: JSON.stringify({ 
             action: 'get_global_reports', 
             params: { months: parseInt(period) } 
           }),
         }
       );
       
       const result = await response.json();
       if (result.success) {
         setData(result.data);
       }
     } catch (error) {
       console.error('Error loading reports:', error);
     } finally {
       setLoading(false);
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
     </div>
   );
 };