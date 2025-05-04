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
-- USERS TABLE
-- ========================
CREATE TABLE auth.users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager')),
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
    status VARCHAR(20) CHECK (status IN ('inward', 'qc_inward', 'storage')) DEFAULT 'inward',
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory.finished_products (
    finished_product_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products.product(product_id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL DEFAULT 0,
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales.sales_order_items (
    item_id SERIAL PRIMARY KEY,
    sales_order_id INTEGER NOT NULL REFERENCES sales.sales_order(sales_order_id) ON DELETE CASCADE,
    product_category VARCHAR(100),
    product_id INTEGER REFERENCES products.product(product_id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ========================
-- PURCHASE ORDER (for Raw Materials)
-- ========================
CREATE TABLE purchase.purchase_order (
    purchase_order_id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE NOT NULL,
    supplier_id INTEGER REFERENCES purchase.suppliers(supplier_id) ON DELETE SET NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'received', 'cancelled')) DEFAULT 'pending',
    payment_details TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase.purchase_order_items (
    item_id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER REFERENCES purchase.purchase_order(purchase_order_id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES inventory.raw_materials(material_id),
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE purchase.suppliers (
    supplier_id SERIAL PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    gst_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ========================
-- MANUFACTURING STAGES
-- ========================
CREATE TABLE manufacturing.stages (
    stage_id SERIAL PRIMARY KEY,
    component_type VARCHAR(20) CHECK (component_type IN ('motor', 'pump', 'combined')),
    stage_name VARCHAR(100) NOT NULL,
    sequence INTEGER NOT NULL
);

CREATE TABLE manufacturing.product_manufacturing (
    tracking_id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products.product(product_id) ON DELETE CASCADE,
    current_stage_id INTEGER REFERENCES manufacturing.stages(stage_id),
    quantity_in_process INTEGER DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


