import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api";

const TRANSICOES = {
    aguardando: ["em_atendimento"],
    em_atendimento: ["resolvido"],
    resolvido: ["fechado", "em_atendimento"],
    fechado: [],
};

const TRANSICOES_PEDIDO = {
    orcamento: ["aguardando_aprovacao"],
    aguardando_aprovacao: ["aprovado", "orcamento"],
    aprovado: ["em_producao"],
    em_producao: ["pronto"],
    pronto: ["entregue"],
    entregue: [],
};

export default function AtendimentoDetalhe() {
    const { id } = useParams();
    const [atendimento, setAtendimento] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [novaMensagem, setNovaMensagem] = useState("");
    const [enviando, setEnviando] = useState(false);

    const [pedidos, setPedidos] = useState([]);
    const [mostrarFormPedido, setMostrarFormPedido] = useState(false);
    const [itensNovoPedido, setItensNovoPedido] = useState([
        { descricao: "", quantidade: 1, precoUnitario: "" },
    ]);
    const [salvandoPedido, setSalvandoPedido] = useState(false);

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

    async function carregarPedidos() {
        try {
            const resposta = await api.get(`/pedidos?atendimentoId=${id}`);
            setPedidos(resposta.pedidos);
        } catch (error) {
            console.error(error.message);
        }
    }

    useEffect(() => {
        carregar();
        carregarPedidos();
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

    function atualizarItem(index, campo, valor) {
        const novosItens = [...itensNovoPedido];
        novosItens[index][campo] = valor;
        setItensNovoPedido(novosItens);
    }

    function adicionarLinhaItem() {
        setItensNovoPedido([...itensNovoPedido, { descricao: "", quantidade: 1, precoUnitario: "" }]);
    }

    function removerLinhaItem(index) {
        setItensNovoPedido(itensNovoPedido.filter((_, i) => i !== index));
    }

    async function criarPedido(evento) {
        evento.preventDefault();
        setSalvandoPedido(true);

        try {
            const itens = itensNovoPedido.map((item) => ({
                descricao: item.descricao,
                quantidade: Number(item.quantidade),
                precoUnitario: Number(item.precoUnitario),
            }));

            await api.post("/pedidos", { atendimentoId: Number(id), itens });

            setItensNovoPedido([{ descricao: "", quantidade: 1, precoUnitario: "" }]);
            setMostrarFormPedido(false);
            carregarPedidos();
        } catch (error) {
            alert(error.message);
        } finally {
            setSalvandoPedido(false);
        }
    }

    async function mudarStatusPedido(pedidoId, novoStatus) {
        try {
            await api.patch(`/pedidos/${pedidoId}`, { status: novoStatus });
            carregarPedidos();
        } catch (error) {
            alert(error.message);
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

            <h3>Pedidos</h3>

            {pedidos.length === 0 && <p>Nenhum pedido para este atendimento.</p>}

            {pedidos.map((pedido) => (
                <div
                    key={pedido.id}
                    style={{
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        padding: 12,
                        marginBottom: 12,
                    }}
                >
                    <p>
                        <strong>Pedido #{pedido.id}</strong> — status: {pedido.status}
                    </p>
                    <ul>
                        {pedido.itens.map((item) => (
                            <li key={item.id}>
                                {item.quantidade}x {item.descricao} — R$ {item.precoUnitario.toFixed(2)} (subtotal: R${" "}
                                {item.subtotal.toFixed(2)})
                            </li>
                        ))}
                    </ul>
                    <p>
                        <strong>Total: R$ {pedido.valorTotal.toFixed(2)}</strong>
                    </p>
                    <div>
                        {TRANSICOES_PEDIDO[pedido.status].map((proximoStatus) => (
                            <button
                                key={proximoStatus}
                                onClick={() => mudarStatusPedido(pedido.id, proximoStatus)}
                                style={{ marginRight: 8 }}
                            >
                                Mudar para: {proximoStatus}
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            <button onClick={() => setMostrarFormPedido(!mostrarFormPedido)} style={{ marginBottom: 12 }}>
                {mostrarFormPedido ? "Cancelar" : "+ Novo pedido"}
            </button>

            {mostrarFormPedido && (
                <form
                    onSubmit={criarPedido}
                    style={{
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        padding: 12,
                        marginBottom: 24,
                    }}
                >
                    {itensNovoPedido.map((item, index) => (
                        <div key={index} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                            <input
                                type="text"
                                placeholder="Descrição"
                                value={item.descricao}
                                onChange={(e) => atualizarItem(index, "descricao", e.target.value)}
                                required
                                style={{ flex: 2, padding: 6 }}
                            />
                            <input
                                type="number"
                                placeholder="Qtd"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) => atualizarItem(index, "quantidade", e.target.value)}
                                required
                                style={{ flex: 1, padding: 6 }}
                            />
                            <input
                                type="number"
                                placeholder="Preço unitário"
                                min="0.01"
                                step="0.01"
                                value={item.precoUnitario}
                                onChange={(e) => atualizarItem(index, "precoUnitario", e.target.value)}
                                required
                                style={{ flex: 1, padding: 6 }}
                            />
                            {itensNovoPedido.length > 1 && (
                                <button type="button" onClick={() => removerLinhaItem(index)}>
                                    Remover
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={adicionarLinhaItem} style={{ marginBottom: 12 }}>
                        + Adicionar item
                    </button>
                    <div>
                        <button type="submit" disabled={salvandoPedido}>
                            Criar pedido
                        </button>
                    </div>
                </form>
            )}

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