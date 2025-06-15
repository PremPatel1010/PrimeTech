-- Add stock_deduction and manufacturing_quantity columns to sales_order_items table
ALTER TABLE sales.sales_order_items ADD COLUMN stock_deduction integer DEFAULT 0;
ALTER TABLE sales.sales_order_items ADD COLUMN manufacturing_quantity integer DEFAULT 0;

-- Update existing records
UPDATE sales.sales_order_items SET stock_deduction = quantity WHERE fulfilled_from_inventory = true;
UPDATE sales.sales_order_items SET manufacturing_quantity = quantity WHERE fulfilled_from_inventory = false;

-- Add constraints
ALTER TABLE sales.sales_order_items ADD CONSTRAINT check_quantity_sum CHECK (quantity = stock_deduction + manufacturing_quantity);
ALTER TABLE sales.sales_order_items ADD CONSTRAINT check_non_negative_quantities CHECK (stock_deduction >= 0 AND manufacturing_quantity >= 0); 