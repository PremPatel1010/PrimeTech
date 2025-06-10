-- Create manufacturing steps table
CREATE TABLE IF NOT EXISTS manufacturing.steps (
    step_id SERIAL PRIMARY KEY,
    step_name VARCHAR(50) NOT NULL,
    step_code VARCHAR(20) UNIQUE NOT NULL,
    sequence INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default manufacturing steps
INSERT INTO manufacturing.steps (step_name, step_code, sequence, description)
VALUES 
    ('Inward', 'INWARD', 1, 'Materials/components are received and logged in'),
    ('Quality Check', 'QC', 2, 'Quality inspection of raw materials or sub-components'),
    ('Assembly', 'ASSEMBLY', 3, 'Building the sub-component or assembling the final product'),
    ('Testing', 'TESTING', 4, 'Functional or performance testing'),
    ('Packaging', 'PACKAGING', 5, 'Final packaging for shipment or storage')
ON CONFLICT (step_code) DO NOTHING;

-- Create workflow steps tracking table
CREATE TABLE IF NOT EXISTS manufacturing.workflow_steps (
    workflow_step_id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES product.batch_workflows(id) ON DELETE CASCADE,
    step_id INTEGER REFERENCES manufacturing.steps(step_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'not_started',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold'))
);

-- Create index for better performance
CREATE INDEX idx_workflow_steps_workflow ON manufacturing.workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_status ON manufacturing.workflow_steps(status);

-- Create trigger for updated_at
CREATE TRIGGER update_workflow_steps_timestamp
    BEFORE UPDATE ON manufacturing.workflow_steps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();