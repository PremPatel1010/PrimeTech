-- Create inventory schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS inventory;

-- Create sub_components table
CREATE TABLE IF NOT EXISTS inventory.sub_components (
    sub_component_id SERIAL PRIMARY KEY,
    component_code VARCHAR(50) NOT NULL UNIQUE,
    component_name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    current_stock INTEGER NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    updated_by INTEGER REFERENCES auth.users(user_id)
);

-- Create sub_component_transactions table to track stock movements
CREATE TABLE IF NOT EXISTS inventory.sub_component_transactions (
    transaction_id SERIAL PRIMARY KEY,
    sub_component_id INTEGER NOT NULL REFERENCES inventory.sub_components(sub_component_id),
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50) NOT NULL, -- e.g., 'jobwork', 'manufacturing', 'adjustment'
    reference_id INTEGER NOT NULL, -- ID of the related record (jobwork order, manufacturing batch, etc.)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sub_components_code ON inventory.sub_components(component_code);
CREATE INDEX IF NOT EXISTS idx_sub_components_name ON inventory.sub_components(component_name);
CREATE INDEX IF NOT EXISTS idx_sub_component_transactions_component ON inventory.sub_component_transactions(sub_component_id);
CREATE INDEX IF NOT EXISTS idx_sub_component_transactions_reference ON inventory.sub_component_transactions(reference_type, reference_id); 