-- Drop the existing trigger function
DROP FUNCTION IF EXISTS auth.create_notification();

-- Recreate the trigger function with the correct column name and null handling
CREATE OR REPLACE FUNCTION auth.create_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_ref_id INTEGER;
    notification_type VARCHAR(50);
    notification_title VARCHAR(100);
    notification_message TEXT;
    notification_module VARCHAR(50);
    notification_priority VARCHAR(20);
    notification_user_id INTEGER;
BEGIN
    -- Set notification type and message based on the table and operation
    IF TG_TABLE_NAME = 'sales_order' THEN
        notification_ref_id := NEW.sales_order_id;
        notification_module := 'sales';
        notification_user_id := COALESCE(NEW.created_by, 1); -- Default to user ID 1 if created_by is null
        
        IF TG_OP = 'INSERT' THEN
            notification_type := 'order';
            notification_title := 'New Sales Order Created';
            notification_message := 'New sales order ' || NEW.order_number || ' has been created';
            notification_priority := 'normal';
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.status != OLD.status THEN
                notification_type := 'order';
                notification_title := 'Sales Order Status Updated';
                notification_message := 'Sales order ' || NEW.order_number || ' status changed to ' || NEW.status;
                notification_priority := CASE 
                    WHEN NEW.status = 'cancelled' THEN 'high'
                    ELSE 'normal'
                END;
            END IF;
        END IF;
    END IF;

    -- Insert the notification if we have a type
    IF notification_type IS NOT NULL THEN
        INSERT INTO auth.notifications (
            user_id,
            title,
            type,
            message,
            module,
            priority,
            reference_type,
            reference_id,
            link
        ) VALUES (
            notification_user_id,
            notification_title,
            notification_type,
            notification_message,
            notification_module,
            notification_priority,
            TG_TABLE_NAME,
            notification_ref_id,
            '/sales/orders/' || notification_ref_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER create_sales_order_notification
    AFTER INSERT OR UPDATE ON sales.sales_order
    FOR EACH ROW
    EXECUTE FUNCTION auth.create_notification(); 