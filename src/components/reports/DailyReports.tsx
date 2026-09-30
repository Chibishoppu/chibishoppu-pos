import React, { useState, useMemo } from 'react';
import {
  Typography,
  Button,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  TrendingUp as RevenueIcon,
  ShoppingBag as UnitsIcon,
  Receipt as OrdersIcon,
  AttachMoney as ProfitIcon,
  Download as ExportIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  Undo as RefundIcon,
} from '@mui/icons-material';
import {
  Transaction,
  EventConfig,
  RefundItemDetail,
} from '../../types';
import { formatCurrency, exportTransactionsToCSV } from '../../utils/export';
import { CATEGORY_META } from '../../data/categories';
import { ZReportPrintModal } from './ZReportPrintModal';
import { ReceiptModal } from '../pos/ReceiptModal';
const officialLogo = `${import.meta.env.BASE_URL}ChibishoppuLogo2.jpeg`;
import { soundEngine } from '../../utils/audio';

interface DailyReportsProps {
  transactions: Transaction[];
  eventConfig: EventConfig;
  onRefundTransaction: (transactionId: string, refundDetails: RefundItemDetail[], reason: string) => void;
}

export const DailyReports: React.FC<DailyReportsProps> = ({
  transactions,
  eventConfig,
  onRefundTransaction,
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<number>(0);
  const [searchTxQuery, setSearchTxQuery] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // Modal states
  const [isZReportOpen, setIsZReportOpen] = useState<boolean>(false);
  const [viewingReceipt, setViewingReceipt] = useState<Transaction | null>(null);
  const [refundCandidate, setRefundCandidate] = useState<Transaction | null>(null);
  const [refundDefects, setRefundDefects] = useState<Record<string, number>>({});
  const [refundReason, setRefundReason] = useState<string>('');

  // Cash count drawer calculation state
  const [countedActualCash, setCountedActualCash] = useState<string>('');

  // 1. Calculate Daily Analytics
  const activeTransactions = useMemo(() => {
    return transactions.filter((t) => t.status === 'completed');
  }, [transactions]);

  const refundedTransactions = useMemo(() => {
    return transactions.filter((t) => t.status === 'refunded');
  }, [transactions]);

  const totalGrossRevenue = activeTransactions.reduce((s, t) => s + t.total, 0);
  const totalCostOfGoods = activeTransactions.reduce((s, t) => s + t.totalCost, 0);
  const totalDiscountsGiven = activeTransactions.reduce((s, t) => s + t.discountAmount, 0);
  const totalNetProfit = totalGrossRevenue - totalCostOfGoods;
  const totalUnitsSold = activeTransactions.reduce(
    (sum, t) => sum + t.items.reduce((iSum, item) => iSum + item.quantity, 0),
    0
  );
  const averageOrderValue = activeTransactions.length > 0 ? totalGrossRevenue / activeTransactions.length : 0;

  // 2. Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    let cash = 0;
    let qr = 0;
    let card = 0;

    activeTransactions.forEach((t) => {
      if (t.paymentMethod === 'cash') {
        cash += t.total;
      } else if (t.paymentMethod === 'qr_pay') {
        qr += t.total;
      } else if (t.paymentMethod === 'card') {
        card += t.total;
      } else if (t.paymentMethod === 'split' && t.splitDetail) {
        cash += t.splitDetail.cashAmount;
        if (t.splitDetail.electronicMethod === 'qr_pay') {
          qr += t.splitDetail.electronicAmount;
        } else {
          card += t.splitDetail.electronicAmount;
        }
      }
    });

    return { cash, qr, card };
  }, [activeTransactions]);

  // Expected Cash in Register Box
  const expectedCashInDrawer = eventConfig.openingCashFloat + paymentBreakdown.cash;

  // 3. Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { unitsSold: number; revenue: number }> = {};

    activeTransactions.forEach((t) => {
      t.items.forEach((item) => {
        const cat = item.category || 'other';
        if (!map[cat]) map[cat] = { unitsSold: 0, revenue: 0 };
        map[cat].unitsSold += item.quantity;
        map[cat].revenue += item.unitPrice * item.quantity;
      });
    });

    return Object.entries(map).map(([category, val]) => ({
      category,
      unitsSold: val.unitsSold,
      revenue: val.revenue,
      percentage: totalGrossRevenue > 0 ? (val.revenue / totalGrossRevenue) * 100 : 0,
    }));
  }, [activeTransactions, totalGrossRevenue]);

  // 4. Hourly Sales Distribution
  const hourlySales = useMemo(() => {
    const hourMap: Record<string, { hour: string; sales: number; count: number }> = {};

    // Seed typical ACG con hours 10:00 to 19:00
    for (let h = 10; h <= 19; h++) {
      const label = `${h.toString().padStart(2, '0')}:00`;
      hourMap[label] = { hour: label, sales: 0, count: 0 };
    }

    activeTransactions.forEach((t) => {
      const d = new Date(t.timestamp);
      const hourStr = `${d.getHours().toString().padStart(2, '0')}:00`;
      if (!hourMap[hourStr]) {
        hourMap[hourStr] = { hour: hourStr, sales: 0, count: 0 };
      }
      hourMap[hourStr].sales += t.total;
      hourMap[hourStr].count += 1;
    });

    return Object.values(hourMap);
  }, [activeTransactions]);

  // 5. Top Selling Products
  const topSellingProducts = useMemo(() => {
    const itemMap: Record<string, { name: string; category: string; emoji: string; units: number; revenue: number; profit: number }> = {};

    activeTransactions.forEach((t) => {
      t.items.forEach((item) => {
        if (!itemMap[item.name]) {
          itemMap[item.name] = {
            name: item.name,
            category: item.category,
            emoji: item.emoji,
            units: 0,
            revenue: 0,
            profit: 0,
          };
        }
        itemMap[item.name].units += item.quantity;
        itemMap[item.name].revenue += item.unitPrice * item.quantity;
        itemMap[item.name].profit += (item.unitPrice - item.unitCost) * item.quantity;
      });
    });

    return Object.values(itemMap).sort((a, b) => b.revenue - a.revenue);
  }, [activeTransactions]);

  // Filtered transactions for the audit log table
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const q = searchTxQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        t.receiptNumber.toLowerCase().includes(q) ||
        t.paymentMethod.toLowerCase().includes(q) ||
        (t.referenceCode && t.referenceCode.toLowerCase().includes(q)) ||
        (t.customerNote && t.customerNote.toLowerCase().includes(q)) ||
        t.items.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [transactions, searchTxQuery]);

  const handleExportCSV = () => {
    soundEngine.playSuccessChime();
    exportTransactionsToCSV(transactions, eventConfig);
  };

  const handleOpenRefund = (tx: Transaction) => {
    setRefundCandidate(tx);
    setRefundDefects({});
    setRefundReason('');
  };

  const handleCloseRefund = () => {
    setRefundCandidate(null);
    setRefundDefects({});
    setRefundReason('');
  };

  const handleDefectChange = (itemId: string, delta: number, maxQty: number) => {
    setRefundDefects((prev) => {
      const next = Math.min(maxQty, Math.max(0, (prev[itemId] ?? 0) + delta));
      return { ...prev, [itemId]: next };
    });
  };

  const handleConfirmRefund = () => {
    if (!refundCandidate) return;
    soundEngine.playVoid();
    const refundDetails: RefundItemDetail[] = refundCandidate.items
      .filter((i) => i.productId)
      .map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        defectiveQty: refundDefects[i.id] ?? 0,
      }));
    onRefundTransaction(refundCandidate.id, refundDetails, refundReason);
    handleCloseRefund();
  };

  const maxHourlySale = Math.max(...hourlySales.map((h) => h.sales), 1);

  return (
    <div className="flex flex-col gap-4 select-none pb-8">
      {/* Top Banner Actions & Summary */}
      <div className="p-4 rounded-3xl bg-white border-3 sm:border-4 border-[#2D3548] shadow-[5px_5px_0px_#2D3548] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl border-2 border-[#2D3548] flex items-center justify-center shadow-[2px_2px_0px_#2D3548] overflow-hidden p-0.5">
            <img
              src={officialLogo}
              alt="Chibishoppu Logo"
              className="w-full h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-[#2D3548] uppercase tracking-wider">
                Sales & ACG Event Analytics
              </h2>
              <span className="bg-[#FF85A1] text-white text-xs font-black px-2.5 py-0.5 rounded-full border border-[#2D3548] shadow-[1px_1px_0px_#2D3548]">
                🎪 {eventConfig.eventName}
              </span>
            </div>
            <p className="text-xs font-bold text-[#616D86]">
              Real-time booth financial balance, category metrics, and end-of-day reconciliation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] px-3.5 py-1.5 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
          >
            <ExportIcon sx={{ fontSize: 16 }} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsZReportOpen(true)}
            className="flex items-center gap-1.5 bg-[#FF85A1] hover:bg-[#FF6B8D] text-white border-2 border-[#2D3548] px-3.5 py-1.5 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
          >
            <PrintIcon sx={{ fontSize: 16 }} />
            <span>Z-Report (EOD)</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Gross Revenue */}
        <div className="p-4 rounded-3xl bg-[#FFD6E8] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-medium uppercase text-[#BE185D] tracking-wider block">
              GROSS REVENUE
            </span>
            <div className="text-lg sm:text-xl font-medium text-[#2D3548] mt-0.5 font-sans">
              {formatCurrency(totalGrossRevenue, eventConfig.currencySymbol)}
            </div>
            <span className="text-[9px] font-normal text-[#616D86] mt-0.5 block">
              {activeTransactions.length} sales ({refundedTransactions.length} refunds)
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#2D3548] text-[#BE185D] flex items-center justify-center shadow-[2px_2px_0px_#2D3548]">
            <RevenueIcon sx={{ fontSize: 24 }} />
          </div>
        </div>

        {/* Card 2: Net Profit */}
        <div className="p-4 rounded-3xl bg-[#A3E7D0] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-medium uppercase text-[#1B5E45] tracking-wider block">
              EST. NET PROFIT
            </span>
            <div className="text-lg sm:text-xl font-medium text-[#1B5E45] mt-0.5 font-sans">
              {formatCurrency(totalNetProfit, eventConfig.currencySymbol)}
            </div>
            <span className="text-[9px] font-normal text-[#1B5E45]/80 mt-0.5 block">
              Margin: {totalGrossRevenue > 0 ? ((totalNetProfit / totalGrossRevenue) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#2D3548] text-[#1B5E45] flex items-center justify-center shadow-[2px_2px_0px_#2D3548]">
            <ProfitIcon sx={{ fontSize: 24 }} />
          </div>
        </div>

        {/* Card 3: Items Sold */}
        <div className="p-4 rounded-3xl bg-[#D8EDFC] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-medium uppercase text-[#2D3548] tracking-wider block">
              MERCH UNITS SOLD
            </span>
            <div className="text-lg sm:text-xl font-medium text-[#2D3548] mt-0.5 font-sans">
              {totalUnitsSold} <span className="text-[10px] font-medium text-[#616D86]">pcs</span>
            </div>
            <span className="text-[9px] font-normal text-[#616D86] mt-0.5 block">
              Across {categoryBreakdown.length} categories
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#2D3548] text-[#2D3548] flex items-center justify-center shadow-[2px_2px_0px_#2D3548]">
            <UnitsIcon sx={{ fontSize: 24 }} />
          </div>
        </div>

        {/* Card 4: Average Order Value */}
        <div className="p-4 rounded-3xl bg-[#FFE699] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] flex items-center justify-between">
          <div>
            <span className="text-[9px] font-medium uppercase text-[#616D86] tracking-wider block">
              AVG BASKET SIZE (AOV)
            </span>
            <div className="text-lg sm:text-xl font-medium text-[#2D3548] mt-0.5 font-sans">
              {formatCurrency(averageOrderValue, eventConfig.currencySymbol)}
            </div>
            <span className="text-[9px] font-normal text-[#616D86] mt-0.5 block">
              Discounts: -{formatCurrency(totalDiscountsGiven, eventConfig.currencySymbol)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#2D3548] text-[#616D86] flex items-center justify-center shadow-[2px_2px_0px_#2D3548]">
            <OrdersIcon sx={{ fontSize: 24 }} />
          </div>
        </div>
      </div>

      {/* Subtabs for Analytics & Transactions Log */}
      <div className="bg-white rounded-3xl border-3 sm:border-4 border-[#2D3548] shadow-[5px_5px_0px_#2D3548] overflow-hidden">
        <div className="flex border-b-3 border-[#2D3548] bg-[#F4F9FE] overflow-x-auto p-1.5 gap-1.5">
          <button
            onClick={() => setSelectedSubTab(0)}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] transition-all whitespace-nowrap ${
              selectedSubTab === 0 ? 'bg-[#FF85A1] text-white' : 'bg-white text-[#2D3548] hover:bg-[#F4F9FE]'
            }`}
          >
            📊 Sales & Analytics
          </button>
          <button
            onClick={() => setSelectedSubTab(1)}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] transition-all whitespace-nowrap ${
              selectedSubTab === 1 ? 'bg-[#FF85A1] text-white' : 'bg-white text-[#2D3548] hover:bg-[#F4F9FE]'
            }`}
          >
            🧾 Transaction Receipts
          </button>
          <button
            onClick={() => setSelectedSubTab(2)}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] transition-all whitespace-nowrap ${
              selectedSubTab === 2 ? 'bg-[#FF85A1] text-white' : 'bg-white text-[#2D3548] hover:bg-[#F4F9FE]'
            }`}
          >
            💵 Cash Box Balancing
          </button>
        </div>

        {/* TAB 0: ANALYTICS (Hourly Timeline + Category Breakdown + Bestsellers) */}
        {selectedSubTab === 0 && (
          <div className="p-4 sm:p-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Hourly Rush Timeline */}
              <div className="lg:col-span-2 p-4 rounded-3xl bg-[#F4F9FE] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
                <h3 className="text-sm font-black text-[#2D3548] uppercase tracking-wider mb-1">
                  ⏰ Hourly Convention Sales Velocity
                </h3>
                <span className="text-xs font-bold text-[#616D86] block mb-4">
                  Visualizes attendee rush peaks throughout the convention day
                </span>

                <div className="flex items-end gap-2 h-44 pt-2 px-1">
                  {hourlySales.map((h) => {
                    const heightPercent = Math.max(10, Math.round((h.sales / maxHourlySale) * 100));
                    return (
                      <div
                        key={h.hour}
                        className="flex-1 flex flex-col items-center h-full justify-end"
                      >
                        <span className="text-[10px] font-black text-[#2D3548] mb-1">
                          {h.sales > 0 ? `${eventConfig.currencySymbol}${Math.round(h.sales)}` : ''}
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-xl border-2 border-[#2D3548] transition-all ${
                            h.sales > 0 ? 'bg-[#D8EDFC] shadow-[1px_0px_0px_#2D3548]' : 'bg-white/60'
                          }`}
                        />
                        <span className="text-[10px] font-mono font-bold text-[#616D86] mt-1">
                          {h.hour.split(':')[0]}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Methods Split */}
              <div className="p-4 rounded-3xl bg-white border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
                <h3 className="text-sm font-black text-[#2D3548] uppercase tracking-wider mb-1">
                  💳 Payment Channels
                </h3>
                <span className="text-xs font-bold text-[#616D86] block mb-3">
                  Attendee payment preference at booth
                </span>

                <div className="space-y-3">
                  {/* Cash */}
                  <div>
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span className="text-[#BE185D]">💵 Cash</span>
                      <span className="text-[#2D3548]">
                        {formatCurrency(paymentBreakdown.cash, eventConfig.currencySymbol)} (
                        {totalGrossRevenue > 0
                          ? ((paymentBreakdown.cash / totalGrossRevenue) * 100).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-full h-3.5 p-0.5 overflow-hidden">
                      <div
                        className="bg-[#FF85A1] h-full rounded-full"
                        style={{
                          width: `${totalGrossRevenue > 0 ? (paymentBreakdown.cash / totalGrossRevenue) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* QR Pay */}
                  <div>
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span className="text-[#1B5E45]">📱 QR Pay (E-Wallet)</span>
                      <span className="text-[#2D3548]">
                        {formatCurrency(paymentBreakdown.qr, eventConfig.currencySymbol)} (
                        {totalGrossRevenue > 0
                          ? ((paymentBreakdown.qr / totalGrossRevenue) * 100).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-full h-3.5 p-0.5 overflow-hidden">
                      <div
                        className="bg-[#A3E7D0] h-full rounded-full"
                        style={{
                          width: `${totalGrossRevenue > 0 ? (paymentBreakdown.qr / totalGrossRevenue) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Card */}
                  <div>
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span className="text-[#6B9BC8]">💳 Card / NFC</span>
                      <span className="text-[#2D3548]">
                        {formatCurrency(paymentBreakdown.card, eventConfig.currencySymbol)} (
                        {totalGrossRevenue > 0
                          ? ((paymentBreakdown.card / totalGrossRevenue) * 100).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-full h-3.5 p-0.5 overflow-hidden">
                      <div
                        className="bg-[#D8EDFC] h-full rounded-full"
                        style={{
                          width: `${totalGrossRevenue > 0 ? (paymentBreakdown.card / totalGrossRevenue) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Performance & Top Sellers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Category Breakdown List */}
              <div className="p-4 rounded-3xl bg-white border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
                <h3 className="text-sm font-black text-[#2D3548] uppercase tracking-wider mb-2">
                  🏷️ Merch Category Revenue
                </h3>

                <div className="space-y-2">
                  {categoryBreakdown.map((cat) => {
                    const meta = CATEGORY_META[cat.category];
                    return (
                      <div
                        key={cat.category}
                        className="p-2.5 rounded-2xl border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] flex justify-between items-center"
                        style={{ backgroundColor: meta?.bgColor || '#F4F9FE' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{meta?.emoji || '🌸'}</span>
                          <div>
                            <span className="text-xs font-black text-[#2D3548] block">
                              {meta?.label || cat.category}
                            </span>
                            <span className="text-[11px] font-bold text-[#616D86]">
                              {cat.unitsSold} units sold
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-[#2D3548] block">
                            {formatCurrency(cat.revenue, eventConfig.currencySymbol)}
                          </span>
                          <span className="text-[10px] font-bold text-[#616D86]">
                            {cat.percentage.toFixed(1)}% share
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Selling Products List */}
              <div className="p-4 rounded-3xl bg-white border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
                <h3 className="text-sm font-black text-[#2D3548] uppercase tracking-wider mb-2">
                  🏆 Top Bestsellers at Booth
                </h3>

                <div className="space-y-2">
                  {topSellingProducts.slice(0, 5).map((prod, idx) => (
                    <div
                      key={prod.name}
                      className="p-2.5 rounded-2xl bg-[#F4F9FE] border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#FF85A1] text-white border border-[#2D3548] text-xs font-black flex items-center justify-center shadow-[1px_1px_0px_#2D3548]">
                          #{idx + 1}
                        </span>
                        <span className="text-xl">{prod.emoji}</span>
                        <div>
                          <span className="text-xs font-black text-[#2D3548] truncate block max-w-[170px]">
                            {prod.name}
                          </span>
                          <span className="text-[10px] font-bold text-[#616D86]">
                            {prod.units} pcs sold • Profit: {formatCurrency(prod.profit, eventConfig.currencySymbol)}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-black text-[#FF85A1]">
                        {formatCurrency(prod.revenue, eventConfig.currencySymbol)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: TRANSACTION AUDIT LOG & RECEIPTS */}
        {selectedSubTab === 1 && (
          <div className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <div className="relative w-full sm:w-80">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#616D86]" sx={{ fontSize: 16 }} />
                <input
                  type="text"
                  placeholder="Search receipt #, payment, note..."
                  value={searchTxQuery}
                  onChange={(e) => setSearchTxQuery(e.target.value)}
                  className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-[#2D3548] placeholder-[#616D86]/60 focus:outline-none shadow-[2px_2px_0px_#2D3548]"
                />
              </div>

              <span className="text-xs font-bold text-[#616D86]">
                Showing {filteredTransactions.length} of {transactions.length} total sales
              </span>
            </div>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#FFD6E8', borderBottom: '3px solid #2D3548' }}>
                    <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem' }}>Receipt #</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem' }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem' }}>Items Purchased</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem' }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem' }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem' }} align="right">Status</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.75rem' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((tx) => (
                      <TableRow key={tx.id} hover sx={{ opacity: tx.status === 'refunded' ? 0.6 : 1, borderBottom: '1px solid #E3ECF5' }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 900, color: '#FF85A1', fontSize: '0.75rem' }}>
                          {tx.receiptNumber}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#616D86' }}>
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-bold text-[#2D3548] max-w-[260px] truncate">
                            {tx.items.map((i) => `${i.emoji} ${i.name} (x${i.quantity})`).join(', ')}
                          </div>
                          {tx.customerNote && (
                            <span className="text-[10px] bg-[#F4F9FE] border border-[#2D3548] text-[#2D3548] px-1.5 py-0.2 rounded mt-0.5 inline-block font-bold">
                              📝 {tx.customerNote}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-lg border border-[#2D3548] bg-white shadow-[1px_1px_0px_#2D3548]">
                            {tx.paymentMethod === 'cash'
                              ? '💵 Cash'
                              : tx.paymentMethod === 'qr_pay'
                              ? '📱 QR Pay'
                              : tx.paymentMethod === 'card'
                              ? '💳 Card'
                              : '🔀 Split'}
                          </span>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, color: '#2D3548', fontSize: '0.8rem' }}>
                          {formatCurrency(tx.total, eventConfig.currencySymbol)}
                        </TableCell>
                        <TableCell align="right">
                          <span
                            title={
                              tx.status === 'refunded'
                                ? `Refunded ${tx.refundedAt ? new Date(tx.refundedAt).toLocaleString() : ''}` +
                                  `${tx.refundedBy ? ` by ${tx.refundedBy}` : ''}` +
                                  `${tx.refundReason ? ` — ${tx.refundReason}` : ''}`
                                : undefined
                            }
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md border border-[#2D3548] shadow-[1px_1px_0px_#2D3548] ${
                              tx.status === 'completed' ? 'bg-[#A3E7D0] text-[#1B5E45]' : 'bg-[#FFD6E8] text-[#BE185D]'
                            }`}
                          >
                            {tx.status === 'completed' ? 'Paid ✓' : 'Refunded'}
                          </span>
                          {tx.status === 'refunded' && (tx.refundDetails?.reduce((s, d) => s + d.defectiveQty, 0) ?? 0) > 0 && (
                            <span className="block mt-1 text-[9px] font-black text-rose-600">
                              ⚠ {tx.refundDetails!.reduce((s, d) => s + d.defectiveQty, 0)} defective
                            </span>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewingReceipt(tx)}
                              title="View / Print Receipt"
                              className="w-7 h-7 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border border-[#2D3548] rounded-lg flex items-center justify-center shadow-[1px_1px_0px_#2D3548]"
                            >
                              <PrintIcon sx={{ fontSize: 14 }} />
                            </button>

                            {tx.status === 'completed' && (
                              <button
                                onClick={() => handleOpenRefund(tx)}
                                title="Void & Restock Items"
                                className="w-7 h-7 bg-white hover:bg-[#FFE2ED] text-rose-600 border border-[#2D3548] rounded-lg flex items-center justify-center shadow-[1px_1px_0px_#2D3548]"
                              >
                                <RefundIcon sx={{ fontSize: 14 }} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredTransactions.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </div>
        )}

        {/* TAB 2: END OF DAY CASH DRAWER AUDIT & RECONCILIATION */}
        {selectedSubTab === 2 && (
          <div className="p-4 sm:p-6 max-w-xl mx-auto flex flex-col gap-4">
            <div className="p-4 rounded-3xl bg-[#F4F9FE] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
              <h3 className="text-sm sm:text-base font-black text-[#2D3548] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span>🪙</span> Cash Box End-of-Day Balancing
              </h3>
              <span className="text-xs font-bold text-[#616D86] block mb-3">
                Count the physical bills and coins inside your cash float tin at the end of the convention.
              </span>

              <div className="space-y-2 text-xs sm:text-sm bg-white p-3 rounded-2xl border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] mb-4">
                <div className="flex justify-between text-[#616D86] font-bold">
                  <span>Starting Cash Float (Morning):</span>
                  <span className="text-[#2D3548]">{formatCurrency(eventConfig.openingCashFloat, eventConfig.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-[#616D86] font-bold">
                  <span>+ Cash Sales Collected Today:</span>
                  <span className="text-[#1B5E45]">+{formatCurrency(paymentBreakdown.cash, eventConfig.currencySymbol)}</span>
                </div>
                <div className="h-[2px] bg-[#2D3548]/20 my-1"></div>
                <div className="flex justify-between text-sm sm:text-base font-black text-[#2D3548]">
                  <span>Expected Cash in Drawer:</span>
                  <span>{formatCurrency(expectedCashInDrawer, eventConfig.currencySymbol)}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                  Counted Actual Physical Cash in Tin ({eventConfig.currencySymbol})
                </label>
                <input
                  type="number"
                  placeholder="Enter counted amount"
                  value={countedActualCash}
                  onChange={(e) => setCountedActualCash(e.target.value)}
                  className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-sm font-black text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
                />
              </div>

              {countedActualCash !== '' && (
                <div className="mt-3">
                  {(() => {
                    const counted = parseFloat(countedActualCash) || 0;
                    const diff = counted - expectedCashInDrawer;
                    const isBalanced = Math.abs(diff) < 0.01;
                    const isOver = diff > 0;

                    return (
                      <div
                        className={`p-3 rounded-2xl border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] text-xs font-black ${
                          isBalanced ? 'bg-[#A3E7D0] text-[#1B5E45]' : isOver ? 'bg-[#D8EDFC] text-[#2D3548]' : 'bg-[#FFD6E8] text-[#BE185D]'
                        }`}
                      >
                        {isBalanced
                          ? '✨ Cash Box Perfectly Balanced!'
                          : isOver
                          ? `Over by +${formatCurrency(diff, eventConfig.currencySymbol)} (Tips or excess float)`
                          : `Shortage of -${formatCurrency(Math.abs(diff), eventConfig.currencySymbol)} (Discrepancy)`}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Z-Report Modal */}
      <ZReportPrintModal
        open={isZReportOpen}
        onClose={() => setIsZReportOpen(false)}
        transactions={transactions}
        eventConfig={eventConfig}
        openingFloat={eventConfig.openingCashFloat}
        countedCash={countedActualCash !== '' ? parseFloat(countedActualCash) || 0 : undefined}
      />

      {/* Single Receipt Re-print Modal */}
      <ReceiptModal
        open={Boolean(viewingReceipt)}
        onClose={() => setViewingReceipt(null)}
        transaction={viewingReceipt}
        eventConfig={eventConfig}
      />

      {/* Refund Confirmation Dialog */}
      <Dialog open={Boolean(refundCandidate)} onClose={handleCloseRefund} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RefundIcon color="error" />
          <Typography variant="h6" className="font-bold text-slate-800">
            Void & Refund Transaction
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="text-slate-700 mb-3">
            Void receipt <strong>#{refundCandidate?.receiptNumber}</strong> (
            {formatCurrency(refundCandidate?.total || 0, eventConfig.currencySymbol)})?
            Returned items go back to stock — mark any defective/damaged units so they are recorded instead.
          </Typography>

          {/* Per-item condition */}
          <div className="flex flex-col gap-2 mb-3">
            {refundCandidate?.items.map((item) => {
              const defectQty = refundDefects[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#F4F9FE] border-2 border-[#2D3548]"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-black text-[#2D3548] block truncate">
                      {item.emoji} {item.name} ×{item.quantity}
                    </span>
                    <span className="text-[10px] font-bold text-[#616D86]">
                      {defectQty > 0
                        ? `${item.quantity - defectQty} → stock, ${defectQty} → defective`
                        : `${item.quantity} → back to stock`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] font-black uppercase text-rose-600 mr-0.5">Defective</span>
                    <button
                      onClick={() => handleDefectChange(item.id, -1, item.quantity)}
                      disabled={defectQty <= 0}
                      className="w-6 h-6 rounded-lg bg-white border border-[#2D3548] flex items-center justify-center text-xs font-black disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="font-black text-xs text-[#2D3548] min-w-[18px] text-center">
                      {defectQty}
                    </span>
                    <button
                      onClick={() => handleDefectChange(item.id, 1, item.quantity)}
                      disabled={defectQty >= item.quantity}
                      className="w-6 h-6 rounded-lg bg-[#FFD6E8] border border-[#2D3548] flex items-center justify-center text-xs font-black disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <TextField
            label="Refund reason (optional)"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            size="small"
            fullWidth
            placeholder="e.g. Damaged in transit, wrong item sold, customer changed mind"
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {(() => {
              const total = refundCandidate?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
              const defects = refundCandidate?.items.reduce((s, i) => s + (refundDefects[i.id] ?? 0), 0) ?? 0;
              return defects > 0
                ? `${total - defects} item(s) return to live stock • ${defects} recorded as defective (not sellable)`
                : `All ${total} item(s) return to live booth inventory.`;
            })()}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseRefund} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmRefund} variant="contained" color="error">
            Confirm Refund
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
