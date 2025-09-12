import React, { useEffect, useState } from "react";
import { Select } from "@/components/ui/select"; // ajuste o caminho conforme sua estrutura
import api from "@/services/api"; // ajuste se você usa axios ou fetch

interface Pagamento {
  id: string;
  metodo: string; // exemplo: "pix", "dinheiro"
  valor: number;
  data: string;
}

const HistoricoPagamentos: React.FC = () => {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [filtroMetodo, setFiltroMetodo] = useState<string>("");

  useEffect(() => {
    const carregarPagamentos = async () => {
      try {
        const resposta = await api.get("/pagamentos"); // ajuste a rota da API
        setPagamentos(resposta.data);
      } catch (erro) {
        console.error("Erro ao carregar pagamentos:", erro);
      }
    };

    carregarPagamentos();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Histórico de Pagamentos</h1>

      {/* Filtro por método de pagamento */}
      <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
        <Select.Trigger>
          <Select.Value placeholder="Filtrar por método" />
        </Select.Trigger>
        <Select.Content>
          {/* Renderiza apenas se tiver valor */}
          {Array.from(new Set(pagamentos.map((p) => p.metodo)))
            .filter((m) => m && m.trim() !== "")
            .map((metodo) => (
              <Select.Item key={metodo} value={metodo}>
                {metodo}
              </Select.Item>
            ))}
        </Select.Content>
      </Select>

      {/* Lista de pagamentos */}
      <ul className="mt-4 space-y-2">
        {pagamentos
          .filter((p) => !filtroMetodo || p.metodo === filtroMetodo)
          .map((p) => (
            <li
              key={p.id}
              className="border p-2 rounded-lg flex justify-between"
            >
              <span>{p.metodo}</span>
              <span>R$ {p.valor.toFixed(2)}</span>
              <span>{new Date(p.data).toLocaleDateString("pt-BR")}</span>
            </li>
          ))}
      </ul>
    </div>
  );
};

export default HistoricoPagamentos;
