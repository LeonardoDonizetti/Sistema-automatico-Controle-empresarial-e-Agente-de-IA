import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Dashboard() {
    const [metricas, setMetricas] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        async function carregar() {
            try {
                const resposta = await api.get("/dashboard/metricas");
                setMetricas(resposta);
            } catch (error) {
                setErro(error.message);
            } finally {
                setCarregando(false);
            }
        }

        carregar();
    }, []);

    if (carregando) {
        return <p style={{ padding: 20 }}>Carregando...</p>;
    }

    if (erro) {
        return <p style={{ padding: 20, color: "red" }}>{erro}</p>;
    }

    const cardStyle = {
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        minWidth: 160,
    };

    return (
        <div style={{ fontFamily: "sans-serif", padding: 20 }}>
            <h2>Dashboard</h2>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
                <div style={cardStyle}>
                    <div style={{ fontSize: 28, fontWeight: "bold" }}>{metricas.totalAtendimentos}</div>
                    <div>Total de atendimentos</div>
                </div>
                <div style={cardStyle}>
                    <div style={{ fontSize: 28, fontWeight: "bold" }}>{metricas.porStatus.aguardando}</div>
                    <div>Aguardando</div>
                </div>
                <div style={cardStyle}>
                    <div style={{ fontSize: 28, fontWeight: "bold" }}>{metricas.porStatus.em_atendimento}</div>
                    <div>Em atendimento</div>
                </div>
                <div style={cardStyle}>
                    <div style={{ fontSize: 28, fontWeight: "bold" }}>{metricas.porStatus.resolvido}</div>
                    <div>Resolvidos</div>
                </div>
                <div style={cardStyle}>
                    <div style={{ fontSize: 28, fontWeight: "bold" }}>
                        {metricas.tempoMedioAtendimentoMinutos ?? "-"}
                    </div>
                    <div>Tempo médio (min)</div>
                </div>
            </div>

            <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                <div>
                    <h3>Por funcionário</h3>
                    {metricas.atendimentosPorFuncionario.length === 0 && <p>Sem dados.</p>}
                    <ul>
                        {metricas.atendimentosPorFuncionario.map((item) => (
                            <li key={item.atendenteId}>
                                {item.nome}: {item.total}
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h3>Por setor</h3>
                    {metricas.atendimentosPorSetor.length === 0 && <p>Sem dados.</p>}
                    <ul>
                        {metricas.atendimentosPorSetor.map((item) => (
                            <li key={item.setor}>
                                {item.setor}: {item.total}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}