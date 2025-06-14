-- Function to create notifications
CREATE OR REPLACE FUNCTION auth.create_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_message TEXT;
    notification_type TEXT;
    notification_priority TEXT;
    notification_ref_id INTEGER;
    notification_ref_type TEXT;
BEGIN
    -- Set default values
    notification_priority := 'normal';
    notification_ref_id := NULL;
    notification_ref_type := TG_TABLE_NAME;

    -- Handle different tables and operations
    CASE TG_TABLE_NAME
        -- Purchase Module Triggers
        WHEN 'purchase_orders' THEN
            notification_ref_id := NEW.po_id;
            CASE TG_OP
                WHEN 'INSERT' THEN
                    notification_title := 'New Purchase Order Created';
                    notification_message := 'Purchase Order #' || NEW.po_number || ' has been created';
                    notification_type := 'order';
                WHEN 'UPDATE' THEN
                    IF NEW.status != OLD.status THEN
                        notification_title := 'Purchase Order Status Updated';
                        notification_message := 'Purchase Order #' || NEW.po_number || ' status changed to ' || NEW.status;
                        notification_type := 'order';
                        IF NEW.status IN ('arrived', 'returned_to_vendor') THEN
                            notification_priority := 'high';
                        END IF;
                    END IF;
            END CASE;
            IF notification_title IS NOT NULL THEN
                INSERT INTO auth.notifications (user_id, title, message, type, status, reference_id, reference_type, created_at, priority)
                SELECT user_id, notification_title, notification_message, notification_type, 'unread', notification_ref_id, notification_ref_type, CURRENT_TIMESTAMP, notification_priority
                FROM auth.users WHERE role IN ('purchase_manager', 'admin', 'owner');
            END IF;

        -- Sales Module Triggers
        WHEN 'sales_order' THEN
            notification_ref_id := NEW.sales_order_id;
            CASE TG_OP
                WHEN 'INSERT' THEN
                    notification_title := 'New Sales Order Created';
                    notification_message := 'Sales Order #' || NEW.order_number || ' has been created';
                    notification_type := 'order';
                    notification_priority := 'normal';
                WHEN 'UPDATE' THEN
                    IF NEW.status != OLD.status THEN
                        notification_title := 'Sales Order Status Updated';
                        notification_message := 'Sales Order #' || NEW.order_number || ' status changed to ' || NEW.status;
                        notification_type := 'order';
                        IF NEW.status IN ('completed', 'cancelled') THEN
                            notification_priority := 'high';
                        END IF;
                    END IF;
            END CASE;
            
            IF notification_title IS NOT NULL THEN
                INSERT INTO auth.notifications (user_id, title, message, type, status, reference_id, reference_type, created_at, priority)
                SELECT user_id, notification_title, notification_message, notification_type, 'unread', notification_ref_id, notification_ref_type, CURRENT_TIMESTAMP, notification_priority
                FROM auth.users WHERE role IN ('sales_manager', 'admin', 'owner');
            END IF;

        -- Manufacturing Module Triggers (product.manufacturing_batches)
        WHEN 'manufacturing_batches' THEN
            notification_ref_id := NEW.id;
            CASE TG_OP
                WHEN 'INSERT' THEN
                    notification_title := 'New Manufacturing Batch Created';
                    notification_message := 'Manufacturing Batch #' || NEW.batch_number || ' has been created';
                    notification_type := 'manufacturing';
                WHEN 'UPDATE' THEN
                    IF NEW.status != OLD.status THEN
                        notification_title := 'Manufacturing Batch Status Updated';
                        notification_message := 'Manufacturing Batch #' || NEW.batch_number || ' status changed to ' || NEW.status;
                        notification_type := 'manufacturing';
                        IF NEW.status IN ('completed', 'cancelled') THEN
                            notification_priority := 'high';
                        END IF;
                    END IF;
            END CASE;
            IF notification_title IS NOT NULL THEN
                INSERT INTO auth.notifications (user_id, title, message, type, status, reference_id, reference_type, created_at, priority)
                SELECT user_id, notification_title, notification_message, notification_type, 'unread', notification_ref_id, notification_ref_type, CURRENT_TIMESTAMP, notification_priority
                FROM auth.users WHERE role IN ('manufacturing_manager', 'admin', 'owner');
            END IF;

        -- Workflow Steps Triggers (manufacturing.workflow_steps)
        WHEN 'workflow_steps' THEN
            notification_ref_id := NEW.workflow_step_id;
            CASE TG_OP
                WHEN 'UPDATE' THEN
                    IF NEW.status != OLD.status THEN
                        SELECT 
                            'Workflow Step Status Updated',
                            format('Step "%s" for Batch #%s status changed to %s',
                                s.step_name,
                                w.batch_number,
                                NEW.status
                            ),
                            'manufacturing'
                        INTO notification_title, notification_message, notification_type
                        FROM manufacturing.steps s
                        JOIN product.batch_workflows wf ON wf.id = NEW.workflow_id
                        JOIN product.manufacturing_batches w ON w.id = wf.batch_id
                        WHERE s.step_id = NEW.step_id;

                        IF NEW.status = 'completed' THEN
                            notification_priority := 'high';
                        END IF;
                    END IF;
            END CASE;
            IF notification_title IS NOT NULL THEN
                INSERT INTO auth.notifications (user_id, title, message, type, status, reference_id, reference_type, created_at, priority)
                SELECT user_id, notification_title, notification_message, notification_type, 'unread', notification_ref_id, notification_ref_type, CURRENT_TIMESTAMP, notification_priority
                FROM auth.users WHERE role IN ('manufacturing_manager', 'admin', 'owner');
            END IF;

        -- Inventory Module Triggers (inventory.raw_materials)
        WHEN 'raw_materials' THEN
            notification_ref_id := NEW.material_id;
            CASE TG_OP
                WHEN 'UPDATE' THEN
                    IF NEW.current_stock != OLD.current_stock THEN
                        notification_title := 'Raw Material Stock Updated';
                        notification_message := format('Stock level for "%s" updated to %s %s',
                            NEW.material_name,
                            NEW.current_stock,
                            NEW.unit
                        );
                        notification_type := 'inventory';
                        
                        IF NEW.current_stock <= NEW.minimum_stock THEN
                            notification_priority := 'high';
                            notification_message := notification_message || ' - Low Stock Alert!';
                        END IF;
                    END IF;
            END CASE;
            IF notification_title IS NOT NULL THEN
                INSERT INTO auth.notifications (user_id, title, message, type, status, reference_id, reference_type, created_at, priority)
                SELECT user_id, notification_title, notification_message, notification_type, 'unread', notification_ref_id, notification_ref_type, CURRENT_TIMESTAMP, notification_priority
                FROM auth.users WHERE role IN ('inventory_manager', 'admin', 'owner');
            END IF;

        -- Inventory Module Triggers (inventory.finished_products)
        WHEN 'finished_products' THEN
            notification_ref_id := NEW.finished_product_id;
            CASE TG_OP
                WHEN 'UPDATE' THEN
                    IF NEW.quantity_available != OLD.quantity_available THEN
                        SELECT 
                            'Finished Product Stock Updated',
                            format('Stock level for product "%s" updated to %s units',
                                p.name,
                                NEW.quantity_available
                            ),
                            'inventory'
                        INTO notification_title, notification_message, notification_type
                        FROM product.products p
                        WHERE p.id = NEW.product_id;

                        IF NEW.quantity_available <= NEW.minimum_stock THEN
                            notification_priority := 'high';
                            notification_message := notification_message || ' - Low Stock Alert!';
                        END IF;
                    END IF;
            END CASE;
            IF notification_title IS NOT NULL THEN
                INSERT INTO auth.notifications (user_id, title, message, type, status, reference_id, reference_type, created_at, priority)
                SELECT user_id, notification_title, notification_message, notification_type, 'unread', notification_ref_id, notification_ref_type, CURRENT_TIMESTAMP, notification_priority
                FROM auth.users WHERE role IN ('inventory_manager', 'admin', 'owner');
            END IF;

        -- GRN Module Triggers (purchase.grn_materials)
        WHEN 'grn_materials' THEN
            notification_ref_id := NEW.grn_material_id;
            CASE TG_OP
                WHEN 'UPDATE' THEN
                    IF NEW.qc_status != OLD.qc_status AND NEW.qc_status = 'completed' THEN
                        SELECT 
                            'GRN Quality Check Completed',
                            format('Quality check completed for material "%s" in GRN #%s. Accepted: %s %s, Defective: %s %s',
                                rm.material_name,
                                g.grn_number,
                                NEW.accepted_qty,
                                rm.unit,
                                NEW.defective_qty,
                                rm.unit
                            ),
                            'inventory'
                        INTO notification_title, notification_message, notification_type
                        FROM inventory.raw_materials rm
                        JOIN purchase.grns g ON g.grn_id = NEW.grn_id
                        WHERE rm.material_id = NEW.material_id;

                        IF NEW.defective_qty > 0 THEN
                            notification_priority := 'high';
                        END IF;
                    END IF;
            END CASE;
            IF notification_title IS NOT NULL THEN
                INSERT INTO auth.notifications (user_id, title, message, type, status, reference_id, reference_type, created_at, priority)
                SELECT user_id, notification_title, notification_message, notification_type, 'unread', notification_ref_id, notification_ref_type, CURRENT_TIMESTAMP, notification_priority
                FROM auth.users WHERE role IN ('purchase_manager', 'inventory_manager', 'admin', 'owner');
            END IF;

    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
