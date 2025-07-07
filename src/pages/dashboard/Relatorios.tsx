import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
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

const dadosLucro = [
  { mes: "Jan", lucro: 2400, agendamentos: 32, crescimento: 12 },
  { mes: "Fev", lucro: 1800, agendamentos: 24, crescimento: -8 },
  { mes: "Mar", lucro: 3200, agendamentos: 42, crescimento: 25 },
  { mes: "Abr", lucro: 2800, agendamentos: 38, crescimento: 15 },
  { mes: "Mai", lucro: 3600, agendamentos: 48, crescimento: 28 },
  { mes: "Jun", lucro: 4200, agendamentos: 56, crescimento: 35 },
];

const servicosPopulares = [
  { nome: "Corte + Barba", quantidade: 45, percentual: 35, valor: "#1f2937" },
  { nome: "Corte Masculino", quantidade: 38, percentual: 30, valor: "#374151" },
  { nome: "Barba", quantidade: 28, percentual: 22, valor: "#4b5563" },
  { nome: "Corte Feminino", quantidade: 17, percentual: 13, valor: "#6b7280" },
];

const profissionaisPerformance = [
  { nome: "Pedro", atendimentos: 48, faturamento: 1680 },
  { nome: "Ana", atendimentos: 42, faturamento: 1470 },
  { nome: "Carlos", atendimentos: 38, faturamento: 1330 },
];

const Relatorios = () => {
  const totalFaturado = dadosLucro.reduce((acc, curr) => acc + curr.lucro, 0);
  const ticketMedio = totalFaturado / 128; // exemplo: 128 atendimentos
  const temDados = dadosLucro.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Relatórios</h1>

        {!temDados ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg">
                Nenhum dado para exibir
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                Os relatórios aparecerão quando houver movimentação
              </p>
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
                  <div className="text-2xl font-bold">128</div>
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