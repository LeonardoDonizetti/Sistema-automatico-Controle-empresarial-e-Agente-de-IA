import { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { api } from "./services/api";
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
                api.get("/atendimentos?status=aguardando&porPagina=1"),
                api.get("/pedidos?status=aguardando_aprovacao&porPagina=1"),
            ]);

            if (cancelado) {
                return;
            }

            setContadores((atual) => {
                const novo = { ...atual };

                if (resultados[0].status === "fulfilled") {
                    const { semResponsavel, clienteAguardando } = resultados[0].value.alertas;
                    novo.alertas = semResponsavel.length + clienteAguardando.length;
                }

                if (resultados[1].status === "fulfilled") {
                    novo.atendimentos = resultados[1].value.paginacao.total;
                }

                if (resultados[2].status === "fulfilled") {
                    novo.pedidos = resultados[2].value.paginacao.total;
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
                        {tema === "dark" ? "☀️" : "🌙"}
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