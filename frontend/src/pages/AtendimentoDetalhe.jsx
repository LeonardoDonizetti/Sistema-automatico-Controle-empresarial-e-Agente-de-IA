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

    const [historicoAberto, setHistoricoAberto] = useState(false);

    const [pedidosExpandidos, setPedidosExpandidos] = useState({});

    function alternarPedidoExpandido(pedidoId) {
        setPedidosExpandidos((atual) => ({ ...atual, [pedidoId]: !atual[pedidoId] }));
    }

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
        return <p className="page-message">Carregando...</p>;
    }

    if (erro) {
        return <p className="page-message error-text">{erro}</p>;
    }

    if (!atendimento) {
        return null;
    }

    return (
        <div className="page page-narrow">
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

            <div className="actions-row">
                {TRANSICOES[atendimento.status].map((proximoStatus) => (
                    <button
                        key={proximoStatus}
                        onClick={() => mudarStatus(proximoStatus)}
                        className="btn-spaced"
                    >
                        Mudar para: {proximoStatus}
                    </button>
                ))}
            </div>

            <h3>Mensagens</h3>
            <div className="messages-box">
                {atendimento.mensagens.length === 0 && <p>Nenhuma mensagem ainda.</p>}
                {atendimento.mensagens.map((mensagem) => (
                    <div
                        key={mensagem.id}
                        className={`message-row ${
                            mensagem.remetente === "cliente" ? "message-row--left" : "message-row--right"
                        }`}
                    >
                        <span
                            className={`message-bubble ${
                                mensagem.remetente === "cliente"
                                    ? "message-bubble--cliente"
                                    : "message-bubble--atendente"
                            }`}
                        >
                            {mensagem.conteudo}
                        </span>
                        <div className="message-meta">
                            {mensagem.remetente} — {new Date(mensagem.criadoEm).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={enviarMensagem} className="message-form">
                <input
                    type="text"
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="message-input"
                />
                <button type="submit" disabled={enviando}>
                    Enviar
                </button>
            </form>

            <h3>Pedidos</h3>

            {pedidos.length === 0 && <p>Nenhum pedido para este atendimento.</p>}

            {pedidos.map((pedido) => {
                const ehEntregue = pedido.status === "entregue";
                const expandido = !ehEntregue || Boolean(pedidosExpandidos[pedido.id]);

                return (
                    <div key={pedido.id} className="order-card">
                        {ehEntregue ? (
                            <button
                                type="button"
                                onClick={() => alternarPedidoExpandido(pedido.id)}
                                className="pedido-toggle"
                                aria-expanded={expandido}
                            >
                                <span className={`pedido-seta${expandido ? " pedido-seta--aberta" : ""}`}>
                                    ▶
                                </span>
                                Pedido #{pedido.id} — Entregue — R$ {pedido.valorTotal.toFixed(2)}
                            </button>
                        ) : (
                            <p>
                                <strong>Pedido #{pedido.id}</strong> — status: {pedido.status}
                            </p>
                        )}

                        {expandido && (
                            <>
                                <ul>
                                    {pedido.itens.map((item) => (
                                        <li key={item.id}>
                                            {item.quantidade}x {item.descricao} — R${" "}
                                            {item.precoUnitario.toFixed(2)} (subtotal: R${" "}
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
                                            className="btn-spaced"
                                        >
                                            Mudar para: {proximoStatus}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}

            <button onClick={() => setMostrarFormPedido(!mostrarFormPedido)} className="btn-mb">
                {mostrarFormPedido ? "Cancelar" : "+ Novo pedido"}
            </button>

            {mostrarFormPedido && (
                <form onSubmit={criarPedido} className="order-form">
                    {itensNovoPedido.map((item, index) => (
                        <div key={index} className="order-item-row">
                            <input
                                type="text"
                                placeholder="Descrição"
                                value={item.descricao}
                                onChange={(e) => atualizarItem(index, "descricao", e.target.value)}
                                required
                                className="order-item-desc"
                            />
                            <input
                                type="number"
                                placeholder="Qtd"
                                min="1"
                                value={item.quantidade}
                                onChange={(e) => atualizarItem(index, "quantidade", e.target.value)}
                                required
                                className="flex-1-padded"
                            />
                            <input
                                type="number"
                                placeholder="Preço unitário"
                                min="0.01"
                                step="0.01"
                                value={item.precoUnitario}
                                onChange={(e) => atualizarItem(index, "precoUnitario", e.target.value)}
                                required
                                className="flex-1-padded"
                            />
                            {itensNovoPedido.length > 1 && (
                                <button type="button" onClick={() => removerLinhaItem(index)}>
                                    Remover
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={adicionarLinhaItem} className="btn-mb">
                        + Adicionar item
                    </button>
                    <div>
                        <button type="submit" disabled={salvandoPedido}>
                            Criar pedido
                        </button>
                    </div>
                </form>
            )}

            <button
                type="button"
                onClick={() => setHistoricoAberto((aberto) => !aberto)}
                className="historico-toggle"
                aria-expanded={historicoAberto}
            >
                <span className={`historico-seta${historicoAberto ? " historico-seta--aberta" : ""}`}>
                    ▶
                </span>
                Histórico ({atendimento.historico.length}{" "}
                {atendimento.historico.length === 1 ? "evento" : "eventos"})
            </button>

            {historicoAberto && (
                <ul>
                    {atendimento.historico.map((evento) => (
                        <li key={evento.id} className="history-item">
                            <strong>{new Date(evento.criadoEm).toLocaleString()}</strong> —{" "}
                            {evento.descricao}
                            {evento.usuario && ` (${evento.usuario.nome})`}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}