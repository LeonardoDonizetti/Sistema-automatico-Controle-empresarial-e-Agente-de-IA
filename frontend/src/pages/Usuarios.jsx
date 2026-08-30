import { useEffect, useState } from "react";
import { api } from "../services/api";
import CampoSenha from "../components/CampoSenha";
import Paginacao from "../components/Paginacao";

export default function Usuarios() {
    const usuarioLogado = (() => {
        const salvo = localStorage.getItem("usuario");
        return salvo ? JSON.parse(salvo) : null;
    })();

    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    const [mostrarFormNovo, setMostrarFormNovo] = useState(false);
    const [novoNome, setNovoNome] = useState("");
    const [novoEmail, setNovoEmail] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [novoCargo, setNovoCargo] = useState("atendente");
    const [salvandoNovo, setSalvandoNovo] = useState(false);

    const [editandoId, setEditandoId] = useState(null);
    const [edicaoNome, setEdicaoNome] = useState("");
    const [edicaoSenha, setEdicaoSenha] = useState("");
    const [edicaoCargo, setEdicaoCargo] = useState("atendente");
    const [edicaoAtivo, setEdicaoAtivo] = useState(true);

    async function carregarUsuarios() {
        setCarregando(true);
        setErro("");

        try {
            const resposta = await api.get(`/usuarios?pagina=${pagina}`);
            setUsuarios(resposta.usuarios);
            setTotalPaginas(resposta.paginacao.totalPaginas);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarUsuarios();
    }, [pagina]);

    async function criarUsuario(evento) {
        evento.preventDefault();
        setSalvandoNovo(true);

        try {
            await api.post("/usuarios", {
                nome: novoNome,
                email: novoEmail,
                senha: novaSenha,
                cargo: novoCargo,
            });
            setNovoNome("");
            setNovoEmail("");
            setNovaSenha("");
            setNovoCargo("atendente");
            setMostrarFormNovo(false);
            carregarUsuarios();
        } catch (error) {
            alert(error.message);
        } finally {
            setSalvandoNovo(false);
        }
    }

    function iniciarEdicao(usuario) {
        setEditandoId(usuario.id);
        setEdicaoNome(usuario.nome);
        setEdicaoSenha("");
        setEdicaoCargo(usuario.cargo);
        setEdicaoAtivo(usuario.ativo);
    }

    function cancelarEdicao() {
        setEditandoId(null);
    }

    async function salvarEdicao(id) {
        try {
            const dados = {
                nome: edicaoNome,
                cargo: edicaoCargo,
                ativo: edicaoAtivo,
            };

            if (edicaoSenha) {
                dados.senha = edicaoSenha;
            }

            await api.patch(`/usuarios/${id}`, dados);
            setEditandoId(null);
            carregarUsuarios();
        } catch (error) {
            alert(error.message);
        }
    }

    async function inativarUsuario(id) {
        if (!confirm("Inativar este usuário?")) {
            return;
        }

        try {
            await api.delete(`/usuarios/${id}`);
            carregarUsuarios();
        } catch (error) {
            alert(error.message);
        }
    }

    return (
        <div className="page">
            <h2>Usuários</h2>

            <button
                onClick={() => setMostrarFormNovo(!mostrarFormNovo)}
                className={`btn-toggle ${mostrarFormNovo ? "btn-secundario" : "btn-primario"}`}
            >
                {mostrarFormNovo ? "Cancelar" : "+ Novo usuário"}
            </button>

            {mostrarFormNovo && (
                <form onSubmit={criarUsuario} className="form-inline form-inline--wrap">
                    <input
                        type="text"
                        placeholder="Nome"
                        value={novoNome}
                        onChange={(e) => setNovoNome(e.target.value)}
                        required
                        className="form-input"
                    />
                    <input
                        type="email"
                        placeholder="E-mail"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        required
                        className="form-input"
                    />
                    <CampoSenha
                        placeholder="Senha (mín. 12 caracteres)"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        required
                        minLength={12}
                        className="form-input"
                    />
                    <select value={novoCargo} onChange={(e) => setNovoCargo(e.target.value)} className="form-input">
                        <option value="atendente">Atendente</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button type="submit" disabled={salvandoNovo} className="btn-primario">
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
                        <th>E-mail</th>
                        <th>Cargo</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map((usuario) => (
                        <tr key={usuario.id}>
                            {editandoId === usuario.id ? (
                                <>
                                    <td>{usuario.id}</td>
                                    <td>
                                        <input
                                            value={edicaoNome}
                                            onChange={(e) => setEdicaoNome(e.target.value)}
                                            className="edit-input"
                                        />
                                    </td>
                                    <td>{usuario.email}</td>
                                    <td>
                                        <select
                                            value={edicaoCargo}
                                            onChange={(e) => setEdicaoCargo(e.target.value)}
                                            className="edit-input"
                                        >
                                            <option value="atendente">Atendente</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td>
                                        <select
                                            value={edicaoAtivo ? "ativo" : "inativo"}
                                            onChange={(e) => setEdicaoAtivo(e.target.value === "ativo")}
                                            className="edit-input"
                                        >
                                            <option value="ativo">Ativo</option>
                                            <option value="inativo">Inativo</option>
                                        </select>
                                    </td>
                                    <td>
                                        <CampoSenha
                                            placeholder="Nova senha (opcional)"
                                            value={edicaoSenha}
                                            onChange={(e) => setEdicaoSenha(e.target.value)}
                                            minLength={12}
                                            className="edit-input-block"
                                        />
                                        <button onClick={() => salvarEdicao(usuario.id)} className="btn-primario">
                                            Salvar
                                        </button>{" "}
                                        <button onClick={cancelarEdicao} className="btn-secundario">
                                            Cancelar
                                        </button>
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td>{usuario.id}</td>
                                    <td>{usuario.nome}</td>
                                    <td>{usuario.email}</td>
                                    <td>{usuario.cargo}</td>
                                    <td>
                                        <span className={`status-badge status-${usuario.ativo ? "ativo" : "inativo"}`}>
                                            {usuario.ativo ? "ativo" : "inativo"}
                                        </span>
                                    </td>
                                    <td>
                                        <button onClick={() => iniciarEdicao(usuario)} className="btn-secundario">
                                            Editar
                                        </button>{" "}
                                        {usuario.ativo && usuario.id !== usuarioLogado?.id && (
                                            <button onClick={() => inativarUsuario(usuario.id)}>Inativar</button>
                                        )}
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
