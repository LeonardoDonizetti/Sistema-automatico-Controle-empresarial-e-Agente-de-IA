export default function Paginacao({ pagina, totalPaginas, setPagina }) {
    return (
        <div className="paginacao-row">
            <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1}>
                Anterior
            </button>
            <span>
                {" "}
                Página {pagina} de {totalPaginas}{" "}
            </span>
            <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas}
            >
                Próxima
            </button>
        </div>
    );
}
