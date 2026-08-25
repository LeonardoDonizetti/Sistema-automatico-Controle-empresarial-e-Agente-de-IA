import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

export default function Alertas() {
    const [alertas, setAlertas] = useState({ semResponsavel: [], clienteAguardando: [] });
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    async function carregarAlertas() {
        setCarregando(true);
        setErro("");

        try {
            const resposta = await api.get("/alertas");
            setAlertas(resposta.alertas);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarAlertas();
    }, []);

    return (
        <div style={{ fontFamily: "sans-serif", padding: 20 }}>
            <h2>Alertas</h2>

            {erro && <p style={{ color: "red" }}>{erro}</p>}
            {carregando && <p>Carregando...</p>}

            {!carregando && (
                <>
                    <h3>Sem responsável</h3>
                    {alertas.semResponsavel.length === 0 && <p>Nenhum atendimento sem responsável.</p>}
                    {alertas.semResponsavel.length > 0 && (
                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                            <thead>
                                <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                                    <th style={{ padding: 8 }}>Atendimento</th>
                                    <th style={{ padding: 8 }}>Cliente</th>
                                    <th style={{ padding: 8 }}>Telefone</th>
                                    <th style={{ padding: 8 }}>Minutos na fila</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alertas.semResponsavel.map((alerta) => (
                                    <tr key={alerta.atendimentoId} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: 8 }}>
                                            <Link to={`/atendimentos/${alerta.atendimentoId}`}>
                                                #{alerta.atendimentoId}
                                            </Link>
                                        </td>
                                        <td style={{ padding: 8 }}>{alerta.cliente?.nome}</td>
                                        <td style={{ padding: 8 }}>{alerta.cliente?.telefone}</td>
                                        <td style={{ padding: 8 }}>
                                            <span
                                                style={{
                                                    color: "white",
                                                    backgroundColor: "#ef4444",
                                                    padding: "2px 8px",
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                }}
                                            >
                                                {alerta.minutosNaFila} min
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <h3>Cliente aguardando resposta</h3>
                    {alertas.clienteAguardando.length === 0 && <p>Nenhum cliente aguardando resposta.</p>}
                    {alertas.clienteAguardando.length > 0 && (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                                    <th style={{ padding: 8 }}>Atendimento</th>
                                    <th style={{ padding: 8 }}>Cliente</th>
                                    <th style={{ padding: 8 }}>Atendente</th>
                                    <th style={{ padding: 8 }}>Minutos sem resposta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alertas.clienteAguardando.map((alerta) => (
                                    <tr key={alerta.atendimentoId} style={{ borderBottom: "1px solid #eee" }}>
                                        <td style={{ padding: 8 }}>
                                            <Link to={`/atendimentos/${alerta.atendimentoId}`}>
                                                #{alerta.atendimentoId}
                                            </Link>
                                        </td>
                                        <td style={{ padding: 8 }}>{alerta.cliente?.nome}</td>
                                        <td style={{ padding: 8 }}>{alerta.atendente?.nome || "-"}</td>
                                        <td style={{ padding: 8 }}>
                                            <span
                                                style={{
                                                    color: "white",
                                                    backgroundColor: "#f59e0b",
                                                    padding: "2px 8px",
                                                    borderRadius: 4,
                                                    fontSize: 12,
                                                }}
                                            >
                                                {alerta.minutosSemResposta} min
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
        </div>
    );
}
