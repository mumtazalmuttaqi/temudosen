-- AlterTable
ALTER TABLE "lecturer_profiles" ADD COLUMN     "nip" TEXT,
ADD COLUMN     "thesis_recommendations" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "lecturer_profiles_nip_key" ON "lecturer_profiles"("nip");
