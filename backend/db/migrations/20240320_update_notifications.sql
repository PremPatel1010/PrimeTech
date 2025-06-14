-- Add new columns to notifications table
ALTER TABLE auth.notifications
ADD COLUMN IF NOT EXISTS link VARCHAR(255),
ADD COLUMN IF NOT EXISTS module VARCHAR(50),
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON auth.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_module ON auth.notifications(module);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON auth.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON auth.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON auth.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON auth.notifications(status);

-- Add check constraints
ALTER TABLE auth.notifications
ADD CONSTRAINT chk_notifications_priority 
CHECK (priority IN ('high', 'normal', 'low'));

ALTER TABLE auth.notifications
ADD CONSTRAINT chk_notifications_module 
CHECK (module IN ('purchase', 'sales', 'manufacturing', 'inventory', 'admin'));

-- Update existing notifications to have default values
UPDATE auth.notifications
SET 
  module = CASE 
    WHEN type LIKE 'purchase%' THEN 'purchase'
    WHEN type LIKE 'sales%' THEN 'sales'
    WHEN type LIKE 'manufacturing%' THEN 'manufacturing'
    WHEN type LIKE 'inventory%' THEN 'inventory'
    ELSE 'admin'
  END,
  priority = CASE
    WHEN type IN ('qc_failed', 'stock_low', 'order_cancelled') THEN 'high'
    ELSE 'normal'
  END
WHERE module IS NULL;

-- Add comment to table
COMMENT ON TABLE auth.notifications IS 'Stores system notifications for users with enhanced features including targeting, priority, and module categorization'; 