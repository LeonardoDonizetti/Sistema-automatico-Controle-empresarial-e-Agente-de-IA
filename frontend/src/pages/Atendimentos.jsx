import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { CHAVE_VISTOS_ATENDIMENTOS, marcarComoVistos } from "../utils/notificacoes";
import Paginacao from "../components/Paginacao";

const ABAS_STATUS = [
    { valor: "aguardando,em_atendimento,resolvido", rotulo: "Ativos" },
    { valor: "aguardando", rotulo: "Aguardando" },
    { valor: "em_atendimento", rotulo: "Em atendimento" },
    { valor: "resolvido", rotulo: "Resolvido" },
    { valor: "fechado", rotulo: "Fechado" },
];

export default function Atendimentos() {
    const [atendimentos, setAtendimentos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [filtroStatus, setFiltroStatus] = useState(ABAS_STATUS[0].valor);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    async function carregarAtendimentos() {
        setCarregando(true);
        setErro("");

        try {
            const filtro = filtroStatus ? `&status=${filtroStatus}` : "";
            const resposta = await api.get(`/atendimentos?pagina=${pagina}${filtro}`);
            setAtendimentos(resposta.atendimentos);
            setTotalPaginas(resposta.paginacao.totalPaginas);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarAtendimentos();
    }, [filtroStatus, pagina]);

    // Marca como "visto" tudo que hoje conta pro badge do menu (status
    // "aguardando"), independente da aba/pagina que o usuario esta vendo -
    // assim o contador zera ao entrar nesta tela.
    useEffect(() => {
        async function marcarVistos() {
            try {
                const resposta = await api.get("/atendimentos?status=aguardando&porPagina=100");
                marcarComoVistos(CHAVE_VISTOS_ATENDIMENTOS, resposta.atendimentos.map((a) => a.id));
            } catch {
                // se falhar, so nao zera o badge agora - tenta de novo na proxima visita
            }
        }

        marcarVistos();
    }, []);

    function alterarFiltroStatus(valor) {
        setPagina(1);
        setFiltroStatus(valor);
    }

    async function assumirAtendimento(id, evento) {
        evento.preventDefault();
        evento.stopPropagation();

        try {
            await api.post(`/atendimentos/${id}/assumir`, {});
            carregarAtendimentos();
        } catch (error) {
            alert(error.message);
        }
    }

    return (
        <div className="page">
            <h2>Central de Atendimentos</h2>

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

            {!carregando && atendimentos.length === 0 && <p>Nenhum atendimento encontrado.</p>}

            <table className="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Setor</th>
                        <th>Status</th>
                        <th>Atendente</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {atendimentos.map((atendimento) => (
                        <tr key={atendimento.id}>
                            <td>
                                <Link to={`/atendimentos/${atendimento.id}`}>{atendimento.id}</Link>
                            </td>
                            <td>
                                <Link to={`/atendimentos/${atendimento.id}`}>
                                    {atendimento.cliente?.nome}
                                </Link>
                            </td>
                            <td>{atendimento.setor || "-"}</td>
                            <td>
                                <span className={`status-badge status-${atendimento.status}`}>
                                    {atendimento.status}
                                </span>
                            </td>
                            <td>{atendimento.atendente?.nome || "-"}</td>
                            <td>
                                {!atendimento.atendenteId && (
                                    <button
                                        onClick={(e) => assumirAtendimento(atendimento.id, e)}
                                        className="btn-primario"
                                    >
                                        Assumir
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <Paginacao pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />
        </div>
    );
}