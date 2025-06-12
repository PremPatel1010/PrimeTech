-- Create manufacturing schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS manufacturing;

-- Create manufacturing_batches table
CREATE TABLE IF NOT EXISTS manufacturing.manufacturing_batches (
    batch_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES product.products(id),
    sales_order_id INTEGER REFERENCES sales.sales_order(sales_order_id),
    batch_number VARCHAR(20) NOT NULL UNIQUE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    updated_by INTEGER REFERENCES auth.users(user_id)
);

-- Create batch_workflows table to track workflow status
CREATE TABLE IF NOT EXISTS manufacturing.batch_workflows (
    workflow_id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES manufacturing.manufacturing_batches(batch_id) ON DELETE CASCADE,
    step_id INTEGER NOT NULL REFERENCES product.manufacturing_steps(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    updated_by INTEGER REFERENCES auth.users(user_id),
    UNIQUE(batch_id, step_id)
);

-- Create batch_sub_components table to track sub-component status
CREATE TABLE IF NOT EXISTS manufacturing.batch_sub_components (
    id SERIAL PRIMARY KEY,
    batch_id INTEGER NOT NULL REFERENCES manufacturing.manufacturing_batches(batch_id) ON DELETE CASCADE,
    sub_component_id INTEGER NOT NULL REFERENCES product.sub_components(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    updated_by INTEGER REFERENCES auth.users(user_id),
    UNIQUE(batch_id, sub_component_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_manufacturing_batches_product_id ON manufacturing.manufacturing_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_batches_sales_order_id ON manufacturing.manufacturing_batches(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_batches_status ON manufacturing.manufacturing_batches(status);
CREATE INDEX IF NOT EXISTS idx_batch_workflows_batch_id ON manufacturing.batch_workflows(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_workflows_step_id ON manufacturing.batch_workflows(step_id);
CREATE INDEX IF NOT EXISTS idx_batch_sub_components_batch_id ON manufacturing.batch_sub_components(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_sub_components_sub_component_id ON manufacturing.batch_sub_components(sub_component_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION manufacturing.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_manufacturing_batches_updated_at
    BEFORE UPDATE ON manufacturing.manufacturing_batches
    FOR EACH ROW
    EXECUTE FUNCTION manufacturing.update_updated_at_column();

CREATE TRIGGER update_batch_workflows_updated_at
    BEFORE UPDATE ON manufacturing.batch_workflows
    FOR EACH ROW
    EXECUTE FUNCTION manufacturing.update_updated_at_column();

CREATE TRIGGER update_batch_sub_components_updated_at
    BEFORE UPDATE ON manufacturing.batch_sub_components
    FOR EACH ROW
    EXECUTE FUNCTION manufacturing.update_updated_at_column(); 