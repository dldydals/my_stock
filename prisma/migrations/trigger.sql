-- Function to update assets and cash based on transactions with Lot Tracking
CREATE OR REPLACE FUNCTION sync_asset_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
    v_total_qty INTEGER := 0;
    v_total_cost NUMERIC := 0;
    v_new_avg_price NUMERIC := 0;
    v_cash_change NUMERIC := 0;
    v_parent_price NUMERIC := 0;
    v_parent_fee NUMERIC := 0;
    v_parent_qty INTEGER := 0;
BEGIN
    -- 1. Handle Transaction-specific adjustments
    IF (NEW.type = 'BUY') THEN
        -- Initialize remaining_quantity for BUY transactions
        UPDATE transactions SET remaining_quantity = NEW.quantity WHERE id = NEW.id;
        v_cash_change := -((NEW.quantity * NEW.price) + COALESCE(NEW.fee, 0));
    
    ELSIF (NEW.type = 'SELL') THEN
        v_cash_change := (NEW.quantity * NEW.price) - COALESCE(NEW.fee, 0);
        
        -- If a parent transaction is specified (Lot Tracking)
        IF NEW.parent_transaction_id IS NOT NULL THEN
            -- Deduct from the specific BUY lot
            UPDATE transactions 
            SET remaining_quantity = remaining_quantity - NEW.quantity 
            WHERE id = NEW.parent_transaction_id;
            
            -- Calculate Realized Profit for this SELL
            -- Realized Profit = Sell Revenue - (Buy Cost Pro-rata) - Total Fees(Buy pro-rata + Sell total)
            SELECT price, fee, quantity INTO v_parent_price, v_parent_fee, v_parent_qty
            FROM transactions WHERE id = NEW.parent_transaction_id;
            
            UPDATE transactions
            SET realized_profit = (NEW.quantity * NEW.price - NEW.fee) -- Net Sell
                                 - (NEW.quantity * v_parent_price + (NEW.quantity::numeric / v_parent_qty::numeric) * v_parent_fee) -- Net Buy Cost
            WHERE id = NEW.id;
        END IF;
    END IF;
 
    -- 2. Recalculate Asset Summary (Total Qty & Avg Price based on remaining lots)
    -- Important: Avg Price = Sum of (Remaining Qty * Purchase Price + Pro-rata Buy Fee) / Total Remaining Qty
    SELECT 
        SUM(remaining_quantity),
        SUM(remaining_quantity * price + (remaining_quantity::numeric / quantity::numeric) * COALESCE(fee, 0))
    INTO v_total_qty, v_total_cost
    FROM transactions
    WHERE ticker = NEW.ticker AND type = 'BUY' AND remaining_quantity > 0;

    IF v_total_qty IS NOT NULL AND v_total_qty > 0 THEN
        v_new_avg_price := v_total_cost / v_total_qty;
        
        INSERT INTO assets (ticker, name, quantity, avg_price, current_price, updated_at)
        VALUES (NEW.ticker, NEW.name, v_total_qty, v_new_avg_price, NEW.price, NOW())
        ON CONFLICT (ticker) DO UPDATE
        SET quantity = v_total_qty,
            avg_price = v_new_avg_price,
            current_price = CASE WHEN NEW.type = 'BUY' THEN NEW.price ELSE assets.current_price END,
            updated_at = NOW();
    ELSE
        UPDATE assets SET quantity = 0, avg_price = 0, updated_at = NOW() WHERE ticker = NEW.ticker;
    END IF;

    -- 3. Sync Cash Balance
    INSERT INTO cash_accounts (type, balance, updated_at)
    VALUES ('DEPOSIT', v_cash_change, NOW())
    ON CONFLICT (type) DO UPDATE
    SET balance = cash_accounts.balance + v_cash_change,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set up the trigger
DROP TRIGGER IF EXISTS trg_sync_asset_on_transaction ON transactions;
CREATE TRIGGER trg_sync_asset_on_transaction
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION sync_asset_on_transaction();
