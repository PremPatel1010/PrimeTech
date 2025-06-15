-- Add created_by and updated_by columns to sales_order table
ALTER TABLE sales.sales_order 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES auth.users(user_id),
ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES auth.users(user_id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have a default created_by value
UPDATE sales.sales_order 
SET created_by = 1 
WHERE created_by IS NULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION sales.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_order_updated_at
    BEFORE UPDATE ON sales.sales_order
    FOR EACH ROW
    EXECUTE FUNCTION sales.update_updated_at_column(); 