-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "confirmationEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "refundedAt" TIMESTAMP(3);
