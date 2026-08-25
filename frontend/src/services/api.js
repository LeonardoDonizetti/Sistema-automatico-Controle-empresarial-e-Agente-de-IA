const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

async function request(endpoint, options = {}) {
    const token = localStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const resposta = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (resposta.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        window.location.reload();
        throw new Error("Sessão expirada. Faça login novamente.");
    }

    const dados = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        const mensagem = dados?.erro || "Erro na requisição.";
        throw new Error(mensagem);
    }

    return dados;
}

export const api = {
    get: (endpoint) => request(endpoint, { method: "GET" }),
    post: (endpoint, body) =>
        request(endpoint, { method: "POST", body: JSON.stringify(body) }),
    patch: (endpoint, body) =>
        request(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (endpoint) => request(endpoint, { method: "DELETE" }),
};