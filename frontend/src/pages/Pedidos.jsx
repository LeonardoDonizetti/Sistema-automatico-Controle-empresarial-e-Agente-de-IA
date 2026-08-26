import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import Paginacao from "../components/Paginacao";

const ABAS_STATUS = [
    { valor: "orcamento,aguardando_aprovacao,aprovado,em_producao,pronto", rotulo: "Em andamento" },
    { valor: "orcamento", rotulo: "Orçamento" },
    { valor: "aguardando_aprovacao", rotulo: "Aguardando aprovação" },
    { valor: "aprovado", rotulo: "Aprovado" },
    { valor: "em_producao", rotulo: "Em produção" },
    { valor: "pronto", rotulo: "Pronto" },
    { valor: "entregue", rotulo: "Entregue" },
];

export default function Pedidos() {
    const [pedidos, setPedidos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [filtroStatus, setFiltroStatus] = useState(ABAS_STATUS[0].valor);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    async function carregarPedidos() {
        setCarregando(true);
        setErro("");

        try {
            const filtro = filtroStatus ? `&status=${filtroStatus}` : "";
            const resposta = await api.get(`/pedidos?pagina=${pagina}${filtro}`);
            setPedidos(resposta.pedidos);
            setTotalPaginas(resposta.paginacao.totalPaginas);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarPedidos();
    }, [filtroStatus, pagina]);

    function alterarFiltroStatus(valor) {
        setPagina(1);
        setFiltroStatus(valor);
    }

    return (
        <div className="page">
            <h2>Pedidos</h2>

            <div className="tabs-row">
                {ABAS_STATUS.map((aba) => (
                    <button
                        key={aba.valor}
                        type="button"
                        onClick={() => alterarFiltroStatus(aba.valor)}
                        className={aba.valor === filtroStatus ? "tab-button--ativa" : undefined}
                    >
                        {aba.rotulo}
                    </button>
                ))}
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

            <Paginacao pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />
        </div>
    );
}
