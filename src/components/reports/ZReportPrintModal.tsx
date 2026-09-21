import React, { useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  ReceiptLong as ReportIcon,
} from '@mui/icons-material';
import { Transaction, EventConfig, Product } from '../../types';
import { formatCurrency } from '../../utils/export';
const officialLogo = `${import.meta.env.BASE_URL}ChibishoppuLogo2.jpeg`;

interface ZReportPrintModalProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  eventConfig: EventConfig;
  products: Product[];
  openingFloat: number;
  countedCash?: number;
}

export const ZReportPrintModal: React.FC<ZReportPrintModalProps> = ({
  open,
  onClose,
  transactions,
  eventConfig,
  products,
  openingFloat,
  countedCash,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Active completed transactions
  const activeTx = transactions.filter((t) => t.status === 'completed');
  const refundedTx = transactions.filter((t) => t.status === 'refunded');
  const defectiveUnits = refundedTx.reduce(
    (s, t) => s + (t.refundDetails?.reduce((a, d) => a + d.defectiveQty, 0) ?? 0),
    0
  );

  const grossSales = activeTx.reduce((s, t) => s + t.total, 0);
  const totalDiscounts = activeTx.reduce((s, t) => s + t.discountAmount, 0);
  const totalTax = activeTx.reduce((s, t) => s + t.taxAmount, 0);
  const estimatedCost = activeTx.reduce((s, t) => s + t.totalCost, 0);
  const netProfit = grossSales - estimatedCost;

  // Payment Breakdown
  const cashSales = activeTx.reduce((s, t) => {
    if (t.paymentMethod === 'cash') return s + t.total;
    if (t.paymentMethod === 'split' && t.splitDetail) return s + t.splitDetail.cashAmount;
    return s;
  }, 0);

  const qrSales = activeTx.reduce((s, t) => {
    if (t.paymentMethod === 'qr_pay') return s + t.total;
    if (t.paymentMethod === 'split' && t.splitDetail?.electronicMethod === 'qr_pay')
      return s + t.splitDetail.electronicAmount;
    return s;
  }, 0);

  const cardSales = activeTx.reduce((s, t) => {
    if (t.paymentMethod === 'card') return s + t.total;
    if (t.paymentMethod === 'split' && t.splitDetail?.electronicMethod === 'card')
      return s + t.splitDetail.electronicAmount;
    return s;
  }, 0);

  const expectedCashInBox = openingFloat + cashSales;
  const variance = countedCash !== undefined ? countedCash - expectedCashInBox : undefined;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '24px',
            border: '4px solid #2D3548',
            boxShadow: '8px 8px 0px #2D3548',
            bgcolor: '#F4F9FE',
            overflow: 'hidden',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            margin: { xs: 2, sm: 4 },
          },
        },
      }}
    >
      <div className="bg-[#D8EDFC] border-b-3 border-[#2D3548] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <ReportIcon sx={{ color: '#2D3548', fontSize: 24 }} />
          <h3 className="text-base font-black text-[#2D3548] uppercase tracking-wider">
            End-of-Day Z-Report
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE2ED] text-[#2D3548] border-2 border-[#2D3548] flex items-center justify-center font-black shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      <div className="p-4 bg-[#F4F9FE] flex-1 min-h-0 overflow-y-auto">
        <div
          ref={printRef}
          className="p-5 bg-white rounded-2xl border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] font-mono text-xs text-[#2D3548]"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b-2 border-[#2D3548] font-sans">
            <div className="flex justify-center mb-1.5">
              <div className="w-14 h-14 rounded-2xl border-2 border-[#2D3548] overflow-hidden shadow-[2px_2px_0px_#2D3548] bg-white">
                <img
                  src={officialLogo}
                  alt="Chibishoppu Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <h2 className="text-xl font-black text-[#2D3548] tracking-tight">CHIBISHOPPU - Z REPORT</h2>
            <p className="text-xs text-[#2D3548] font-black uppercase">DAILY FINANCIAL RECONCILIATION</p>
            <p className="text-xs font-bold text-[#616D86] mt-1">
              {eventConfig.eventName} • {eventConfig.boothNumber}
            </p>
            <p className="text-[11px] font-medium text-[#616D86]">
              Generated: {new Date().toLocaleString()} by {eventConfig.cashierName}
            </p>
          </div>

          {/* Sales Summary */}
          <div className="py-3 border-b-2 border-dashed border-[#2D3548]/40 space-y-1">
            <div className="font-black text-[#2D3548] pb-1 uppercase tracking-wider">REVENUE BREAKDOWN:</div>
            <div className="flex justify-between font-bold">
              <span>Total Transactions:</span>
              <span className="font-black">{activeTx.length} orders</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Refunded / Voided:</span>
              <span className="text-rose-600 font-black">{refundedTx.length} orders</span>
            </div>
            {defectiveUnits > 0 && (
              <div className="flex justify-between font-bold">
                <span>Defective Units Recorded:</span>
                <span className="text-rose-600 font-black">{defectiveUnits} units</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>Total Discounts Given:</span>
              <span className="text-[#FF85A1] font-black">-{formatCurrency(totalDiscounts, eventConfig.currencySymbol)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Total Tax Collected:</span>
              <span>+{formatCurrency(totalTax, eventConfig.currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-sm font-black text-[#2D3548] pt-1.5 border-t-2 border-[#2D3548]">
              <span>GROSS SALES:</span>
              <span className="text-[#FF85A1] font-black">
                {formatCurrency(grossSales, eventConfig.currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between text-[#1B5E45] font-black pt-0.5">
              <span>ESTIMATED NET PROFIT:</span>
              <span>{formatCurrency(netProfit, eventConfig.currencySymbol)}</span>
            </div>
          </div>

          {/* Payment Media */}
          <div className="py-3 border-b-2 border-dashed border-[#2D3548]/40 space-y-1">
            <div className="font-black text-[#2D3548] pb-1 uppercase tracking-wider">PAYMENT MEDIA TOTALS:</div>
            <div className="flex justify-between font-bold">
              <span>💵 Cash Collected:</span>
              <span className="font-black">{formatCurrency(cashSales, eventConfig.currencySymbol)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>📱 QR Pay / E-Wallet:</span>
              <span className="font-black">{formatCurrency(qrSales, eventConfig.currencySymbol)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>💳 Card Terminal:</span>
              <span className="font-black">{formatCurrency(cardSales, eventConfig.currencySymbol)}</span>
            </div>
          </div>

          {/* Cash Drawer Reconciliation */}
          <div className="py-3 border-b-2 border-[#2D3548] space-y-1">
            <div className="font-black text-[#2D3548] pb-1 uppercase tracking-wider">CASH DRAWER RECONCILIATION:</div>
            <div className="flex justify-between font-bold">
              <span>Opening Cash Float:</span>
              <span>{formatCurrency(openingFloat, eventConfig.currencySymbol)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>+ Cash Sales Collected:</span>
              <span>+{formatCurrency(cashSales, eventConfig.currencySymbol)}</span>
            </div>
            <div className="flex justify-between font-black text-[#2D3548] pt-1.5 border-t-2 border-[#2D3548]">
              <span>EXPECTED CASH IN BOX:</span>
              <span>{formatCurrency(expectedCashInBox, eventConfig.currencySymbol)}</span>
            </div>

            {countedCash !== undefined && (
              <>
                <div className="flex justify-between font-black text-[#FF85A1]">
                  <span>PHYSICAL CASH COUNTED:</span>
                  <span>{formatCurrency(countedCash, eventConfig.currencySymbol)}</span>
                </div>
                <div
                  className={`flex justify-between font-black pt-1 ${
                    variance === 0
                      ? 'text-[#1B5E45]'
                      : variance! > 0
                      ? 'text-[#1B5E45]'
                      : 'text-rose-600'
                  }`}
                >
                  <span>CASH OVER / (SHORT):</span>
                  <span>
                    {variance === 0
                      ? 'RM0.00 (Balanced ✓)'
                      : `${variance! > 0 ? '+' : ''}${formatCurrency(variance!, eventConfig.currencySymbol)}`}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Signatures */}
          <div className="pt-4 text-xs font-sans space-y-3">
            <div className="flex justify-between items-end pt-4">
              <div className="border-t-2 border-[#2D3548] w-36 text-center text-[10px] font-black text-[#2D3548]">
                Booth Lead Signature
              </div>
              <div className="border-t-2 border-[#2D3548] w-36 text-center text-[10px] font-black text-[#2D3548]">
                Cashier Verification
              </div>
            </div>
            <p className="text-[10px] text-center font-bold text-[#616D86]">
              Chibishoppu ACG Booth POS • End of Day Closeout
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-[#F4F9FE] border-t-3 border-[#2D3548] flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-black uppercase text-[#2D3548] bg-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] hover:bg-[#F4F9FE] active:translate-y-0.5"
        >
          Close
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#FF85A1] hover:bg-[#FF6B8D] text-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5 transition-all flex items-center gap-1.5"
        >
          <PrintIcon sx={{ fontSize: 16 }} />
          Print Z-Report
        </button>
      </div>
    </Dialog>
  );
};
