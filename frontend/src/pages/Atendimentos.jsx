import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

const CORES_STATUS = {
    aguardando: "#f59e0b",
    em_atendimento: "#3b82f6",
    resolvido: "#10b981",
    fechado: "#6b7280",
};

export default function Atendimentos() {
    const [atendimentos, setAtendimentos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [filtroStatus, setFiltroStatus] = useState("");

    async function carregarAtendimentos() {
        setCarregando(true);
        setErro("");

        try {
            const query = filtroStatus ? `?status=${filtroStatus}` : "";
            const resposta = await api.get(`/atendimentos${query}`);
            setAtendimentos(resposta.atendimentos);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarAtendimentos();
    }, [filtroStatus]);

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
        <div style={{ fontFamily: "sans-serif", padding: 20 }}>
            <h2>Central de Atendimentos</h2>

            <div style={{ marginBottom: 16 }}>
                <label>Filtrar por status: </label>
                <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="aguardando">Aguardando</option>
                    <option value="em_atendimento">Em atendimento</option>
                    <option value="resolvido">Resolvido</option>
                    <option value="fechado">Fechado</option>
                </select>
            </div>

            {erro && <p style={{ color: "red" }}>{erro}</p>}
            {carregando && <p>Carregando...</p>}

            {!carregando && atendimentos.length === 0 && <p>Nenhum atendimento encontrado.</p>}

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                        <th style={{ padding: 8 }}>ID</th>
                        <th style={{ padding: 8 }}>Cliente</th>
                        <th style={{ padding: 8 }}>Setor</th>
                        <th style={{ padding: 8 }}>Status</th>
                        <th style={{ padding: 8 }}>Atendente</th>
                        <th style={{ padding: 8 }}>Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {atendimentos.map((atendimento) => (
                        <tr key={atendimento.id} style={{ borderBottom: "1px solid #eee" }}>
                            <td style={{ padding: 8 }}>
                                <Link to={`/atendimentos/${atendimento.id}`}>{atendimento.id}</Link>
                            </td>
                            <td style={{ padding: 8 }}>
                                <Link to={`/atendimentos/${atendimento.id}`}>
                                    {atendimento.cliente?.nome}
                                </Link>
                            </td>
                            <td style={{ padding: 8 }}>{atendimento.setor || "-"}</td>
                            <td style={{ padding: 8 }}>
                                <span
                                    style={{
                                        color: "white",
                                        backgroundColor: CORES_STATUS[atendimento.status],
                                        padding: "2px 8px",
                                        borderRadius: 4,
                                        fontSize: 12,
                                    }}
                                >
                                    {atendimento.status}
                                </span>
                            </td>
                            <td style={{ padding: 8 }}>{atendimento.atendente?.nome || "-"}</td>
                            <td style={{ padding: 8 }}>
                                {!atendimento.atendenteId && (
                                    <button onClick={(e) => assumirAtendimento(atendimento.id, e)}>
                                        Assumir
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}