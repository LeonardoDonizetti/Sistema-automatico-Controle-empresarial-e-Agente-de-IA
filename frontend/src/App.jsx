import { useState } from "react";
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import Login from "./pages/Login";
import Atendimentos from "./pages/Atendimentos";
import AtendimentoDetalhe from "./pages/AtendimentoDetalhe";
import Clientes from "./pages/Clientes";

function App() {
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
        color: isActive ? "#111" : "#555",
    });

    return (
        <div>
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 20px",
                    borderBottom: "1px solid #ddd",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center" }}>
                    <strong style={{ marginRight: 24 }}>Sistema de Atendimento</strong>
                    <nav>
                        <NavLink to="/atendimentos" style={linkStyle}>
                            Atendimentos
                        </NavLink>
                        <NavLink to="/clientes" style={linkStyle}>
                            Clientes
                        </NavLink>
                    </nav>
                </div>
                <div>
                    {usuario.nome} ({usuario.cargo}){" "}
                    <button onClick={handleLogout}>Sair</button>
                </div>
            </header>

            <Routes>
                <Route path="/" element={<Navigate to="/atendimentos" />} />
                <Route path="/atendimentos" element={<Atendimentos />} />
                <Route path="/atendimentos/:id" element={<AtendimentoDetalhe />} />
                <Route path="/clientes" element={<Clientes />} />
            </Routes>
        </div>
    );
}

export default App;