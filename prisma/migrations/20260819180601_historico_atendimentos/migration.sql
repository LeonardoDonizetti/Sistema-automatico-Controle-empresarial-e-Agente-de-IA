-- CreateTable
CREATE TABLE "historico_atendimentos" (
    "id" SERIAL NOT NULL,
    "atendimento_id" INTEGER NOT NULL,
    "usuario_id" INTEGER,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_atendimentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "historico_atendimentos_atendimento_id_idx" ON "historico_atendimentos"("atendimento_id");

-- CreateIndex
CREATE INDEX "historico_atendimentos_criado_em_idx" ON "historico_atendimentos"("criado_em");

-- AddForeignKey
ALTER TABLE "historico_atendimentos" ADD CONSTRAINT "historico_atendimentos_atendimento_id_fkey" FOREIGN KEY ("atendimento_id") REFERENCES "conversas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_atendimentos" ADD CONSTRAINT "historico_atendimentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
