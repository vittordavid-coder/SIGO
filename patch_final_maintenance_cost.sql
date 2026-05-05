-- Upgrade script for Maintenance Cost and Equipment Tracking in Purchases

-- Add total_cost to equipment_maintenance
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='equipment_maintenance' AND column_name='total_cost') THEN
        ALTER TABLE equipment_maintenance ADD COLUMN total_cost NUMERIC DEFAULT 0;
    END IF;
END $$;

-- Add equipment_id to purchase_requests
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_requests' AND column_name='equipment_id') THEN
        ALTER TABLE purchase_requests ADD COLUMN equipment_id TEXT;
    END IF;
END $$;

-- Add equipment_id to purchase_order_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchase_order_items' AND column_name='equipment_id') THEN
        ALTER TABLE purchase_order_items ADD COLUMN equipment_id TEXT;
    END IF;
END $$;