CREATE TRIGGER purchase_order_notification_trigger
    AFTER INSERT OR UPDATE ON purchase.purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION auth.create_notification();

CREATE TRIGGER sales_order_notification_trigger
    AFTER INSERT OR UPDATE ON sales.sales_order
    FOR EACH ROW
    EXECUTE FUNCTION auth.create_notification();

CREATE TRIGGER manufacturing_batch_notification_trigger
    AFTER INSERT OR UPDATE ON product.manufacturing_batches
    FOR EACH ROW
    EXECUTE FUNCTION auth.create_notification();

CREATE TRIGGER workflow_step_notification_trigger
    AFTER UPDATE ON manufacturing.workflow_steps
    FOR EACH ROW
    EXECUTE FUNCTION auth.create_notification();

CREATE TRIGGER raw_material_notification_trigger
    AFTER UPDATE ON inventory.raw_materials
    FOR EACH ROW
    EXECUTE FUNCTION auth.create_notification();

CREATE TRIGGER finished_product_notification_trigger
    AFTER UPDATE ON inventory.finished_products
    FOR EACH ROW
    EXECUTE FUNCTION auth.create_notification();

CREATE TRIGGER grn_material_notification_trigger
    AFTER UPDATE ON purchase.grn_materials
    FOR EACH ROW
    EXECUTE FUNCTION auth.create_notification();

-- Add comment to explain the triggers
COMMENT ON FUNCTION auth.create_notification() IS 'Creates notifications for various system events across different modules'; 