-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

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

-- CreateTable
CREATE TABLE "daily_stock_prices" (
    "ticker" VARCHAR(20) NOT NULL,
    "date" DATE NOT NULL,
    "open" DECIMAL(10,2) NOT NULL,
    "high" DECIMAL(10,2) NOT NULL,
    "low" DECIMAL(10,2) NOT NULL,
    "close" DECIMAL(10,2) NOT NULL,
    "volume" BIGINT NOT NULL,
    "change" DECIMAL(5,2),

    CONSTRAINT "daily_stock_prices_pkey" PRIMARY KEY ("ticker","date")
);

-- CreateIndex
CREATE UNIQUE INDEX "assets_ticker_key" ON "assets"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "cash_accounts_type_key" ON "cash_accounts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_date_key" ON "daily_reports"("date");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_ticker_key" ON "watchlist"("ticker");

-- CreateIndex
CREATE INDEX "daily_stock_prices_date_idx" ON "daily_stock_prices"("date");

