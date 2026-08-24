import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

export default function Clientes() {
    const navigate = useNavigate();

    const [clientes, setClientes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    const [mostrarFormNovo, setMostrarFormNovo] = useState(false);
    const [novoNome, setNovoNome] = useState("");
    const [novoTelefone, setNovoTelefone] = useState("");
    const [salvandoNovo, setSalvandoNovo] = useState(false);

    const [editandoId, setEditandoId] = useState(null);
    const [edicaoNome, setEdicaoNome] = useState("");
    const [edicaoTelefone, setEdicaoTelefone] = useState("");

    async function carregarClientes() {
        setCarregando(true);
        setErro("");

        try {
            const resposta = await api.get("/clientes");
            setClientes(resposta.clientes);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarClientes();
    }, []);

    async function criarCliente(evento) {
        evento.preventDefault();
        setSalvandoNovo(true);

        try {
            await api.post("/clientes", { nome: novoNome, telefone: novoTelefone });
            setNovoNome("");
            setNovoTelefone("");
            setMostrarFormNovo(false);
            carregarClientes();
        } catch (error) {
            alert(error.message);
        } finally {
            setSalvandoNovo(false);
        }
    }

    function iniciarEdicao(cliente) {
        setEditandoId(cliente.id);
        setEdicaoNome(cliente.nome);
        setEdicaoTelefone(cliente.telefone);
    }

    function cancelarEdicao() {
        setEditandoId(null);
    }

    async function salvarEdicao(id) {
        try {
            await api.patch(`/clientes/${id}`, { nome: edicaoNome, telefone: edicaoTelefone });
            setEditandoId(null);
            carregarClientes();
        } catch (error) {
            alert(error.message);
        }
    }

    async function criarAtendimentoParaCliente(clienteId) {
        const setor = window.prompt("Setor do atendimento (opcional):", "");

        try {
            const resposta = await api.post("/atendimentos", {
                clienteId,
                ...(setor ? { setor } : {}),
            });
            navigate(`/atendimentos/${resposta.atendimento.id}`);
        } catch (error) {
            alert(error.message);
        }
    }

    return (
        <div style={{ fontFamily: "sans-serif", padding: 20 }}>
            <h2>Clientes</h2>

            <button onClick={() => setMostrarFormNovo(!mostrarFormNovo)} style={{ marginBottom: 16 }}>
                {mostrarFormNovo ? "Cancelar" : "+ Novo cliente"}
            </button>

            {mostrarFormNovo && (
                <form
                    onSubmit={criarCliente}
                    style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 16,
                        padding: 12,
                        border: "1px solid #ddd",
                        borderRadius: 4,
                    }}
                >
                    <input
                        type="text"
                        placeholder="Nome"
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        required
                        style={{ padding: 6 }}
                    />
                    <input
                        type="text"
                        placeholder="Telefone"
                        value={novoTelefone}
                        onChange={(e) => setNovoTelefone(e.target.value)}
                        required
                        style={{ padding: 6 }}
                    />
                    <button type="submit" disabled={salvandoNovo}>
                        Salvar
                    </button>
                </form>
            )}

            {erro && <p style={{ color: "red" }}>{erro}</p>}
            {carregando && <p>Carregando...</p>}

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ textAlign: "left", borderBottom: "2px solid #ddd" }}>
                        <th style={{ padding: 8 }}>ID</th>
                        <th style={{ padding: 8 }}>Nome</th>
                        <th style={{ padding: 8 }}>Telefone</th>
                        <th style={{ padding: 8 }}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {clientes.map((cliente) => (
                        <tr key={cliente.id} style={{ borderBottom: "1px solid #eee" }}>
                            {editandoId === cliente.id ? (
                                <>
                                    <td style={{ padding: 8 }}>{cliente.id}</td>
                                    <td style={{ padding: 8 }}>
                                        <input
                                            value={edicaoNome}
                                            onChange={(e) => setEdicaoNome(e.target.value)}
                                            style={{ padding: 4 }}
                                        />
                                    </td>
                                    <td style={{ padding: 8 }}>
                                        <input
                                            value={edicaoTelefone}
                                            onChange={(e) => setEdicaoTelefone(e.target.value)}
                                            style={{ padding: 4 }}
                                        />
                                    </td>
                                    <td style={{ padding: 8 }}>
                                        <button onClick={() => salvarEdicao(cliente.id)}>Salvar</button>{" "}
                                        <button onClick={cancelarEdicao}>Cancelar</button>
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td style={{ padding: 8 }}>{cliente.id}</td>
                                    <td style={{ padding: 8 }}>{cliente.nome}</td>
                                    <td style={{ padding: 8 }}>{cliente.telefone}</td>
                                    <td style={{ padding: 8 }}>
                                        <button onClick={() => iniciarEdicao(cliente)}>Editar</button>{" "}
                                        <button onClick={() => criarAtendimentoParaCliente(cliente.id)}>
                                            Novo atendimento
                                        </button>
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}