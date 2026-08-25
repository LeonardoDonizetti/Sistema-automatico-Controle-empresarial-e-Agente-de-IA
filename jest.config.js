module.exports = {
    setupFiles: ["<rootDir>/jest.setup.js"],
    // Os testes usam um banco Postgres real compartilhado e cada arquivo
    // limpa/recria dados antes de cada teste. Rodar em paralelo (padrao do
    // Jest) causaria um arquivo apagando os dados que outro acabou de criar.
    maxWorkers: 1,
};
