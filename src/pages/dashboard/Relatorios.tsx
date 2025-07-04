import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const dadosLucro = [
  { mes: "Jan", lucro: 2400 },
  { mes: "Fev", lucro: 1800 },
  { mes: "Mar", lucro: 3200 },
  { mes: "Abr", lucro: 2800 },
  { mes: "Mai", lucro: 3600 },
  { mes: "Jun", lucro: 4200 },
];

const servicosPopulares = [
  { nome: "Corte + Barba", quantidade: 45, percentual: 35 },
  { nome: "Corte Masculino", quantidade: 38, percentual: 30 },
  { nome: "Barba", quantidade: 28, percentual: 22 },
  { nome: "Corte Feminino", quantidade: 17, percentual: 13 },
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

            {/* Gráfico de Lucro */}
            <Card>
              <CardHeader>
                <CardTitle>Lucro Acumulado por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosLucro}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [
                          `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                          "Lucro"
                        ]}
                      />
                      <Bar dataKey="lucro" fill="#000000" />
                    </BarChart>
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