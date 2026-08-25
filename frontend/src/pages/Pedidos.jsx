import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

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
        <div className="page">
            <h2>Pedidos</h2>

            <div className="filter-row">
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

            {erro && <p className="error-text">{erro}</p>}
            {carregando && <p>Carregando...</p>}

            {!carregando && pedidos.length === 0 && <p>Nenhum pedido encontrado.</p>}

            <table className="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Atendimento</th>
                        <th>Status</th>
                        <th>Itens</th>
                        <th>Valor total</th>
                        <th>Criado em</th>
                    </tr>
                </thead>
                <tbody>
                    {pedidos.map((pedido) => (
                        <tr key={pedido.id}>
                            <td>{pedido.id}</td>
                            <td>
                                <Link to={`/atendimentos/${pedido.atendimentoId}`}>
                                    #{pedido.atendimentoId}
                                </Link>
                            </td>
                            <td>
                                <span className={`status-badge status-${pedido.status}`}>
                                    {pedido.status}
                                </span>
                            </td>
                            <td>{pedido.itens.length}</td>
                            <td>R$ {pedido.valorTotal.toFixed(2)}</td>
                            <td>{new Date(pedido.criadoEm).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
