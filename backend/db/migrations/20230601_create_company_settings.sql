CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL DEFAULT 'Primetech Industry',
  company_address TEXT NOT NULL DEFAULT '123 Solar Way, Tech City',
  company_email VARCHAR(255) NOT NULL DEFAULT 'contact@primetech.com',
  phone_number VARCHAR(50) NOT NULL DEFAULT '+1 (555) 123-4567'
);

-- Insert a single row if table is empty
INSERT INTO company_settings (company_name, company_address, company_email, phone_number)
SELECT 'Primetech Industry', '123 Solar Way, Tech City', 'contact@primetech.com', '+1 (555) 123-4567'
WHERE NOT EXISTS (SELECT 1 FROM company_settings); 