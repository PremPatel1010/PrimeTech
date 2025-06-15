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
-- RBAC TABLES
-- ========================

-- Roles table
CREATE TABLE auth.roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE auth.permissions (
    permission_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    route_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping
CREATE TABLE auth.role_permissions (
    role_id INTEGER REFERENCES auth.roles(role_id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES auth.permissions(permission_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- User-Role mapping
CREATE TABLE auth.user_roles (
    user_id INTEGER REFERENCES auth.users(user_id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES auth.roles(role_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    PRIMARY KEY (user_id, role_id)
);

-- User-Permission overrides
CREATE TABLE auth.user_permissions (
    user_id INTEGER REFERENCES auth.users(user_id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES auth.permissions(permission_id) ON DELETE CASCADE,
    is_allowed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(user_id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES auth.users(user_id),
    PRIMARY KEY (user_id, permission_id)
);

-- Insert default system roles
INSERT INTO auth.roles (name, description, is_system_role) VALUES
    ('admin', 'System Administrator with full access', true),
    ('owner', 'Company Owner with full access', true),
    ('sales_manager', 'Sales Department Manager', true),
    ('purchase_manager', 'Purchase Department Manager', true),
    ('inventory_manager', 'Inventory Department Manager', true),
    ('manufacturing_manager', 'Manufacturing Department Manager', true),
    ('department_manager', 'Generic Department Manager', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO auth.permissions (name, description, module, route_path) VALUES
    ('view_dashboard', 'View Dashboard', 'dashboard', '/dashboard'),
    ('view_users', 'View Users List', 'users', '/users'),
    ('create_user', 'Create New User', 'users', '/users/create'),
    ('edit_user', 'Edit User Details', 'users', '/users/edit'),
    ('delete_user', 'Delete User', 'users', '/users/delete'),
    ('manage_roles', 'Manage User Roles', 'users', '/users/roles'),
    ('view_sales', 'View Sales Module', 'sales', '/sales'),
    ('view_sales_orders', 'View Sales Orders', 'sales', '/sales/orders'),
    ('create_sales_order', 'Create Sales Order', 'sales', '/sales/orders/create'),
    ('edit_sales_order', 'Edit Sales Order', 'sales', '/sales/orders/edit'),
    ('delete_sales_order', 'Delete Sales Order', 'sales', '/sales/orders/delete'),
    ('view_purchase', 'View Purchase Module', 'purchase', '/purchase'),
    ('view_purchase_orders', 'View Purchase Orders', 'purchase', '/purchase/orders'),
    ('create_purchase_order', 'Create Purchase Order', 'purchase', '/purchase/orders/create'),
    ('edit_purchase_order', 'Edit Purchase Order', 'purchase', '/purchase/orders/edit'),
    ('delete_purchase_order', 'Delete Purchase Order', 'purchase', '/purchase/orders/delete'),
    ('view_inventory', 'View Inventory Module', 'inventory', '/inventory'),
    ('view_raw_materials', 'View Raw Materials', 'inventory', '/inventory/materials'),
    ('manage_raw_materials', 'Manage Raw Materials', 'inventory', '/inventory/materials/manage'),
    ('view_finished_products', 'View Finished Products', 'inventory', '/inventory/products'),
    ('manage_finished_products', 'Manage Finished Products', 'inventory', '/inventory/products/manage'),
    ('view_manufacturing', 'View Manufacturing Module', 'manufacturing', '/manufacturing'),
    ('view_manufacturing_orders', 'View Manufacturing Orders', 'manufacturing', '/manufacturing/orders'),
    ('create_manufacturing_order', 'Create Manufacturing Order', 'manufacturing', '/manufacturing/orders/create'),
    ('edit_manufacturing_order', 'Edit Manufacturing Order', 'manufacturing', '/manufacturing/orders/edit'),
    ('delete_manufacturing_order', 'Delete Manufacturing Order', 'manufacturing', '/manufacturing/orders/delete'),
    ('view_reports', 'View Reports', 'reports', '/reports'),
    ('view_sales_reports', 'View Sales Reports', 'reports', '/reports/sales'),
    ('view_inventory_reports', 'View Inventory Reports', 'reports', '/reports/inventory'),
    ('view_manufacturing_reports', 'View Manufacturing Reports', 'reports', '/reports/manufacturing'),

    -- Admin Panel Module
    ('view_admin_panel', 'View Admin Panel', 'admin', '/admin'),
    ('manage_permissions', 'Manage System Permissions', 'admin', '/admin/permissions'),
    ('view_audit_logs', 'View Audit Logs', 'admin', '/admin/audit-logs'),
    ('manage_system_settings', 'Manage System Settings', 'admin', '/admin/settings'),
    ('view_user_activity', 'View User Activity', 'admin', '/admin/user-activity'),
    ('manage_backups', 'Manage System Backups', 'admin', '/admin/backups'),

    -- Suppliers Module
    ('view_suppliers', 'View Suppliers List', 'suppliers', '/suppliers'),
    ('create_supplier', 'Create New Supplier', 'suppliers', '/suppliers/create'),
    ('edit_supplier', 'Edit Supplier Details', 'suppliers', '/suppliers/edit'),
    ('delete_supplier', 'Delete Supplier', 'suppliers', '/suppliers/delete'),
    ('view_supplier_history', 'View Supplier History', 'suppliers', '/suppliers/history'),
    ('manage_supplier_ratings', 'Manage Supplier Ratings', 'suppliers', '/suppliers/ratings'),

    -- Products Module
    ('view_products', 'View Products List', 'products', '/products'),
    ('create_product', 'Create New Product', 'products', '/products/create'),
    ('edit_product', 'Edit Product Details', 'products', '/products/edit'),
    ('delete_product', 'Delete Product', 'products', '/products/delete'),
    ('manage_product_categories', 'Manage Product Categories', 'products', '/products/categories'),
    ('view_product_history', 'View Product History', 'products', '/products/history'),
    ('manage_product_pricing', 'Manage Product Pricing', 'products', '/products/pricing'),

    -- Job Work Module
    ('view_jobwork', 'View Job Work Module', 'jobwork', '/jobwork'),
    ('view_vendors', 'View Vendors List', 'jobwork', '/jobwork/vendors'),
    ('create_vendor', 'Create New Vendor', 'jobwork', '/jobwork/vendors/create'),
    ('edit_vendor', 'Edit Vendor Details', 'jobwork', '/jobwork/vendors/edit'),
    ('delete_vendor', 'Delete Vendor', 'jobwork', '/jobwork/vendors/delete'),
    ('view_jobwork_orders', 'View Job Work Orders', 'jobwork', '/jobwork/orders'),
    ('create_jobwork_order', 'Create Job Work Order', 'jobwork', '/jobwork/orders/create'),
    ('edit_jobwork_order', 'Edit Job Work Order', 'jobwork', '/jobwork/orders/edit'),
    ('delete_jobwork_order', 'Delete Job Work Order', 'jobwork', '/jobwork/orders/delete'),
    ('manage_jobwork_status', 'Manage Job Work Status', 'jobwork', '/jobwork/orders/status'),

    -- Company Settings Module
    ('view_company_settings', 'View Company Settings', 'settings', '/settings'),
    ('edit_company_settings', 'Edit Company Settings', 'settings', '/settings/edit'),
    ('manage_company_profile', 'Manage Company Profile', 'settings', '/settings/profile'),
    ('manage_company_documents', 'Manage Company Documents', 'settings', '/settings/documents'),

    -- Notifications Module
    ('view_notifications', 'View Notifications', 'notifications', '/notifications'),
    ('manage_notifications', 'Manage Notifications', 'notifications', '/notifications/manage'),
    ('delete_notifications', 'Delete Notifications', 'notifications', '/notifications/delete'),
    ('mark_notifications_read', 'Mark Notifications as Read', 'notifications', '/notifications/mark-read'),

    -- Revenue Analysis Module
    ('view_revenue_analysis', 'View Revenue Analysis', 'revenue', '/revenue/analysis'),
    ('export_revenue_reports', 'Export Revenue Reports', 'revenue', '/revenue/export'),
    ('view_revenue_details', 'View Revenue Details', 'revenue', '/revenue/details'),
    ('manage_revenue_settings', 'Manage Revenue Settings', 'revenue', '/revenue/settings'),

    -- Raw Materials Module
    ('view_raw_materials_list', 'View Raw Materials List', 'materials', '/materials'),
    ('create_raw_material', 'Create Raw Material', 'materials', '/materials/create'),
    ('edit_raw_material', 'Edit Raw Material', 'materials', '/materials/edit'),
    ('delete_raw_material', 'Delete Raw Material', 'materials', '/materials/delete'),
    ('manage_material_categories', 'Manage Material Categories', 'materials', '/materials/categories'),
    ('view_material_history', 'View Material History', 'materials', '/materials/history'),
    ('manage_material_pricing', 'Manage Material Pricing', 'materials', '/materials/pricing'),

    -- Sub Components Module
    ('view_sub_components', 'View Sub Components', 'components', '/components'),
    ('create_sub_component', 'Create Sub Component', 'components', '/components/create'),
    ('edit_sub_component', 'Edit Sub Component', 'components', '/components/edit'),
    ('delete_sub_component', 'Delete Sub Component', 'components', '/components/delete'),
    ('view_component_transactions', 'View Component Transactions', 'components', '/components/transactions'),
    ('manage_component_stock', 'Manage Component Stock', 'components', '/components/stock'),
    ('view_low_stock_components', 'View Low Stock Components', 'components', '/components/low-stock')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to admin and owner roles (all permissions)
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM auth.roles r
CROSS JOIN auth.permissions p
WHERE r.name IN ('admin', 'owner')
ON CONFLICT DO NOTHING;

-- Assign module-specific permissions to department managers
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM auth.roles r
CROSS JOIN auth.permissions p
WHERE (r.name = 'sales_manager' AND p.module = 'sales')
   OR (r.name = 'purchase_manager' AND p.module = 'purchase')
   OR (r.name = 'inventory_manager' AND p.module = 'inventory')
   OR (r.name = 'manufacturing_manager' AND p.module = 'manufacturing')
ON CONFLICT DO NOTHING;

-- Add dashboard permission to all roles
INSERT INTO auth.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM auth.roles r
CROSS JOIN auth.permissions p
WHERE p.name = 'view_dashboard'
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX idx_role_permissions_role ON auth.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON auth.role_permissions(permission_id);
CREATE INDEX idx_user_roles_user ON auth.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON auth.user_roles(role_id);
CREATE INDEX idx_user_permissions_user ON auth.user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON auth.user_permissions(permission_id);
CREATE INDEX idx_permissions_module ON auth.permissions(module);
CREATE INDEX idx_permissions_route ON auth.permissions(route_path);

-- Function to get user permissions
CREATE OR REPLACE FUNCTION auth.get_user_permissions(p_user_id INTEGER)
RETURNS TABLE (
    permission_id INTEGER,
    name VARCHAR,
    module VARCHAR,
    route_path VARCHAR,
    is_allowed BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH user_roles AS (
        SELECT role_id 
        FROM auth.user_roles 
        WHERE user_id = p_user_id
    ),
    role_perms AS (
        SELECT DISTINCT p.permission_id, p.name, p.module, p.route_path, true as is_allowed
        FROM auth.role_permissions rp
        JOIN auth.permissions p ON p.permission_id = rp.permission_id
        JOIN user_roles ur ON ur.role_id = rp.role_id
    ),
    user_perms AS (
        SELECT p.permission_id, p.name, p.module, p.route_path, up.is_allowed
        FROM auth.user_permissions up
        JOIN auth.permissions p ON p.permission_id = up.permission_id
        WHERE up.user_id = p_user_id
    )
    SELECT 
        COALESCE(up.permission_id, rp.permission_id) as permission_id,
        COALESCE(up.name, rp.name) as name,
        COALESCE(up.module, rp.module) as module,
        COALESCE(up.route_path, rp.route_path) as route_path,
        COALESCE(up.is_allowed, rp.is_allowed) as is_allowed
    FROM role_perms rp
    FULL OUTER JOIN user_perms up ON up.permission_id = rp.permission_id
    WHERE up.permission_id IS NULL OR up.is_allowed = true;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION auth.has_permission(p_user_id INTEGER, p_route_path VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_is_owner BOOLEAN;
    v_has_permission BOOLEAN;
BEGIN
    -- Check if user is admin or owner
    SELECT EXISTS (
        SELECT 1 
        FROM auth.user_roles ur
        JOIN auth.roles r ON r.role_id = ur.role_id
        WHERE ur.user_id = p_user_id 
        AND r.name IN ('admin', 'owner')
    ) INTO v_is_admin;
    
    IF v_is_admin THEN
        RETURN true;
    END IF;
    
    -- Check specific permission
    SELECT EXISTS (
        SELECT 1 
        FROM auth.get_user_permissions(p_user_id) p
        WHERE p.route_path = p_route_path
        AND p.is_allowed = true
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

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
    product_id INTEGER NOT NULL REFERENCES product.products(id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    unit_price DECIMAL(10,2) DEFAULT 0,
    rating_range VARCHAR(255),
    discharge_range VARCHAR(255),
    head_range VARCHAR(255),
    -- total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity_available * unit_price) STORED,
    -- Calculate total_price in application code: total_price = quantity_available * unit_price
    minimum_stock INTEGER NOT NULL DEFAULT 5,
    storage_location VARCHAR(100), -- Optional: rack/bin info
    status VARCHAR(20) CHECK (status IN ('available', 'reserved', 'dispatched')) DEFAULT 'available',
    added_on TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_code VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    rating_range VARCHAR(255),
    discharge_range VARCHAR(255),
    head_range VARCHAR(255),
    category VARCHAR(255),
    version VARCHAR(50),
    final_assembly_time INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    price NUMERIC(10, 2) DEFAULT 0.00
);

-- Manufacturing Steps table
CREATE TABLE product.manufacturing_steps (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES product.products(id) ON DELETE CASCADE,
    sub_component_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_time INTEGER NOT NULL, -- in minutes
    sequence_number INTEGER NOT NULL,
    step_type VARCHAR(50) DEFAULT 'product', -- 'product' or 'sub_component'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sub Components table
CREATE TABLE product.sub_components (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES product.products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_time INTEGER DEFAULT 30, -- in minutes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Component Materials junction table
CREATE TABLE product.component_materials (
    id SERIAL PRIMARY KEY,
    sub_component_id INTEGER REFERENCES product.sub_components(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES inventory.raw_materials(material_id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Product Materials junction table (for direct materials on products)
CREATE TABLE product.product_materials (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES product.products(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES inventory.raw_materials(material_id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Manufacturing Batches table
CREATE TABLE product.manufacturing_batches (
    id SERIAL PRIMARY KEY,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    product_id INTEGER REFERENCES product.products(id) ON DELETE CASCADE,
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
    id SERIAL PRIMARY KEY,
    batch_id INTEGER REFERENCES product.manufacturing_batches(id) ON DELETE CASCADE,
    component_id INTEGER, -- can be sub_component_id or 'final-assembly'
    component_name VARCHAR(255) NOT NULL,
    component_type VARCHAR(50) NOT NULL, -- 'sub-component' or 'final-assembly'
    quantity INTEGER NOT NULL,
    assigned_team VARCHAR(100),
    status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed, on_hold
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER,
    parent_batch_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Workflow Material Consumption table
CREATE TABLE product.workflow_material_consumption (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES product.batch_workflows(id) ON DELETE CASCADE,
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
CREATE INDEX idx_product_materials_product ON product.product_materials(product_id);
CREATE INDEX idx_product_materials_material ON product.product_materials(material_id);
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
    user_id INTEGER REFERENCES auth.users(user_id) ON DELETE CASCADE,
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
                    p.name,
                    NEW.quantity_available,
                    NEW.minimum_stock
                ),
                'inventory',
                NEW.finished_product_id,
                'finished_product'
            FROM auth.users u
            CROSS JOIN product.products p
            WHERE u.role IN ('admin', 'manager')
            AND p.id = NEW.product_id;
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

-- Notification function
CREATE OR REPLACE FUNCTION auth.create_notification(p_user_id INTEGER, p_title VARCHAR(100), p_message TEXT, p_type VARCHAR(50), p_reference_id INTEGER DEFAULT NULL, p_reference_type VARCHAR(50) DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    INSERT INTO auth.notifications (user_id, title, message, type, reference_id, reference_type)
    VALUES (p_user_id, p_title, p_message, p_type, p_reference_id, p_reference_type);

    -- Optional: Add specific logic based on notification type
    CASE p_type
        WHEN 'new_sales_order' THEN
            -- Logic for new sales order notification
            RAISE NOTICE 'New sales order notification created for user %: %', p_user_id, p_message;
        WHEN 'low_stock' THEN
            -- Logic for low stock notification
            RAISE NOTICE 'Low stock notification created for user %: %', p_user_id, p_message;
        -- Add more cases as needed
        ELSE
            RAISE NOTICE 'General notification created for user %: %', p_user_id, p_message;
    END CASE;
END;
$$
LANGUAGE plpgsql;



