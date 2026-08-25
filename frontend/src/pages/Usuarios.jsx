import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Usuarios() {
    const usuarioLogado = (() => {
        const salvo = localStorage.getItem("usuario");
        return salvo ? JSON.parse(salvo) : null;
    })();

    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

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
            const resposta = await api.get("/usuarios");
            setUsuarios(resposta.usuarios);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarUsuarios();
    }, []);

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
        <div style={{ fontFamily: "sans-serif", padding: 20 }}>
            <h2>Usuários</h2>

            <button onClick={() => setMostrarFormNovo(!mostrarFormNovo)} style={{ marginBottom: 16 }}>
                {mostrarFormNovo ? "Cancelar" : "+ Novo usuário"}
            </button>

            {mostrarFormNovo && (
                <form
                    onSubmit={criarUsuario}
                    style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 16,
                        padding: 12,
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        flexWrap: "wrap",
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
                        type="email"
                        placeholder="E-mail"
                        value={novoEmail}
                        onChange={(e) => setNovoEmail(e.target.value)}
                        required
                        style={{ padding: 6 }}
                    />
                    <input
                        type="password"
                        placeholder="Senha (mín. 12 caracteres)"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        required
                        minLength={12}
                        style={{ padding: 6 }}
                    />
                    <select value={novoCargo} onChange={(e) => setNovoCargo(e.target.value)} style={{ padding: 6 }}>
                        <option value="atendente">Atendente</option>
                        <option value="admin">Admin</option>
                    </select>
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
                        <th style={{ padding: 8 }}>E-mail</th>
                        <th style={{ padding: 8 }}>Cargo</th>
                        <th style={{ padding: 8 }}>Status</th>
                        <th style={{ padding: 8 }}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map((usuario) => (
                        <tr key={usuario.id} style={{ borderBottom: "1px solid #eee" }}>
                            {editandoId === usuario.id ? (
                                <>
                                    <td style={{ padding: 8 }}>{usuario.id}</td>
                                    <td style={{ padding: 8 }}>
                                        <input
                                            value={edicaoNome}
                                            onChange={(e) => setEdicaoNome(e.target.value)}
                                            style={{ padding: 4 }}
                                        />
                                    </td>
                                    <td style={{ padding: 8 }}>{usuario.email}</td>
                                    <td style={{ padding: 8 }}>
                                        <select
                                            value={edicaoCargo}
                                            onChange={(e) => setEdicaoCargo(e.target.value)}
                                            style={{ padding: 4 }}
                                        >
                                            <option value="atendente">Atendente</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: 8 }}>
                                        <select
                                            value={edicaoAtivo ? "ativo" : "inativo"}
                                            onChange={(e) => setEdicaoAtivo(e.target.value === "ativo")}
                                            style={{ padding: 4 }}
                                        >
                                            <option value="ativo">Ativo</option>
                                            <option value="inativo">Inativo</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: 8 }}>
                                        <input
                                            type="password"
                                            placeholder="Nova senha (opcional)"
                                            value={edicaoSenha}
                                            onChange={(e) => setEdicaoSenha(e.target.value)}
                                            minLength={12}
                                            style={{ padding: 4, marginBottom: 4, display: "block" }}
                                        />
                                        <button onClick={() => salvarEdicao(usuario.id)}>Salvar</button>{" "}
                                        <button onClick={cancelarEdicao}>Cancelar</button>
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td style={{ padding: 8 }}>{usuario.id}</td>
                                    <td style={{ padding: 8 }}>{usuario.nome}</td>
                                    <td style={{ padding: 8 }}>{usuario.email}</td>
                                    <td style={{ padding: 8 }}>{usuario.cargo}</td>
                                    <td style={{ padding: 8 }}>
                                        <span
                                            style={{
                                                color: "white",
                                                backgroundColor: usuario.ativo ? "#10b981" : "#6b7280",
                                                padding: "2px 8px",
                                                borderRadius: 4,
                                                fontSize: 12,
                                            }}
                                        >
                                            {usuario.ativo ? "ativo" : "inativo"}
                                        </span>
                                    </td>
                                    <td style={{ padding: 8 }}>
                                        <button onClick={() => iniciarEdicao(usuario)}>Editar</button>{" "}
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
        </div>
    );
}
