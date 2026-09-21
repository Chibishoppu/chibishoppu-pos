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
  CheckCircle as CheckIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { Transaction, EventConfig } from '../../types';
import { formatCurrency } from '../../utils/export';
const officialLogo = `${import.meta.env.BASE_URL}ChibishoppuLogo2.jpeg`;

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  eventConfig: EventConfig;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  open,
  onClose,
  transaction,
  eventConfig,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const summary = `✨ CHIBISHOPPU RECEIPT ✨
Receipt: ${transaction.receiptNumber}
Event: ${transaction.eventName} (${transaction.boothNumber})
Date: ${new Date(transaction.timestamp).toLocaleString()}
Items:
${transaction.items.map(i => ` • ${i.name} x${i.quantity} = ${formatCurrency(i.unitPrice * i.quantity, eventConfig.currencySymbol)}`).join('\n')}
Total: ${formatCurrency(transaction.total, eventConfig.currencySymbol)} (${transaction.paymentMethod.toUpperCase()})
Arigato gozaimasu for supporting our handmade craft booth! 🌸`;

    navigator.clipboard.writeText(summary);
    alert('Receipt summary copied to clipboard! ✨');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
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
      <div className="bg-[#A3E7D0] border-b-3 border-[#2D3548] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white border-2 border-[#2D3548] flex items-center justify-center shadow-[1px_1px_0px_#2D3548]">
            <CheckIcon sx={{ fontSize: 18, color: '#1B5E45' }} />
          </div>
          <h3 className="text-base font-black text-[#1B5E45] uppercase tracking-wider">
            Sale Completed!
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE2ED] text-[#2D3548] border-2 border-[#2D3548] flex items-center justify-center font-black shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      <div className="p-4 bg-[#F4F9FE] flex-1 min-h-0 overflow-y-auto">
        {/* Printable Thermal Receipt Container */}
        <div
          ref={receiptRef}
          className="p-5 bg-white rounded-2xl border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] font-mono text-xs text-[#2D3548]"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b-2 border-dashed border-[#2D3548]/30">
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
            <h2 className="text-lg font-black text-[#FF85A1] tracking-wide font-sans">
              ちびショップ Chibishoppu
            </h2>
            <span className="text-[11px] font-bold text-[#616D86] font-sans block">
              Handmade Anime Goods & TCG Cards
            </span>
            <span className="text-xs font-black text-[#2D3548] block mt-1">
              {transaction.eventName} • {transaction.boothNumber}
            </span>
            {transaction.status === 'refunded' && (
              <div className="mt-2 py-1 px-2 border-2 border-rose-500 rounded-lg text-rose-600 font-black uppercase tracking-widest text-[11px]">
                *** REFUNDED ***
                <div className="text-[9px] font-bold normal-case tracking-normal mt-0.5">
                  {transaction.refundedAt ? new Date(transaction.refundedAt).toLocaleString() : ''}
                  {transaction.refundedBy ? ` • by ${transaction.refundedBy}` : ''}
                  {transaction.refundReason ? ` • ${transaction.refundReason}` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Meta Info */}
          <div className="py-2.5 text-xs text-[#616D86] border-b-2 border-dashed border-[#2D3548]/30 space-y-1 font-bold">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span className="font-black text-[#2D3548]">{transaction.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date/Time:</span>
              <span>
                {new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(transaction.timestamp).toLocaleDateString()})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span className="text-[#2D3548]">{transaction.cashierName}</span>
            </div>
            {transaction.referenceCode && (
              <div className="flex justify-between text-[#6B9BC8]">
                <span>Ref Code:</span>
                <span>{transaction.referenceCode}</span>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="py-3 border-b-2 border-dashed border-[#2D3548]/30 space-y-2 text-xs">
            <div className="flex justify-between font-black text-[#2D3548] pb-1 border-b border-[#2D3548]/15">
              <span>ITEM</span>
              <span>QTY & TOTAL</span>
            </div>
            {transaction.items.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between items-start text-[#2D3548]">
                  <div className="pr-2">
                    <span className="mr-1">{item.emoji}</span>
                    <span className="font-bold">{item.name}</span>
                  </div>
                  <span className="font-black whitespace-nowrap">
                    {formatCurrency(item.unitPrice * item.quantity, eventConfig.currencySymbol)}
                  </span>
                </div>
                <div className="text-[11px] text-[#616D86] pl-4 font-medium">
                  {item.quantity} @ {formatCurrency(item.unitPrice, eventConfig.currencySymbol)} each
                  {item.customNote && <span className="italic block text-[#FF85A1]">Note: {item.customNote}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-3 border-b-2 border-dashed border-[#2D3548]/30 text-xs space-y-1 text-[#616D86] font-bold">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="text-[#2D3548]">{formatCurrency(transaction.subtotal, eventConfig.currencySymbol)}</span>
            </div>

            {transaction.discountAmount > 0 && (
              <div className="flex justify-between text-[#FF85A1]">
                <span>Discount ({transaction.discountType}):</span>
                <span>-{formatCurrency(transaction.discountAmount, eventConfig.currencySymbol)}</span>
              </div>
            )}

            {transaction.taxAmount > 0 && (
              <div className="flex justify-between">
                <span>Tax ({transaction.taxRate * 100}%):</span>
                <span>+{formatCurrency(transaction.taxAmount, eventConfig.currencySymbol)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black text-[#2D3548] pt-1.5 border-t border-[#2D3548]/20">
              <span>TOTAL PAID:</span>
              <span className="text-[#FF85A1] font-sans text-base">
                {formatCurrency(transaction.total, eventConfig.currencySymbol)}
              </span>
            </div>

            {/* Payment Details */}
            <div className="pt-2 text-[11px] text-[#616D86] space-y-0.5">
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-black uppercase text-[#2D3548]">{transaction.paymentMethod}</span>
              </div>
              {transaction.tenderedAmount !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span>Cash Tendered:</span>
                    <span className="text-[#2D3548]">{formatCurrency(transaction.tenderedAmount, eventConfig.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between font-black text-[#1B5E45]">
                    <span>Change Returned:</span>
                    <span>{formatCurrency(transaction.changeGiven || 0, eventConfig.currencySymbol)}</span>
                  </div>
                </>
              )}
              {transaction.splitDetail && (
                <div className="text-[10px] text-[#616D86] pl-2">
                  • Cash: {formatCurrency(transaction.splitDetail.cashAmount, eventConfig.currencySymbol)} + {transaction.splitDetail.electronicMethod.toUpperCase()}: {formatCurrency(transaction.splitDetail.electronicAmount, eventConfig.currencySymbol)}
                </div>
              )}
            </div>
          </div>

          {/* Stamp Rally Badge */}
          {transaction.total >= eventConfig.stampRallyThreshold && (
            <div className="my-2.5 p-2 bg-[#FFD6E8] border-2 border-[#2D3548] rounded-xl text-center font-sans shadow-[2px_2px_0px_#2D3548]">
              <span className="text-xs font-black text-[#BE185D] block">
                ⭐ ACG STAMP RALLY CERTIFIED ⭐
              </span>
              <span className="text-[10px] font-bold text-[#BE185D]">
                Collect 3 booth stamps across event days for a free mystery gacha sticker!
              </span>
            </div>
          )}

          {/* Footer Note */}
          <div className="text-center pt-2 text-[11px] text-[#616D86] font-sans font-bold">
            <p className="text-[#2D3548] font-black">Arigato for visiting Chibishoppu! 🌸</p>
            <p className="text-[10px] text-[#616D86] mt-0.5">Tag us in your photos: @chibishoppu.crafts</p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-[#F4F9FE] border-t-3 border-[#2D3548] flex justify-between gap-2">
        <button
          onClick={handleCopyText}
          className="flex items-center gap-1 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] px-3 py-1.5 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
        >
          <ShareIcon sx={{ fontSize: 14 }} />
          <span>Copy</span>
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] px-3 py-1.5 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
        >
          <PrintIcon sx={{ fontSize: 14 }} />
          <span>Print</span>
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1 bg-[#FF85A1] hover:bg-[#FF6B8D] text-white border-2 border-[#2D3548] px-4 py-1.5 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
        >
          <span>Next Customer</span>
        </button>
      </div>
    </Dialog>
  );
};
