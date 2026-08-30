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
        return <p className="page-message">Carregando...</p>;
    }

    if (erro) {
        return <p className="page-message error-text">{erro}</p>;
    }

    return (
        <div className="page">
            <h2>Dashboard</h2>

            <div className="card-row">
                <div className="card">
                    <div className="card-value">{metricas.totalAtendimentos}</div>
                    <div>Total de atendimentos</div>
                </div>
                <div className="card">
                    <div className="card-value">{metricas.porStatus.aguardando}</div>
                    <div>Aguardando</div>
                </div>
                <div className="card">
                    <div className="card-value">{metricas.porStatus.em_atendimento}</div>
                    <div>Em atendimento</div>
                </div>
                <div className="card">
                    <div className="card-value">{metricas.porStatus.resolvido}</div>
                    <div>Resolvidos</div>
                </div>
                <div className="card">
                    <div className="card-value">
                        {metricas.tempoMedioAtendimentoMinutos ?? "-"}
                    </div>
                    <div>Tempo médio (min)</div>
                </div>
            </div>

            <div className="stats-row">
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
            </div>
        </div>
    );
}