import { useState } from "react";
import { api } from "../services/api";

export default function Login({ aoLogar }) {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");
    const [carregando, setCarregando] = useState(false);

    async function handleSubmit(evento) {
        evento.preventDefault();
        setErro("");
        setCarregando(true);

        try {
            const resposta = await api.post("/auth/login", { email, senha });
            localStorage.setItem("token", resposta.token);
            localStorage.setItem("usuario", JSON.stringify(resposta.usuario));
            aoLogar(resposta.usuario);
        } catch (error) {
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className="login-container">
            <h1>Sistema de Atendimento</h1>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>E-mail</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="input-block"
                    />
                </div>
                <div className="form-group">
                    <label>Senha</label>
                    <input
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                        className="input-block"
                    />
                </div>
                {erro && <p className="error-text">{erro}</p>}
                <button type="submit" disabled={carregando} className="btn-block">
                    {carregando ? "Entrando..." : "Entrar"}
                </button>
            </form>
        </div>
    );
}