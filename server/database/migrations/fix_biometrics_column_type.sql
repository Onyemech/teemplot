ALTER TABLE companies 
DROP COLUMN biometrics_required;

ALTER TABLE companies 
ADD COLUMN biometrics_required BOOLEAN DEFAULT false;
