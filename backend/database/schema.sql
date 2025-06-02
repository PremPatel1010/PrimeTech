-- ========================
-- SCHEMAS
-- ========================
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS sales;
CREATE SCHEMA IF NOT EXISTS purchase;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS manufacturing;
CREATE SCHEMA IF NOT EXISTS product;

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

-- Purchase Orders table
CREATE TABLE purchase.purchase_orders (
    po_id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    date DATE NOT NULL,
    supplier_id INTEGER NOT NULL REFERENCES purchase.suppliers(supplier_id),
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'ordered', 'arrived', 'grn_verified', 'qc_in_progress', 
        'returned_to_vendor', 'completed'
    )),
    gst_percent DECIMAL(5,2) NOT NULL,
    discount_percent DECIMAL(5,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Items table
CREATE TABLE purchase.po_items (
    item_id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES purchase.purchase_orders(po_id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES inventory.raw_materials(material_id),
    quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- GRN (Goods Receipt Note) table
CREATE TABLE purchase.grns (
    grn_id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL REFERENCES purchase.purchase_orders(po_id) ON DELETE CASCADE,
    grn_number VARCHAR(50) NOT NULL UNIQUE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'qc_completed')),
    remarks TEXT,
    grn_type VARCHAR(50) NOT NULL CHECK (grn_type IN ('initial', 'replacement')),
    replacement_for INTEGER REFERENCES purchase.grns(grn_id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- GRN Materials table
CREATE TABLE purchase.grn_materials (
    grn_material_id SERIAL PRIMARY KEY,
    grn_id INTEGER NOT NULL REFERENCES purchase.grns(grn_id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES inventory.raw_materials(material_id),
    ordered_qty DECIMAL(12,2) NOT NULL,
    received_qty DECIMAL(12,2) NOT NULL,
    qc_status VARCHAR(50) CHECK (qc_status IN ('pending', 'completed')),
    accepted_qty DECIMAL(12,2),
    defective_qty DECIMAL(12,2),
    qc_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);



-- Products table

CREATE TABLE product.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    rating_range VARCHAR(100),
    discharge_range VARCHAR(100),
    head_range VARCHAR(100),
    category VARCHAR(100),
    version VARCHAR(50) DEFAULT '1.0',
    final_assembly_time INTEGER DEFAULT 60, -- in minutes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Manufacturing Steps table
CREATE TABLE product.manufacturing_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES product.products(id) ON DELETE CASCADE,
    sub_component_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_time INTEGER NOT NULL, -- in minutes
    sequence_number INTEGER NOT NULL,
    step_type VARCHAR(50) DEFAULT 'product', -- 'product' or 'sub_component'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sub Components table
CREATE TABLE product.sub_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES product.products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_time INTEGER DEFAULT 30, -- in minutes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Component Materials junction table
CREATE TABLE product.component_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_component_id UUID REFERENCES product.sub_components(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES inventory.raw_materials(material_id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Manufacturing Batches table
CREATE TABLE product.manufacturing_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    product_id UUID REFERENCES product.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'planning', -- planning, in_progress, completed, cancelled
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
    created_date TIMESTAMP DEFAULT NOW(),
    target_completion_date TIMESTAMP,
    actual_completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Batch Workflows table
CREATE TABLE product.batch_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES product.manufacturing_batches(id) ON DELETE CASCADE,
    component_id UUID, -- can be sub_component_id or 'final-assembly'
    component_name VARCHAR(255) NOT NULL,
    component_type VARCHAR(50) NOT NULL, -- 'sub-component' or 'final-assembly'
    quantity INTEGER NOT NULL,
    assigned_team VARCHAR(100),
    status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed, on_hold
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER,
    parent_batch_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Material Consumption table
CREATE TABLE product.workflow_material_consumption (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES product.batch_workflows(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES inventory.raw_materials(material_id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    quantity_consumed DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_products_code ON product.products(product_code);
CREATE INDEX idx_products_category ON product.products(category);
CREATE INDEX idx_sub_components_product ON product.sub_components(product_id);
CREATE INDEX idx_component_materials_sub_component ON product.component_materials(sub_component_id);
CREATE INDEX idx_component_materials_material ON product.component_materials(material_id);
CREATE INDEX idx_manufacturing_steps_product ON product.manufacturing_steps(product_id);
CREATE INDEX idx_manufacturing_steps_sub_component ON product.manufacturing_steps(sub_component_id);
CREATE INDEX idx_batches_product ON product.manufacturing_batches(product_id);
CREATE INDEX idx_batches_status ON product.manufacturing_batches(status);
CREATE INDEX idx_workflows_batch ON product.batch_workflows(batch_id);
CREATE INDEX idx_workflows_status ON product.batch_workflows(status);

-- Triggers for updated_at timestamps



-- Indexes for better query performance
CREATE INDEX idx_po_supplier ON purchase.purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase.purchase_orders(status);
CREATE INDEX idx_po_items_po ON purchase.po_items(po_id);
CREATE INDEX idx_po_items_material ON purchase.po_items(material_id);
CREATE INDEX idx_grns_po ON purchase.grns(po_id);
CREATE INDEX idx_grn_materials_grn ON purchase.grn_materials(grn_id);
CREATE INDEX idx_grn_materials_material ON purchase.grn_materials(material_id);

-- Trigger to update updated_at timestamp for purchase order tables
CREATE OR REPLACE FUNCTION purchase.update_purchase_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all purchase order tables
CREATE TRIGGER update_purchase_orders_timestamp
    BEFORE UPDATE ON purchase.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION purchase.update_purchase_timestamp();

CREATE TRIGGER update_po_items_timestamp
    BEFORE UPDATE ON purchase.po_items
    FOR EACH ROW
    EXECUTE FUNCTION purchase.update_purchase_timestamp();

CREATE TRIGGER update_grns_timestamp
    BEFORE UPDATE ON purchase.grns
    FOR EACH ROW
    EXECUTE FUNCTION purchase.update_purchase_timestamp();

CREATE TRIGGER update_grn_materials_timestamp
    BEFORE UPDATE ON purchase.grn_materials
    FOR EACH ROW
    EXECUTE FUNCTION purchase.update_purchase_timestamp();

-- Function to update raw material stock when GRN is QC completed
CREATE OR REPLACE FUNCTION purchase.update_material_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update stock when QC is completed and accepted quantity changes
    IF NEW.qc_status = 'completed' AND 
       (OLD.qc_status IS DISTINCT FROM 'completed') AND
       NEW.accepted_qty > 0 THEN
        
        -- Update raw material stock
        UPDATE inventory.raw_materials
        SET current_stock = current_stock + NEW.accepted_qty,
            updated_at = CURRENT_TIMESTAMP
        WHERE material_id = NEW.material_id;

        -- Create notification for stock update
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
            'Material Stock Updated',
            format('Stock updated for material "%s" via GRN %s. Added quantity: %s %s',
                rm.material_name,
                g.grn_number,
                NEW.accepted_qty,
                rm.unit
            ),
            'inventory',
            NEW.material_id,
            'raw_material'
        FROM auth.users u
        CROSS JOIN purchase.grns g
        CROSS JOIN inventory.raw_materials rm
        WHERE u.role IN ('admin', 'manager')
        AND g.grn_id = NEW.grn_id
        AND rm.material_id = NEW.material_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for material stock update
CREATE TRIGGER update_material_stock_trigger
    AFTER UPDATE ON purchase.grn_materials
    FOR EACH ROW
    EXECUTE FUNCTION purchase.update_material_stock();

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



CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON product.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_components_updated_at BEFORE UPDATE ON product.sub_components
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_raw_materials_updated_at BEFORE UPDATE ON inventory.raw_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON product.manufacturing_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON product.batch_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

