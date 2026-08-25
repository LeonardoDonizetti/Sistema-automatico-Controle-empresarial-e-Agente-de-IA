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
        <div className="page">
            <h2>Alertas</h2>

            {erro && <p className="error-text">{erro}</p>}
            {carregando && <p>Carregando...</p>}

            {!carregando && (
                <>
                    <h3>Sem responsável</h3>
                    {alertas.semResponsavel.length === 0 && <p>Nenhum atendimento sem responsável.</p>}
                    {alertas.semResponsavel.length > 0 && (
                        <table className="data-table mb-24">
                            <thead>
                                <tr>
                                    <th>Atendimento</th>
                                    <th>Cliente</th>
                                    <th>Telefone</th>
                                    <th>Minutos na fila</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alertas.semResponsavel.map((alerta) => (
                                    <tr key={alerta.atendimentoId}>
                                        <td>
                                            <Link to={`/atendimentos/${alerta.atendimentoId}`}>
                                                #{alerta.atendimentoId}
                                            </Link>
                                        </td>
                                        <td>{alerta.cliente?.nome}</td>
                                        <td>{alerta.cliente?.telefone}</td>
                                        <td>
                                            <span className="status-badge alert-badge-danger">
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
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Atendimento</th>
                                    <th>Cliente</th>
                                    <th>Atendente</th>
                                    <th>Minutos sem resposta</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alertas.clienteAguardando.map((alerta) => (
                                    <tr key={alerta.atendimentoId}>
                                        <td>
                                            <Link to={`/atendimentos/${alerta.atendimentoId}`}>
                                                #{alerta.atendimentoId}
                                            </Link>
                                        </td>
                                        <td>{alerta.cliente?.nome}</td>
                                        <td>{alerta.atendente?.nome || "-"}</td>
                                        <td>
                                            <span className="status-badge alert-badge-warning">
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
