import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; 
import api from "./services/api"; // ou ajuste o caminho certo

interface Pagamento {
  id: string;
  metodo: string;
  valor: number;
  data: string;
}

const HistoricoPagamentos: React.FC = () => {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [filtroMetodo, setFiltroMetodo] = useState<string>("");

  useEffect(() => {
    const carregarPagamentos = async () => {
      try {
        const resposta = await api.get("/pagamentos"); 
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

      <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
        <SelectTrigger>
          <SelectValue placeholder="Filtrar por método" />
        </SelectTrigger>
        <SelectContent>
          {Array.from(new Set(pagamentos.map((p) => p.metodo)))
            .filter((m) => m && m.trim() !== "")
            .map((metodo) => (
              <SelectItem key={metodo} value={metodo}>
                {metodo}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

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
