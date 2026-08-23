import { useState } from "react";
import Login from "./pages/Login";
import Atendimentos from "./pages/Atendimentos";

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
                <strong>Sistema de Atendimento</strong>
                <div>
                    {usuario.nome} ({usuario.cargo}){" "}
                    <button onClick={handleLogout}>Sair</button>
                </div>
            </header>
            <Atendimentos />
        </div>
    );
}

export default App;