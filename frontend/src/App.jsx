import { useState } from "react";
import Login from "./pages/Login";

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
        <div style={{ padding: 20, fontFamily: "sans-serif" }}>
            <h1>Bem-vindo, {usuario.nome}</h1>
            <p>Cargo: {usuario.cargo}</p>
            <button onClick={handleLogout}>Sair</button>
        </div>
    );
}

export default App;