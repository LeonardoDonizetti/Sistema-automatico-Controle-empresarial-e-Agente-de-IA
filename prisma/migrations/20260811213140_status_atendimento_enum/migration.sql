/*
  Warnings:

  - The `status` column on the `conversas` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "StatusAtendimento" AS ENUM ('aguardando', 'em_atendimento', 'resolvido', 'fechado');

-- AlterTable
ALTER TABLE "conversas" DROP COLUMN "status",
ADD COLUMN     "status" "StatusAtendimento" NOT NULL DEFAULT 'aguardando';

-- CreateIndex
CREATE INDEX "conversas_status_idx" ON "conversas"("status");
