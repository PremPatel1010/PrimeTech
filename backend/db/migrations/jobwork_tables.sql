-- Create jobwork schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS jobwork;

-- Create jobwork_vendors table
CREATE TABLE IF NOT EXISTS jobwork.jobwork_vendors (
    vendor_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    updated_by INTEGER REFERENCES auth.users(user_id)
);

-- Create jobwork_orders table
CREATE TABLE IF NOT EXISTS jobwork.jobwork_orders (
    order_id SERIAL PRIMARY KEY,
    jobwork_number VARCHAR(20) NOT NULL UNIQUE,
    vendor_id INTEGER NOT NULL REFERENCES jobwork.jobwork_vendors(vendor_id),
    order_date DATE NOT NULL,
    due_date DATE NOT NULL,
    component VARCHAR(100) NOT NULL,
    item_sent VARCHAR(100) NOT NULL,
    expected_return_item VARCHAR(100) NOT NULL,
    quantity_sent INTEGER NOT NULL CHECK (quantity_sent > 0),
    quantity_received INTEGER DEFAULT 0,
    quantity_loss INTEGER DEFAULT 0,
    purpose VARCHAR(50) NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    updated_by INTEGER REFERENCES auth.users(user_id)
);

-- Create jobwork_receipts table
CREATE TABLE IF NOT EXISTS jobwork.jobwork_receipts (
    receipt_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES jobwork.jobwork_orders(order_id) ON DELETE CASCADE,
    receipt_date DATE NOT NULL,
    final_item_name VARCHAR(100) NOT NULL,
    quantity_received INTEGER NOT NULL CHECK (quantity_received >= 0),
    quantity_loss INTEGER DEFAULT 0 CHECK (quantity_loss >= 0),
    remarks TEXT,
    document_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    updated_by INTEGER REFERENCES auth.users(user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobwork_orders_vendor_id ON jobwork.jobwork_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_jobwork_orders_status ON jobwork.jobwork_orders(status);
CREATE INDEX IF NOT EXISTS idx_jobwork_orders_jobwork_number ON jobwork.jobwork_orders(jobwork_number);
CREATE INDEX IF NOT EXISTS idx_jobwork_receipts_order_id ON jobwork.jobwork_receipts(order_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION jobwork.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_jobwork_vendors_updated_at
    BEFORE UPDATE ON jobwork.jobwork_vendors
    FOR EACH ROW
    EXECUTE FUNCTION jobwork.update_updated_at_column();

CREATE TRIGGER update_jobwork_orders_updated_at
    BEFORE UPDATE ON jobwork.jobwork_orders
    FOR EACH ROW
    EXECUTE FUNCTION jobwork.update_updated_at_column();

CREATE TRIGGER update_jobwork_receipts_updated_at
    BEFORE UPDATE ON jobwork.jobwork_receipts
    FOR EACH ROW
    EXECUTE FUNCTION jobwork.update_updated_at_column(); 