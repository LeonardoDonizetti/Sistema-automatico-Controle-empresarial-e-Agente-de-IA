import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

const CORES_STATUS = {
    orcamento: "#6b7280",
    aguardando_aprovacao: "#f59e0b",
    aprovado: "#3b82f6",
    em_producao: "#8b5cf6",
    pronto: "#10b981",
    entregue: "#111827",
};

export default function Pedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("");

    async function carregarPedidos() {
        setCarregando(true);
        setErro("");

        try {
            const query = filtroStatus ? `?status=${filtroStatus}` : "";
            const resposta = await api.get(`/pedidos${query}`);
            setPedidos(resposta.pedidos);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarPedidos();
    }, [filtroStatus]);

    return (
        <div style={{ fontFamily: "sans-serif", padding: 20 }}>
            <h2>Pedidos</h2>

            <div style={{ marginBottom: 16 }}>
                <label>Filtrar por status: </label>
                <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="orcamento">Orçamento</option>
                    <option value="aguardando_aprovacao">Aguardando aprovação</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="em_producao">Em produção</option>
                    <option value="pronto">Pronto</option>
                    <option value="entregue">Entregue</option>
                </select>
            </div>

            {erro && <p style={{ color: "red" }}>{erro}</p>}
            {carregando && <p>Carregando...</p>}

            {!carregando && pedidos.length === 0 && <p>Nenhum pedido encontrado.</p>}

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                        <th style={{ padding: 8 }}>ID</th>
                        <th style={{ padding: 8 }}>Atendimento</th>
                        <th style={{ padding: 8 }}>Status</th>
                        <th style={{ padding: 8 }}>Itens</th>
                        <th style={{ padding: 8 }}>Valor total</th>
                        <th style={{ padding: 8 }}>Criado em</th>
                    </tr>
                </thead>
                <tbody>
                    {pedidos.map((pedido) => (
                        <tr key={pedido.id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: 8 }}>{pedido.id}</td>
                            <td style={{ padding: 8 }}>
                                <Link to={`/atendimentos/${pedido.atendimentoId}`}>
                                    #{pedido.atendimentoId}
                                </Link>
                            </td>
                            <td style={{ padding: 8 }}>
                                <span
                                    style={{
                                        color: "white",
                                        backgroundColor: CORES_STATUS[pedido.status],
                                        padding: "2px 8px",
                                        borderRadius: 4,
                                        fontSize: 12,
                                    }}
                                >
                                    {pedido.status}
                                </span>
                            </td>
                            <td style={{ padding: 8 }}>{pedido.itens.length}</td>
                            <td style={{ padding: 8 }}>R$ {pedido.valorTotal.toFixed(2)}</td>
                            <td style={{ padding: 8 }}>{new Date(pedido.criadoEm).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
