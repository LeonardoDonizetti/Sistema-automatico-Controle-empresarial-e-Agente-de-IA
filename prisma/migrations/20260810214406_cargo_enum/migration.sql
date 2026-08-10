-- CreateEnum
CREATE TYPE "Cargo" AS ENUM ('admin', 'atendente');

-- AlterTable
ALTER TABLE "usuarios"
  ALTER COLUMN "cargo" TYPE "Cargo" USING ("cargo"::"Cargo");