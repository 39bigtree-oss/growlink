-- AlterTable: add desiredCategories (multi-select 希望職種) to Applicant
ALTER TABLE "Applicant"
  ADD COLUMN "desiredCategories" "FacilityCategory"[] DEFAULT ARRAY[]::"FacilityCategory"[];
