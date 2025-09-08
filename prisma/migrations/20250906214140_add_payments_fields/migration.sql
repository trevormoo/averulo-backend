/*
  Warnings:

  - The values [CONFIRMED,COMPLETED] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[paymentRef]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."BookingStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
ALTER TABLE "public"."Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Booking" ALTER COLUMN "status" TYPE "public"."BookingStatus_new" USING ("status"::text::"public"."BookingStatus_new");
ALTER TYPE "public"."BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "public"."BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "public"."BookingStatus_old";
ALTER TABLE "public"."Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Booking" ADD COLUMN     "amount" INTEGER,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "paymentRef" TEXT,
ADD COLUMN     "paymentStatus" TEXT;

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "public"."Payment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paymentRef_key" ON "public"."Booking"("paymentRef");

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
