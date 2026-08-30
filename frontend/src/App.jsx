import { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { api } from "./services/api";
import {
    CHAVE_VISTOS_ALERTAS,
    CHAVE_VISTOS_ATENDIMENTOS,
    CHAVE_VISTOS_PEDIDOS,
    contarNaoVistos,
} from "./utils/notificacoes";
import Login from "./pages/Login";
import Atendimentos from "./pages/Atendimentos";
import AtendimentoDetalhe from "./pages/AtendimentoDetalhe";
import Clientes from "./pages/Clientes";
import Usuarios from "./pages/Usuarios";
import Pedidos from "./pages/Pedidos";
import Alertas from "./pages/Alertas";
import Dashboard from "./pages/Dashboard";

const INTERVALO_CONTADORES_MS = 30000;

function renderContador(valor) {
    return valor > 0 ? <span className="nav-badge">({valor})</span> : null;
}

function IconeSol() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="4" />
            <line x1="12" y1="20" x2="12" y2="22" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="2" y1="12" x2="4" y2="12" />
            <line x1="20" y1="12" x2="22" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
    );
}

function IconeLua() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 1 0 20.354 15.354z" />
        </svg>
    );
}

function App() {
    const [tema, setTema] = useState(() => localStorage.getItem("tema") || "light");

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", tema);
        localStorage.setItem("tema", tema);
    }, [tema]);

    function alternarTema() {
        setTema((atual) => (atual === "dark" ? "light" : "dark"));
    }

    const [usuario, setUsuario] = useState(() => {
        const salvo = localStorage.getItem("usuario");
        return salvo ? JSON.parse(salvo) : null;
    });

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setUsuario(null);
    }

    const [contadores, setContadores] = useState({ alertas: 0, atendimentos: 0, pedidos: 0 });

    useEffect(() => {
        if (!usuario) {
            return;
        }

        let cancelado = false;

        async function carregarContadores() {
            const resultados = await Promise.allSettled([
                api.get("/alertas"),
                api.get("/atendimentos?status=aguardando&porPagina=100"),
                api.get("/pedidos?status=aguardando_aprovacao&porPagina=100"),
            ]);

            if (cancelado) {
                return;
            }

            setContadores((atual) => {
                const novo = { ...atual };

                if (resultados[0].status === "fulfilled") {
                    const { semResponsavel, clienteAguardando } = resultados[0].value.alertas;
                    const ids = [
                        ...semResponsavel.map((a) => `sem:${a.atendimentoId}`),
                        ...clienteAguardando.map((a) => `cli:${a.atendimentoId}`),
                    ];
                    novo.alertas = contarNaoVistos(CHAVE_VISTOS_ALERTAS, ids);
                }

                if (resultados[1].status === "fulfilled") {
                    const ids = resultados[1].value.atendimentos.map((a) => a.id);
                    novo.atendimentos = contarNaoVistos(CHAVE_VISTOS_ATENDIMENTOS, ids);
                }

                if (resultados[2].status === "fulfilled") {
                    const ids = resultados[2].value.pedidos.map((p) => p.id);
                    novo.pedidos = contarNaoVistos(CHAVE_VISTOS_PEDIDOS, ids);
                }

                return novo;
            });
        }

        carregarContadores();
        const intervalo = setInterval(carregarContadores, INTERVALO_CONTADORES_MS);

        return () => {
            cancelado = true;
            clearInterval(intervalo);
        };
    }, [usuario]);

    if (!usuario) {
        return <Login aoLogar={setUsuario} />;
    }

    const linkStyle = ({ isActive }) => ({
        marginRight: 16,
        fontWeight: isActive ? "bold" : "normal",
        textDecoration: "none",
        color: isActive ? "var(--tema-marca)" : "var(--tema-link)",
    });

    return (
        <div>
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 24px",
                    borderBottom: "1px solid var(--tema-borda)",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center" }}>
                    <strong style={{ marginRight: 24, color: "var(--tema-marca)" }}>Sistema de Atendimento</strong>
                    <nav>
                        {usuario.cargo === "admin" && (
                            <NavLink to="/dashboard" style={linkStyle}>
                                Dashboard
                            </NavLink>
                        )}
                        <NavLink to="/atendimentos" style={linkStyle}>
                            Atendimentos{renderContador(contadores.atendimentos)}
                        </NavLink>
                        <NavLink to="/clientes" style={linkStyle}>
                            Clientes
                        </NavLink>
                        <NavLink to="/pedidos" style={linkStyle}>
                            Pedidos{renderContador(contadores.pedidos)}
                        </NavLink>
                        <NavLink to="/alertas" style={linkStyle}>
                            Alertas{renderContador(contadores.alertas)}
                        </NavLink>
                        {usuario.cargo === "admin" && (
                            <NavLink to="/usuarios" style={linkStyle}>
                                Usuários
                            </NavLink>
                        )}
                    </nav>
                </div>
                <div>
                    <button onClick={alternarTema} className="btn-tema" aria-label="Alternar tema claro/escuro">
                        {tema === "dark" ? <IconeSol /> : <IconeLua />}
                    </button>{" "}
                    {usuario.nome} ({usuario.cargo}){" "}
                    <button onClick={handleLogout}>Sair</button>
                </div>
            </header>

            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/atendimentos" element={<Atendimentos />} />
                <Route path="/atendimentos/:id" element={<AtendimentoDetalhe />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/pedidos" element={<Pedidos />} />
                <Route path="/alertas" element={<Alertas />} />
                <Route path="/usuarios" element={<Usuarios />} />
            </Routes>
        </div>
    );
}

export default App;