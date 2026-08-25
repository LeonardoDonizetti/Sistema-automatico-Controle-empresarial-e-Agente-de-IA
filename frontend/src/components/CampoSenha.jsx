import { useState } from "react";

export default function CampoSenha({ className, ...props }) {
    const [visivel, setVisivel] = useState(false);

    return (
        <span className="campo-senha">
            <input type={visivel ? "text" : "password"} className={className} {...props} />
            <button
                type="button"
                className="botao-mostrar-senha"
                onClick={() => setVisivel(!visivel)}
                tabIndex={-1}
            >
                {visivel ? "Ocultar" : "Mostrar"}
            </button>
        </span>
    );
}
