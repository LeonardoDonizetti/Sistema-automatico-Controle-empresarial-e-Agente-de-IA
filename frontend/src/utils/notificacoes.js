export const CHAVE_VISTOS_ATENDIMENTOS = "vistos_atendimentos";
export const CHAVE_VISTOS_PEDIDOS = "vistos_pedidos";
export const CHAVE_VISTOS_ALERTAS = "vistos_alertas";

export function marcarComoVistos(chave, ids) {
    try {
        localStorage.setItem(chave, JSON.stringify(ids));
    } catch {
        // localStorage indisponível (modo privado, cota cheia etc.) - ignora
    }
}

export function contarNaoVistos(chave, ids) {
    let vistos = [];

    try {
        vistos = JSON.parse(localStorage.getItem(chave) || "[]");
    } catch {
        vistos = [];
    }

    const vistosSet = new Set(vistos);
    return ids.filter((id) => !vistosSet.has(id)).length;
}
