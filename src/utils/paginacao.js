const POR_PAGINA_PADRAO = 20;
const POR_PAGINA_MAXIMO = 100;

function parsePaginacao(query) {
    const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);
    const porPagina = Math.min(
        POR_PAGINA_MAXIMO,
        Math.max(1, parseInt(query.porPagina, 10) || POR_PAGINA_PADRAO)
    );

    return {
        pagina,
        porPagina,
        skip: (pagina - 1) * porPagina,
        take: porPagina,
    };
}

function metaPaginacao(total, pagina, porPagina) {
    return {
        total,
        pagina,
        porPagina,
        totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    };
}

module.exports = { parsePaginacao, metaPaginacao };
