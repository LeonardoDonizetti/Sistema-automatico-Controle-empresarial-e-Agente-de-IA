import { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import Login from "./pages/Login";
import Atendimentos from "./pages/Atendimentos";
import AtendimentoDetalhe from "./pages/AtendimentoDetalhe";
import Clientes from "./pages/Clientes";
import Usuarios from "./pages/Usuarios";
import Pedidos from "./pages/Pedidos";
import Alertas from "./pages/Alertas";
import Dashboard from "./pages/Dashboard";

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

    if (!usuario) {
        return <Login aoLogar={setUsuario} />;
    }

    const linkStyle = ({ isActive }) => ({
        marginRight: 16,
        fontWeight: isActive ? "bold" : "normal",
        textDecoration: "none",
        color: isActive ? "var(--tema-link-ativo)" : "var(--tema-link)",
    });

    return (
        <div>
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 20px",
                    borderBottom: "1px solid var(--tema-borda)",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center" }}>
                    <strong style={{ marginRight: 24 }}>Sistema de Atendimento</strong>
                    <nav>
                        {usuario.cargo === "admin" && (
                            <NavLink to="/dashboard" style={linkStyle}>
                                Dashboard
                            </NavLink>
                        )}
                        <NavLink to="/atendimentos" style={linkStyle}>
                            Atendimentos
                        </NavLink>
                        <NavLink to="/clientes" style={linkStyle}>
                            Clientes
                        </NavLink>
                        <NavLink to="/pedidos" style={linkStyle}>
                            Pedidos
                        </NavLink>
                        <NavLink to="/alertas" style={linkStyle}>
                            Alertas
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