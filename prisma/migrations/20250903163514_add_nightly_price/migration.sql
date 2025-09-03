/*
  Warnings:

  - Added the required column `nightlyPrice` to the `Property` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Property" ADD COLUMN     "address" TEXT,
ADD COLUMN     "nightlyPrice" INTEGER NOT NULL;
