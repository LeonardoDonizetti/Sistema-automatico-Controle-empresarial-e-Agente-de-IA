import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import Paginacao from "../components/Paginacao";

export default function Clientes() {
    const navigate = useNavigate();

    const [clientes, setClientes] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

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
            const resposta = await api.get(`/clientes?pagina=${pagina}`);
            setClientes(resposta.clientes);
            setTotalPaginas(resposta.paginacao.totalPaginas);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarClientes();
    }, [pagina]);

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
        try {
            const resposta = await api.post("/atendimentos", { clienteId });
            navigate(`/atendimentos/${resposta.atendimento.id}`);
        } catch (error) {
            alert(error.message);
        }
    }

    return (
        <div className="page">
            <h2>Clientes</h2>

            <button onClick={() => setMostrarFormNovo(!mostrarFormNovo)} className="btn-toggle">
                {mostrarFormNovo ? "Cancelar" : "+ Novo cliente"}
            </button>

            {mostrarFormNovo && (
                <form onSubmit={criarCliente} className="form-inline">
                    <input
                        type="text"
                        placeholder="Nome"
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        required
                        className="form-input"
                    />
                    <input
                        type="text"
                        placeholder="Telefone"
                        value={novoTelefone}
                        onChange={(e) => setNovoTelefone(e.target.value)}
                        required
                        className="form-input"
                    />
                    <button type="submit" disabled={salvandoNovo}>
                        Salvar
                    </button>
                </form>
            )}

            {erro && <p className="error-text">{erro}</p>}
            {carregando && <p>Carregando...</p>}

            <table className="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nome</th>
                        <th>Telefone</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {clientes.map((cliente) => (
                        <tr key={cliente.id}>
                            {editandoId === cliente.id ? (
                                <>
                                    <td>{cliente.id}</td>
                                    <td>
                                        <input
                                            value={edicaoNome}
                                            onChange={(e) => setEdicaoNome(e.target.value)}
                                            className="edit-input"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            value={edicaoTelefone}
                                            onChange={(e) => setEdicaoTelefone(e.target.value)}
                                            className="edit-input"
                                        />
                                    </td>
                                    <td>
                                        <button onClick={() => salvarEdicao(cliente.id)}>Salvar</button>{" "}
                                        <button onClick={cancelarEdicao}>Cancelar</button>
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td>{cliente.id}</td>
                                    <td>{cliente.nome}</td>
                                    <td>{cliente.telefone}</td>
                                    <td>
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

            <Paginacao pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />
        </div>
    );
}