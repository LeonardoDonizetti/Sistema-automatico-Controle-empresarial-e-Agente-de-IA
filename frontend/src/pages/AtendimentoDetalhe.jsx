import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";

const TRANSICOES = {
    aguardando: ["em_atendimento"],
    em_atendimento: ["resolvido"],
    resolvido: ["fechado", "em_atendimento"],
    fechado: [],
};

export default function AtendimentoDetalhe() {
    const { id } = useParams();
    const [atendimento, setAtendimento] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [novaMensagem, setNovaMensagem] = useState("");
    const [enviando, setEnviando] = useState(false);

    async function carregar() {
        setCarregando(true);
        setErro("");

        try {
            const resposta = await api.get(`/atendimentos/${id}`);
            setAtendimento(resposta.atendimento);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, [id]);

    async function mudarStatus(novoStatus) {
        try {
            await api.patch(`/atendimentos/${id}`, { status: novoStatus });
            carregar();
        } catch (error) {
            alert(error.message);
        }
    }

    async function enviarMensagem(evento) {
        evento.preventDefault();

        if (!novaMensagem.trim()) {
            return;
        }

        setEnviando(true);

        try {
            await api.post(`/atendimentos/${id}/mensagens`, {
                remetente: "atendente",
                conteudo: novaMensagem.trim(),
            });
            setNovaMensagem("");
            carregar();
        } catch (error) {
            alert(error.message);
        } finally {
            setEnviando(false);
        }
    }

    if (carregando) {
        return <p style={{ padding: 20 }}>Carregando...</p>;
    }

    if (erro) {
        return <p style={{ padding: 20, color: "red" }}>{erro}</p>;
    }

    if (!atendimento) {
        return null;
    }

    return (
        <div style={{ fontFamily: "sans-serif", padding: 20, maxWidth: 800 }}>
            <Link to="/atendimentos">← Voltar para a lista</Link>

            <h2>Atendimento #{atendimento.id}</h2>

            <p>
                <strong>Cliente:</strong> {atendimento.cliente?.nome} ({atendimento.cliente?.telefone})
            </p>
            <p>
                <strong>Setor:</strong> {atendimento.setor || "-"}
            </p>
            <p>
                <strong>Status:</strong> {atendimento.status}
            </p>
            <p>
                <strong>Atendente:</strong> {atendimento.atendente?.nome || "Sem responsável"}
            </p>

            <div style={{ marginBottom: 20 }}>
                {TRANSICOES[atendimento.status].map((proximoStatus) => (
                    <button
                        key={proximoStatus}
                        onClick={() => mudarStatus(proximoStatus)}
                        style={{ marginRight: 8 }}
                    >
                        Mudar para: {proximoStatus}
                    </button>
                ))}
            </div>

            <h3>Mensagens</h3>
            <div
                style={{
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    padding: 12,
                    maxHeight: 300,
                    overflowY: "auto",
                    marginBottom: 12,
                }}
            >
                {atendimento.mensagens.length === 0 && <p>Nenhuma mensagem ainda.</p>}
                {atendimento.mensagens.map((mensagem) => (
                    <div
                        key={mensagem.id}
                        style={{
                            marginBottom: 8,
                            textAlign: mensagem.remetente === "cliente" ? "left" : "right",
                        }}
                    >
                        <span
                            style={{
                                display: "inline-block",
                                padding: "6px 10px",
                                borderRadius: 8,
                                backgroundColor: mensagem.remetente === "cliente" ? "#f3f4f6" : "#dbeafe",
                            }}
                        >
                            {mensagem.conteudo}
                        </span>
                        <div style={{ fontSize: 11, color: "#888" }}>
                            {mensagem.remetente} — {new Date(mensagem.criadoEm).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={enviarMensagem} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                <input
                    type="text"
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    style={{ flex: 1, padding: 8 }}
                />
                <button type="submit" disabled={enviando}>
                    Enviar
                </button>
            </form>

            <h3>Histórico</h3>
            <ul>
                {atendimento.historico.map((evento) => (
                    <li key={evento.id} style={{ marginBottom: 4 }}>
                        <strong>{new Date(evento.criadoEm).toLocaleString()}</strong> —{" "}
                        {evento.descricao}
                        {evento.usuario && ` (${evento.usuario.nome})`}
                    </li>
                ))}
            </ul>
        </div>
    );
}