-- ========================
-- SCHEMAS
-- ========================
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE SCHEMA IF NOT EXISTS purchase;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS manufacturing;
CREATE SCHEMA IF NOT EXISTS products;

-- ========================
-- COMPANY SETTINGS (Global)
-- ========================
CREATE TABLE IF NOT EXISTS public.company_settings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL DEFAULT 'Primetech Industry',
  company_address TEXT NOT NULL DEFAULT '123 Solar Way, Tech City',
  company_email VARCHAR(255) NOT NULL DEFAULT 'contact@primetech.com',
  phone_number VARCHAR(50) NOT NULL DEFAULT '+1 (555) 123-4567'
);

-- Insert a single row if table is empty
INSERT INTO public.company_settings (company_name, company_address, company_email, phone_number)
SELECT 'Primetech Industry', '123 Solar Way, Tech City', 'contact@primetech.com', '+1 (555) 123-4567'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- ========================
-- USERS TABLE
-- ========================
CREATE TABLE auth.users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager')),
    department_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- PRODUCT & BOM
-- ========================
CREATE TABLE products.product (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    product_code VARCHAR(50) UNIQUE NOT NULL,
    discharge_range VARCHAR(50),
    head_range VARCHAR(50),
    rating_range VARCHAR(50),
    price DECIMAL(10, 2),
    cost_price DECIMAL(10, 2) DEFAULT 0,
    manufacturing_steps JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory.raw_materials (
    material_id SERIAL PRIMARY KEY,
    material_code VARCHAR(50) UNIQUE NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    moc VARCHAR(100), -- Material of Construction
    unit_weight DECIMAL(10, 2),
    unit VARCHAR(20) DEFAULT 'kg',
    current_stock DECIMAL(10, 2) DEFAULT 0,
    minimum_stock DECIMAL(10, 2) DEFAULT 0,
    unit_price DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory.finished_products (
    finished_product_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products.product(product_id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) DEFAULT 0,
    -- total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity_available * unit_price) STORED,
    -- Calculate total_price in application code: total_price = quantity_available * unit_price
    minimum_stock INTEGER NOT NULL DEFAULT 5,
    storage_location VARCHAR(100), -- Optional: rack/bin info
    status VARCHAR(20) CHECK (status IN ('available', 'reserved', 'dispatched')) DEFAULT 'available',
    added_on TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products.bom (
    bom_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products.product(product_id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES inventory.raw_materials(material_id) ON DELETE CASCADE,
    quantity_required DECIMAL(10, 2) NOT NULL
    -- Removed total_weight generated column (can be calculated in application or via a view)
);

-- ========================
-- SALES ORDER
-- ========================
CREATE TABLE sales.sales_order (
    sales_order_id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    discount DECIMAL(5, 2) DEFAULT 0,
    gst DECIMAL(5, 2) DEFAULT 18,
    total_amount DECIMAL(10, 2),
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales.sales_order_items (
    item_id SERIAL PRIMARY KEY,
    sales_order_id INTEGER NOT NULL REFERENCES sales.sales_order(sales_order_id) ON DELETE CASCADE,
    product_category VARCHAR(100),
    product_id INTEGER REFERENCES products.product(product_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    gst DECIMAL(5,2) DEFAULT 18,
    unit_price DECIMAL(10, 2) NOT NULL,
    -- total_price DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    -- Calculate total_price in application code: total_price = quantity * unit_price
    fulfilled_from_inventory BOOLEAN DEFAULT FALSE
);

-- ========================
-- PURCHASE ORDER TABLES
-- ========================
-- Suppliers table
CREATE TABLE IF NOT EXISTS purchase.suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(128) NOT NULL UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    gst_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order table
CREATE TABLE IF NOT EXISTS purchase.purchase_order (
    purchase_order_id SERIAL PRIMARY KEY,
    order_number VARCHAR(32) NOT NULL UNIQUE,
    order_date DATE NOT NULL,
    supplier_id INTEGER REFERENCES purchase.suppliers(supplier_id),
    status VARCHAR(32) NOT NULL DEFAULT 'ordered',
    discount NUMERIC(10,2) DEFAULT 0,
    gst NUMERIC(10,2) DEFAULT 18,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Items table
CREATE TABLE IF NOT EXISTS purchase.purchase_order_items (
    item_id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase.purchase_order(purchase_order_id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES inventory.raw_materials(material_id),
    quantity DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'pcs',
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Status Logs table
CREATE TABLE IF NOT EXISTS purchase.purchase_order_status_logs (
    log_id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase.purchase_order(purchase_order_id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL,
    notes TEXT,
    quantity_details JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id)
);

-- GRNs table
CREATE TABLE IF NOT EXISTS purchase.grns (
    grn_id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase.purchase_order(purchase_order_id) ON DELETE CASCADE,
    received_quantity DECIMAL(10,2) NOT NULL,
    grn_date DATE NOT NULL DEFAULT CURRENT_DATE,
    matched_with_po BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) CHECK (status IN ('pending', 'qc_in_progress', 'completed')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    UNIQUE (purchase_order_id, grn_date)
);

-- Add QC summary fields to GRN
ALTER TABLE purchase.grns
ADD COLUMN IF NOT EXISTS qc_status VARCHAR(20) DEFAULT 'pending' CHECK (qc_status IN ('pending', 'in_progress', 'completed')),
ADD COLUMN IF NOT EXISTS qc_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qc_completed_by INTEGER REFERENCES auth.users(user_id);

-- GRN Items table
CREATE TABLE IF NOT EXISTS purchase.grn_items (
    grn_item_id SERIAL PRIMARY KEY,
    grn_id INTEGER NOT NULL REFERENCES purchase.grns(grn_id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES inventory.raw_materials(material_id),
    received_quantity DECIMAL(10,2) NOT NULL,
    defective_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add QC status tracking fields to GRN items
ALTER TABLE purchase.grn_items
ADD COLUMN IF NOT EXISTS qc_status VARCHAR(20) DEFAULT 'pending' CHECK (qc_status IN ('pending', 'passed', 'returned')),
ADD COLUMN IF NOT EXISTS qc_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qc_by INTEGER REFERENCES auth.users(user_id),
ADD COLUMN IF NOT EXISTS qc_quantity DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS qc_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qc_notes TEXT;

-- QC Reports table
CREATE TABLE IF NOT EXISTS purchase.qc_reports (
    qc_id SERIAL PRIMARY KEY,
    grn_id INTEGER NOT NULL REFERENCES purchase.grns(grn_id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES inventory.raw_materials(material_id),
    inspected_quantity DECIMAL(10,2) NOT NULL,
    defective_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    accepted_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    CONSTRAINT qc_quantity_check CHECK (inspected_quantity = defective_quantity + accepted_quantity)
);

-- Create indexes for purchase order tables
CREATE INDEX IF NOT EXISTS idx_po_status_logs_po_id ON purchase.purchase_order_status_logs(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON purchase.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_grns_po_id ON purchase.grns(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_qc_reports_grn_id ON purchase.qc_reports(grn_id);

-- Create trigger function for status logging
CREATE OR REPLACE FUNCTION purchase.log_po_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS NULL OR NEW.status != OLD.status THEN
        INSERT INTO purchase.purchase_order_status_logs (purchase_order_id, status)
        VALUES (NEW.purchase_order_id, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status changes
DROP TRIGGER IF EXISTS po_status_change_trigger ON purchase.purchase_order;
CREATE TRIGGER po_status_change_trigger
AFTER INSERT OR UPDATE ON purchase.purchase_order
FOR EACH ROW
EXECUTE FUNCTION purchase.log_po_status_change();

-- ========================
-- MANUFACTURING STAGES
-- ========================
CREATE TABLE manufacturing.product_manufacturing (
    tracking_id SERIAL PRIMARY KEY,
    batch_number VARCHAR(50),
    product_name VARCHAR(100),
    stage_completion_dates JSONB,
    progress INTEGER DEFAULT 0,
    estimated_completion_date DATE,
    start_date DATE,
    linked_sales_order_id INTEGER,
    sales_order_id INTEGER REFERENCES sales.sales_order(sales_order_id) ON DELETE CASCADE,
    sales_order_item_id INTEGER REFERENCES sales.sales_order_items(item_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products.product(product_id) ON DELETE CASCADE,
    current_stage_id INTEGER,
    custom_stage_name VARCHAR(100),
    quantity_in_process INTEGER DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- PRODUCT-SPECIFIC MANUFACTURING STAGES
-- ========================
CREATE TABLE manufacturing.product_stages (
    product_stage_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products.product(product_id) ON DELETE CASCADE,
    stage_name VARCHAR(100) NOT NULL,
    sequence INTEGER NOT NULL
);

-- ========================
-- REVENUE AND PROFIT ANALYSIS
-- ========================
CREATE TABLE sales.revenue_analysis (
    analysis_id SERIAL PRIMARY KEY,
    period_type VARCHAR(20) CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_profit DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_orders INTEGER NOT NULL DEFAULT 0,
    average_order_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (period_type, start_date, end_date)
);

CREATE TABLE sales.revenue_details (
    detail_id SERIAL PRIMARY KEY,
    analysis_id INTEGER REFERENCES sales.revenue_analysis(analysis_id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products.product(product_id) ON DELETE CASCADE,
    quantity_sold INTEGER NOT NULL DEFAULT 0,
    revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    profit DECIMAL(12, 2) NOT NULL DEFAULT 0
);

-- Function to update revenue analysis
CREATE OR REPLACE FUNCTION sales.update_revenue_analysis()
RETURNS TRIGGER AS $$
DECLARE
    v_total_cost DECIMAL(12, 2);
    v_total_profit DECIMAL(12, 2);
BEGIN
    -- Update revenue analysis when sales order is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Calculate costs and profits
        SELECT 
            COALESCE(SUM(soi.quantity * soi.unit_price * 0.7), 0),
            NEW.total_amount - COALESCE(SUM(soi.quantity * soi.unit_price * 0.7), 0)
        INTO v_total_cost, v_total_profit
        FROM sales.sales_order_items soi
        WHERE soi.sales_order_id = NEW.sales_order_id;

        -- Insert or update daily analysis
        INSERT INTO sales.revenue_analysis (
            period_type,
            start_date,
            end_date,
            total_revenue,
            total_cost,
            total_profit,
            total_orders,
            average_order_value
        )
        VALUES (
            'daily',
            DATE(NEW.created_at),
            DATE(NEW.created_at),
            NEW.total_amount,
            v_total_cost,
            v_total_profit,
            1,
            NEW.total_amount
        )
        ON CONFLICT (period_type, start_date, end_date) 
        DO UPDATE SET
            total_revenue = sales.revenue_analysis.total_revenue + NEW.total_amount,
            total_cost = sales.revenue_analysis.total_cost + v_total_cost,
            total_profit = sales.revenue_analysis.total_profit + v_total_profit,
            total_orders = sales.revenue_analysis.total_orders + 1,
            average_order_value = (sales.revenue_analysis.total_revenue + NEW.total_amount) / (sales.revenue_analysis.total_orders + 1),
            updated_at = CURRENT_TIMESTAMP;

        -- Insert revenue details
        INSERT INTO sales.revenue_details (
            analysis_id,
            product_id,
            quantity_sold,
            revenue,
            cost,
            profit
        )
        SELECT 
            ra.analysis_id,
            soi.product_id,
            soi.quantity,
            soi.total_price,
            soi.quantity * soi.unit_price * 0.7,
            soi.total_price - (soi.quantity * soi.unit_price * 0.7)
        FROM sales.revenue_analysis ra
        JOIN sales.sales_order_items soi ON soi.sales_order_id = NEW.sales_order_id
        WHERE ra.period_type = 'daily' 
        AND ra.start_date = DATE(NEW.created_at)
        AND ra.end_date = DATE(NEW.created_at);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for revenue analysis
CREATE TRIGGER update_revenue_analysis_trigger
AFTER UPDATE ON sales.sales_order
FOR EACH ROW
EXECUTE FUNCTION sales.update_revenue_analysis();

-- ========================
-- NOTIFICATIONS
-- ========================
CREATE TABLE auth.notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES auth.users(user_id),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('order', 'manufacturing', 'inventory', 'system')),
    status VARCHAR(20) CHECK (status IN ('unread', 'read')) DEFAULT 'unread',
    reference_id INTEGER, -- ID of the related entity (order_id, manufacturing_id, etc.)
    reference_type VARCHAR(50), -- Type of the reference (sales_order, manufacturing_progress, etc.)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ
);

-- Index for faster notification queries
CREATE INDEX idx_notifications_user_status ON auth.notifications(user_id, status);
CREATE INDEX idx_notifications_created_at ON auth.notifications(created_at);

-- Function to check stock levels and create notifications
CREATE OR REPLACE FUNCTION inventory.check_stock_levels()
RETURNS TRIGGER AS $$
BEGIN
    -- Check raw materials
    IF TG_TABLE_NAME = 'raw_materials' THEN
        IF NEW.current_stock <= NEW.minimum_stock THEN
            -- Create notification for all admin/manager users
            INSERT INTO auth.notifications (
                user_id,
                title,
                message,
                type,
                reference_id,
                reference_type
            )
            SELECT 
                u.user_id,
                'Low Raw Material Alert',
                format('Raw material "%s" is running low. Current stock: %s %s, Minimum required: %s %s',
                    NEW.material_name,
                    NEW.current_stock,
                    NEW.unit,
                    NEW.minimum_stock,
                    NEW.unit
                ),
                'inventory',
                NEW.material_id,
                'raw_material'
            FROM auth.users u
            WHERE u.role IN ('admin', 'manager');
        END IF;
    END IF;

    -- Check finished products
    IF TG_TABLE_NAME = 'finished_products' THEN
        IF NEW.quantity_available <= NEW.minimum_stock THEN
            -- Create notification for all admin/manager users
            INSERT INTO auth.notifications (
                user_id,
                title,
                message,
                type,
                reference_id,
                reference_type
            )
            SELECT 
                u.user_id,
                'Low Finished Product Alert',
                format('Finished product "%s" is running low. Current stock: %s units, Minimum required: %s units',
                    p.product_name,
                    NEW.quantity_available,
                    NEW.minimum_stock
                ),
                'inventory',
                NEW.finished_product_id,
                'finished_product'
            FROM auth.users u
            CROSS JOIN products.product p
            WHERE u.role IN ('admin', 'manager')
            AND p.product_id = NEW.product_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for stock level checks
CREATE TRIGGER check_raw_materials_stock
AFTER INSERT OR UPDATE ON inventory.raw_materials
FOR EACH ROW
EXECUTE FUNCTION inventory.check_stock_levels();

CREATE TRIGGER check_finished_products_stock
AFTER INSERT OR UPDATE ON inventory.finished_products
FOR EACH ROW
EXECUTE FUNCTION inventory.check_stock_levels();

-- ========================
-- RETURNS TABLE
-- ========================
CREATE TABLE IF NOT EXISTS purchase.returns (
    return_id SERIAL PRIMARY KEY,
    grn_id INTEGER NOT NULL REFERENCES purchase.grns(grn_id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES inventory.raw_materials(material_id),
    quantity_returned DECIMAL(10,2) NOT NULL,
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    processed_at TIMESTAMPTZ,
    processed_by INTEGER REFERENCES auth.users(user_id)
);

-- Add index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_grn_items_qc_status ON purchase.grn_items(qc_status);
CREATE INDEX IF NOT EXISTS idx_grn_items_store_status ON purchase.grn_items(store_status);
CREATE INDEX IF NOT EXISTS idx_returns_status ON purchase.returns(status);

-- Add trigger to prevent duplicate status entries
CREATE OR REPLACE FUNCTION prevent_duplicate_status()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM purchase.purchase_order_status_logs 
        WHERE purchase_order_id = NEW.purchase_order_id 
        AND status = NEW.status 
        AND created_at > NOW() - INTERVAL '1 second'
    ) THEN
        RAISE EXCEPTION 'Duplicate status entry detected';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_duplicate_status_trigger
BEFORE INSERT ON purchase.purchase_order_status_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_duplicate_status();

-- Add trigger to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
DECLARE
    valid_transitions TEXT[] := ARRAY[
        'ordered->arrived',
        'arrived->grn_verified',
        'arrived->returned_to_vendor',
        'grn_verified->qc_in_progress',
        'grn_verified->returned_to_vendor',
        'qc_in_progress->returned_to_vendor',
        'qc_in_progress->in_store',
        'returned_to_vendor->in_store',
        'in_store->completed'
    ];
    transition TEXT;
BEGIN
    transition := OLD.status || '->' || NEW.status;
    IF NOT (transition = ANY(valid_transitions)) THEN
        RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_status_transition_trigger
BEFORE UPDATE OF status ON purchase.purchase_order
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION validate_status_transition();


