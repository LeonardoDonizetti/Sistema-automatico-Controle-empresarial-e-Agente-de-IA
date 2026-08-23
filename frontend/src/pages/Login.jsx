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
        <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif" }}>
            <h1>Sistema de Atendimento</h1>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 12 }}>
                    <label>E-mail</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
                    />
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label>Senha</label>
                    <input
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                        style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
                    />
                </div>
                {erro && <p style={{ color: "red" }}>{erro}</p>}
                <button type="submit" disabled={carregando} style={{ width: "100%", padding: 10 }}>
                    {carregando ? "Entrando..." : "Entrar"}
                </button>
            </form>
        </div>
    );
}