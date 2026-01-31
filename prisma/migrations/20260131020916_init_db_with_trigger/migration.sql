-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "avg_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "current_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trade_date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "parent_transaction_id" INTEGER,
    "realized_profit" DOUBLE PRECISION,
    "remaining_quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dividends" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "received_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dividends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_accounts" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_ticker_key" ON "assets"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "cash_accounts_type_key" ON "cash_accounts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_date_key" ON "daily_reports"("date");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_ticker_key" ON "watchlist"("ticker");

-- migration.sql 파일 맨 끝에 붙여넣기

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
        UPDATE transactions SET remaining_quantity = NEW.quantity WHERE id = NEW.id;
        v_cash_change := -((NEW.quantity * NEW.price) + COALESCE(NEW.fee, 0));
    
    ELSIF (NEW.type = 'SELL') THEN
        v_cash_change := (NEW.quantity * NEW.price) - COALESCE(NEW.fee, 0);
        
        IF NEW.parent_transaction_id IS NOT NULL THEN
            UPDATE transactions 
            SET remaining_quantity = remaining_quantity - NEW.quantity 
            WHERE id = NEW.parent_transaction_id;
            
            SELECT price, fee, quantity INTO v_parent_price, v_parent_fee, v_parent_qty
            FROM transactions WHERE id = NEW.parent_transaction_id;
            
            UPDATE transactions
            SET realized_profit = (NEW.quantity * NEW.price - NEW.fee) 
                                 - (NEW.quantity * v_parent_price + (NEW.quantity::numeric / v_parent_qty::numeric) * v_parent_fee)
            WHERE id = NEW.id;
        END IF;
    END IF;
 
    -- 2. Recalculate Asset Summary
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