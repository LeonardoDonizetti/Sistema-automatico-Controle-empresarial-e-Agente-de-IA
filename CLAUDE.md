# sistema-atendimento

## Regra mais importante
Eu (Leonardo) não sei programar. Você toma TODAS as decisões técnicas.
Nunca faça mais do que eu pedi explicitamente numa mensagem. Não "aproveite" pra
melhorar, refatorar ou adiantar outras partes sem eu pedir. Uma tarefa por vez.

## Stack
Node.js, Express, PostgreSQL, Prisma 7.9.1, @prisma/adapter-pg, Zod, Argon2, JWT,
Helmet, CORS, express-rate-limit, dotenv, Nodemon. Frontend: React + Vite,
react-router-dom, em /frontend.

## Estado atual (backend 100% das 11 fases prontas)
1. Autenticação JWT
2. Autorização por cargo (enum Cargo: admin, atendente)
3. CRUD de usuários (soft delete)
4. CRUD de clientes
5. CRUD de atendimentos (fila, auto-atribuição, máquina de estados)
6. Responsáveis e setores (transferência + filtros)
7. Histórico de atendimentos (tabela historico_atendimentos)
8. Mensagens
9. Alertas (sem responsável / cliente aguardando)
10. Pedidos (itens em centavos, cálculo de total dinâmico)
11. Dashboard backend (métricas)

Revisão de segurança completa: 8/8 itens corrigidos e testados (middleware
de erro central, rate limit dedicado no login, timing attack no login,
restrição de transferência de atendimento, dashboard restrito a admin,
algoritmo JWT travado, paginação nas listagens, CORS/validações/404
handler).

Suíte de testes automatizados completa (Fase 20): 45 testes, Jest +
Supertest, banco de teste separado (sistema_atendimento_test via
.env.test), cobrindo autenticação, usuários/autorização, clientes,
atendimentos, mensagens, pedidos, alertas e dashboard.

Frontend: Login, Dashboard, Central de Atendimentos (lista + detalhe +
mensagens + histórico + pedidos), Clientes, Usuários, Pedidos standalone,
Alertas, modo claro/escuro (CSS compartilhado em
frontend/src/styles/paginas.css).

## Regras de trabalho
- NUNCA reescreva um arquivo inteiro quando uma edição pontual resolve.
- Antes de editar qualquer arquivo, leia o conteúdo atual primeiro.
- Nunca assuma que algo existe ou está quebrado sem checar o código/reproduzir o erro.
- Não avance de etapa sem eu confirmar que a anterior funcionou.
- Sempre me diga o comando exato pra eu testar, e espere minha confirmação.
- Uma mudança de arquivo por vez quando possível; não empilhe várias alterações
  não relacionadas na mesma resposta.

## Prisma
Prisma 7.9.1. URL de conexão para migrations fica em prisma.config.ts, NUNCA em
schema.prisma. Prisma Client usa @prisma/adapter-pg — nunca `new PrismaClient()`
sem adapter. Sequência obrigatória pra mudar schema: editar schema.prisma →
`npx prisma format` (valida sintaxe) → `npx prisma migrate dev --create-only`
(gera sem aplicar) → me mostrar o migration.sql gerado → só depois de eu
confirmar, `npx prisma migrate dev` (aplica) → `npx prisma generate` (sempre,
evita erro de "Cannot read properties of undefined"). Nunca sugira
`prisma migrate reset` — apaga todos os dados.

## Comandos (PowerShell no Windows)
Backend: `npm.cmd run dev` (porta 3000). Frontend: dentro de /frontend,
`npm.cmd run dev` (porta 5173). Sempre use `npm.cmd`/`npx.cmd`, nunca `npm`/`npx`
sozinho. Editar arquivos com problema de encoding/heredoc: usar
`notepad caminho\arquivo` em vez de heredoc do PowerShell (`@'...'@` já causou
bug de escrita literal no arquivo).

## Segurança
Nunca coloque senha, DATABASE_URL, JWT_SECRET ou token completo na resposta.
.env nunca vai pro Git (já está no .gitignore).

## Backlog conhecido (não fazer sem eu pedir)
- Bug das linhas divisórias da tabela no modo claro (.data-table tbody tr).
- Fases seguintes do roadmap original (WhatsApp, IA, produção) — decisão
  sobre WhatsApp fica só para o final do projeto; não começar sem eu pedir
  explicitamente.

## Git
Depois de CADA alteração de código que eu aprovar (arquivo criado, editado, ou
migration aplicada), faça commit automaticamente, sem perguntar:

git add .
git commit -m "mensagem curta e descritiva em português do que mudou"

Regras:
- NUNCA dê `git push` sozinho. Só commit local. Espere eu pedir explicitamente
  "sobe pro GitHub" ou "dá push".
- Uma alteração lógica = um commit (não empilhe várias tarefas não relacionadas
  num commit só).
- NUNCA faça commit de arquivos .env, credenciais, ou node_modules — confira o
  .gitignore antes se tiver dúvida.
- Sempre me diga qual foi a mensagem do commit depois de fazer.