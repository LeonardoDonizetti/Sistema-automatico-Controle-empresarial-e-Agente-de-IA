-- CreateTable
CREATE TABLE "aguardando_nome_whatsapp" (
    "id" SERIAL NOT NULL,
    "telefone" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aguardando_nome_whatsapp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_whatsapp_processadas" (
    "id" SERIAL NOT NULL,
    "wamid" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_whatsapp_processadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aguardando_nome_whatsapp_telefone_key" ON "aguardando_nome_whatsapp"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "mensagens_whatsapp_processadas_wamid_key" ON "mensagens_whatsapp_processadas"("wamid");
