import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Chip,
  Paper,
  Divider,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Payments as CashIcon,
  QrCode2 as QrIcon,
  CreditCard as CardIcon,
  CallSplit as SplitIcon,
  CheckCircle as SuccessIcon,
  Close as CloseIcon,
  Discount as DiscountIcon,
} from '@mui/icons-material';
import confetti from 'canvas-confetti';
import {
  CartItem,
  PaymentMethod,
  CustomerDiscountType,
  Transaction,
  EventConfig,
  SplitPaymentDetail,
} from '../../types';
import { formatCurrency, generateReceiptNumber } from '../../utils/export';
import { soundEngine } from '../../utils/audio';
const officialLogo = `${import.meta.env.BASE_URL}ChibishoppuLogo2.jpeg`;

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  eventConfig: EventConfig;
  onCompleteSale: (transaction: Transaction) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onClose,
  cart,
  eventConfig,
  onCompleteSale,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [discountType, setDiscountType] = useState<CustomerDiscountType>('none');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<number>(10);
  const [tenderedCash, setTenderedCash] = useState<string>('');
  const [customerNote, setCustomerNote] = useState<string>('');
  
  // Split payment state
  const [splitCash, setSplitCash] = useState<string>('');
  const [splitMethod, setSplitMethod] = useState<'qr_pay' | 'card'>('qr_pay');

  // QR verification toggle
  const [qrVerified, setQrVerified] = useState<boolean>(true);

  // Card terminal simulation
  const [isProcessingCard, setIsProcessingCard] = useState(false);

  // Compute Subtotal & Total
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const totalCost = cart.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);

  // Discount calculation
  let discountRate = 0;
  if (discountType === 'cosplayer') discountRate = 0.10; // 10%
  else if (discountType === 'booth_neighbor') discountRate = 0.15; // 15%
  else if (discountType === 'staff_friend') discountRate = 0.20; // 20%
  else if (discountType === 'custom') discountRate = Math.min(100, Math.max(0, customDiscountPercent)) / 100;

  const discountAmount = subtotal * discountRate;
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxRate = eventConfig.taxPercent / 100;
  const taxAmount = taxableBase * taxRate;
  const finalTotal = taxableBase + taxAmount;
  const netProfit = finalTotal - totalCost;

  // Tendered cash calculation
  const numericTendered = parseFloat(tenderedCash) || 0;
  const changeDue = Math.max(0, numericTendered - finalTotal);
  const isCashSufficient = numericTendered >= finalTotal;

  // Split calculation
  const numericSplitCash = parseFloat(splitCash) || 0;
  const splitElectronicDue = Math.max(0, finalTotal - numericSplitCash);

  // Reset or preset when opening
  useEffect(() => {
    if (open) {
      setTenderedCash(Math.ceil(finalTotal).toString());
      setSplitCash((Math.floor(finalTotal / 2)).toString());
      setIsProcessingCard(false);
      setQrVerified(true);
    }
  }, [open, finalTotal]);

  const handleQuickCash = (amount: number) => {
    soundEngine.playCoin();
    setTenderedCash(amount.toString());
  };

  const handleFinishPayment = () => {
    if (paymentMethod === 'cash' && !isCashSufficient) {
      return;
    }

    if (paymentMethod === 'card') {
      setIsProcessingCard(true);
      setTimeout(() => {
        setIsProcessingCard(false);
        finalize();
      }, 700);
      return;
    }

    finalize();
  };

  const finalize = () => {
    soundEngine.playSuccessChime();

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#8B5CF6', '#F59E0B', '#10B981', '#F43F5E'],
      });
    } catch {
      // Confetti fallback
    }

    let splitDetail: SplitPaymentDetail | undefined = undefined;
    if (paymentMethod === 'split') {
      splitDetail = {
        cashAmount: numericSplitCash,
        electronicAmount: splitElectronicDue,
        electronicMethod: splitMethod,
      };
    }

    const transaction: Transaction = {
      id: `tx-${Date.now()}`,
      receiptNumber: generateReceiptNumber(),
      timestamp: new Date().toISOString(),
      eventName: eventConfig.eventName,
      boothNumber: eventConfig.boothNumber,
      cashierName: eventConfig.cashierName,
      items: [...cart],
      subtotal,
      discountType,
      discountRate,
      discountAmount,
      taxRate,
      taxAmount,
      total: finalTotal,
      totalCost,
      netProfit,
      paymentMethod,
      tenderedAmount: paymentMethod === 'cash' ? numericTendered : undefined,
      changeGiven: paymentMethod === 'cash' ? changeDue : undefined,
      splitDetail,
      referenceCode: paymentMethod !== 'cash' ? `EPAY-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
      status: 'completed',
      customerNote: customerNote.trim() || undefined,
    };

    onCompleteSale(transaction);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
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
      <div className="bg-gradient-to-r from-[#9AC8ED] via-[#B8DCFA] to-[#FFBFD7] border-b-3 border-[#2D3548] p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[#2D3548] flex items-center justify-center shadow-[2px_2px_0px_#2D3548] overflow-hidden p-0.5">
            <img
              src={officialLogo}
              alt="Chibishoppu Logo"
              className="w-full h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-[#2D3548] uppercase tracking-wider">
                Payment & Checkout
              </h3>
              <span className="text-[11px] px-2 py-0.5 bg-white text-[#2D3548] border border-[#2D3548] rounded-full font-black shadow-[1px_1px_0px_#2D3548]">
                {eventConfig.boothNumber}
              </span>
            </div>
            <p className="text-xs font-bold text-[#616D86]">
              {cart.reduce((s, i) => s + i.quantity, 0)} items in basket • {eventConfig.eventName}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE2ED] text-[#2D3548] border-2 border-[#2D3548] flex items-center justify-center font-black shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      <div className="p-4 sm:p-6 bg-[#F4F9FE] overflow-y-auto flex-1 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left Column: Payment Methods & Input */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {/* Event Discounts Bar */}
            <div className="p-3.5 rounded-2xl bg-white border-3 border-[#2D3548] shadow-[3px_3px_0px_#2D3548]">
              <span className="text-xs font-black text-[#2D3548] uppercase tracking-wider mb-2 flex items-center gap-1">
                <DiscountIcon sx={{ fontSize: 16 }} className="text-[#FF85A1]" />
                Event Discount & Attendee Perks:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'none', label: 'No Discount' },
                  { id: 'cosplayer', label: '🎭 Cosplayer (-10%)' },
                  { id: 'booth_neighbor', label: '🤝 Neighbor Booth (-15%)' },
                  { id: 'staff_friend', label: '🌸 Staff / Friend (-20%)' },
                  { id: 'custom', label: 'Custom %' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDiscountType(d.id as CustomerDiscountType)}
                    className={`px-3 py-1 rounded-xl text-xs font-black border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] transition-all ${
                      discountType === d.id
                        ? 'bg-[#FF85A1] text-white'
                        : 'bg-white text-[#2D3548] hover:bg-[#F4F9FE]'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {discountType === 'custom' && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#2D3548]/20">
                  <div className="w-28">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={customDiscountPercent}
                      onChange={(e) => setCustomDiscountPercent(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-2.5 py-1 text-xs font-black text-[#2D3548] shadow-[1px_1px_0px_#2D3548]"
                      placeholder="Discount %"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#616D86]">
                    Applies {customDiscountPercent}% off total subtotal
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method Selector Tabs */}
            <div>
              <span className="text-xs font-black text-[#2D3548] uppercase tracking-wider mb-1.5 block">
                Select Payment Method:
              </span>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-white border-3 border-[#2D3548] rounded-2xl shadow-[3px_3px_0px_#2D3548]">
                {[
                  { id: 'cash', label: 'Cash', icon: <CashIcon sx={{ fontSize: 16 }} /> },
                  { id: 'qr_pay', label: 'QR Pay', icon: <QrIcon sx={{ fontSize: 16 }} /> },
                  { id: 'card', label: 'Card', icon: <CardIcon sx={{ fontSize: 16 }} /> },
                  { id: 'split', label: 'Split', icon: <SplitIcon sx={{ fontSize: 16 }} /> },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-black border-2 transition-all ${
                      paymentMethod === m.id
                        ? 'bg-[#FF85A1] text-white border-[#2D3548] shadow-[2px_2px_0px_#2D3548]'
                        : 'bg-transparent text-[#2D3548] border-transparent hover:bg-[#F4F9FE]'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Tab Content */}
            {paymentMethod === 'cash' && (
              <div className="p-4 rounded-3xl bg-[#FAF5FF] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
                <h4 className="text-xs font-black text-[#6B9BC8] uppercase tracking-wider mb-2">
                  💵 Cash Tendered & Quick Presets
                </h4>

                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-lg text-[#2D3548]">
                    {eventConfig.currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    placeholder="Amount received from attendee"
                    value={tenderedCash}
                    onChange={(e) => setTenderedCash(e.target.value)}
                    autoFocus
                    className="w-full bg-white border-2 border-[#2D3548] rounded-2xl pl-10 pr-4 py-2.5 text-base font-black text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
                  />
                </div>

                {/* Quick denomination chips */}
                <span className="text-[11px] font-bold text-[#616D86] block mb-1.5">
                  Quick Denomination Presets:
                </span>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => handleQuickCash(finalTotal)}
                    className="px-3 py-1 rounded-xl text-xs font-black bg-white text-[#2D3548] border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] hover:bg-[#F4F9FE]"
                  >
                    Exact ({formatCurrency(finalTotal, eventConfig.currencySymbol)})
                  </button>
                  {[5, 10, 20, 50, 100].map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => handleQuickCash(bill)}
                      className={`px-3 py-1 rounded-xl text-xs font-black border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] ${
                        numericTendered === bill
                          ? 'bg-[#FF85A1] text-white'
                          : 'bg-white text-[#2D3548] hover:bg-[#F4F9FE]'
                      }`}
                    >
                      {eventConfig.currencySymbol}{bill}
                    </button>
                  ))}
                  {finalTotal > 20 && (
                    <button
                      type="button"
                      onClick={() => handleQuickCash(Math.ceil(finalTotal / 10) * 10)}
                      className="px-3 py-1 rounded-xl text-xs font-black bg-white text-[#2D3548] border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] hover:bg-[#F4F9FE]"
                    >
                      Round {formatCurrency(Math.ceil(finalTotal / 10) * 10, eventConfig.currencySymbol)}
                    </button>
                  )}
                </div>

                {/* Change Display Box */}
                <div
                  className={`p-3.5 rounded-2xl border-3 border-[#2D3548] shadow-[3px_3px_0px_#2D3548] flex items-center justify-between ${
                    isCashSufficient ? 'bg-[#A3E7D0]' : 'bg-[#FFD6E8]'
                  }`}
                >
                  <div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider block ${
                        isCashSufficient ? 'text-[#1B5E45]' : 'text-[#BE185D]'
                      }`}
                    >
                      {isCashSufficient ? 'RETURN CHANGE TO ATTENDEE' : 'INSUFFICIENT CASH RECEIVED'}
                    </span>
                    <div
                      className={`text-2xl font-black ${
                        isCashSufficient ? 'text-[#1B5E45]' : 'text-[#BE185D]'
                      }`}
                    >
                      {isCashSufficient
                        ? formatCurrency(changeDue, eventConfig.currencySymbol)
                        : `Need +${formatCurrency(finalTotal - numericTendered, eventConfig.currencySymbol)}`}
                    </div>
                  </div>
                  <div className="text-3xl">
                    {isCashSufficient ? (changeDue === 0 ? '✨' : '🪙') : '⚠️'}
                  </div>
                </div>
              </div>
            )}

            {/* QR Pay Content */}
            {paymentMethod === 'qr_pay' && (
              <div className="p-4 rounded-3xl bg-[#F0FDF4] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] text-center">
                <h4 className="text-xs font-black text-[#1B5E45] uppercase tracking-wider mb-1">
                  📱 Scan QR to Pay ({eventConfig.currencyCode})
                </h4>
                <span className="text-xs font-bold text-[#616D86] block mb-3">
                  Attendee can scan with DuitNow / PayNow / PromptPay / CashApp / Venmo
                </span>

                <div className="w-44 h-44 mx-auto p-2 bg-white rounded-2xl border-3 border-[#2D3548] shadow-[3px_3px_0px_#2D3548] flex flex-col items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-28 h-28">
                    <rect x="5" y="5" width="28" height="28" fill="#10B981" rx="4" />
                    <rect x="11" y="11" width="16" height="16" fill="#FFF" />
                    <rect x="15" y="15" width="8" height="8" fill="#047857" />

                    <rect x="67" y="5" width="28" height="28" fill="#10B981" rx="4" />
                    <rect x="73" y="11" width="16" height="16" fill="#FFF" />
                    <rect x="77" y="15" width="8" height="8" fill="#047857" />

                    <rect x="5" y="67" width="28" height="28" fill="#10B981" rx="4" />
                    <rect x="11" y="73" width="16" height="16" fill="#FFF" />
                    <rect x="15" y="77" width="8" height="8" fill="#047857" />

                    <circle cx="50" cy="20" r="3" fill="#10B981" />
                    <circle cx="40" cy="30" r="2.5" fill="#047857" />
                    <circle cx="60" cy="35" r="3" fill="#10B981" />
                    <circle cx="50" cy="50" r="4" fill="#FF85A1" />
                    <circle cx="38" cy="55" r="3" fill="#10B981" />
                    <circle cx="62" cy="55" r="2.5" fill="#047857" />
                    <circle cx="45" cy="70" r="3" fill="#10B981" />
                    <circle cx="55" cy="80" r="2.5" fill="#047857" />
                    <circle cx="80" cy="50" r="3.5" fill="#10B981" />
                    <circle cx="85" cy="70" r="3" fill="#10B981" />
                    <circle cx="70" cy="85" r="2.5" fill="#047857" />
                  </svg>
                  <span className="text-[10px] font-black text-[#1B5E45] tracking-wider">
                    CHIBISHOPPU • {eventConfig.boothNumber}
                  </span>
                </div>

                <div className="text-xl font-black text-[#1B5E45] mt-2.5">
                  {formatCurrency(finalTotal, eventConfig.currencySymbol)}
                </div>

                <button
                  type="button"
                  onClick={() => setQrVerified(!qrVerified)}
                  className={`mt-2.5 px-4 py-1.5 rounded-xl text-xs font-black border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] ${
                    qrVerified ? 'bg-[#A3E7D0] text-[#1B5E45]' : 'bg-white text-[#2D3548]'
                  }`}
                >
                  {qrVerified ? 'Payment Screen Verified ✓' : 'Click to Verify Screen'}
                </button>
              </div>
            )}

            {/* Card / Contactless Content */}
            {paymentMethod === 'card' && (
              <div className="p-4 rounded-3xl bg-[#F0F9FF] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] text-center">
                <h4 className="text-xs font-black text-[#4A7AA7] uppercase tracking-wider mb-1">
                  💳 Contactless / Chip Card Terminal
                </h4>
                <span className="text-xs font-bold text-[#616D86] block mb-3">
                  Tap physical card, Apple Pay, Google Wallet, or insert chip
                </span>

                <div className="w-52 h-32 mx-auto p-3 rounded-2xl text-white flex flex-col justify-between border-3 border-[#2D3548] shadow-[3px_3px_0px_#2D3548] bg-gradient-to-br from-[#6B9BC8] to-[#2D3548]">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-wider opacity-90">
                    <span>CHIBISHOPPU POS</span>
                    <span>WIRELESS NFC 📶</span>
                  </div>
                  <div className="text-left font-mono tracking-widest text-sm font-black">
                    •••• •••• •••• 8824
                  </div>
                  <div className="flex justify-between items-end text-[11px] font-bold">
                    <span>AMOUNT: {formatCurrency(finalTotal, eventConfig.currencySymbol)}</span>
                    <span className="font-black text-emerald-300">READY</span>
                  </div>
                </div>

                <span className="block text-[11px] font-bold text-[#616D86] mt-2">
                  No additional processing fee for ACG attendees.
                </span>
              </div>
            )}

            {/* Split Payment Content */}
            {paymentMethod === 'split' && (
              <div className="p-4 rounded-3xl bg-[#FFF7ED] border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548]">
                <h4 className="text-xs font-black text-[#616D86] uppercase tracking-wider mb-2">
                  🔀 Split Payment (Cash + QR / Card)
                </h4>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#616D86] block mb-1">
                      Part 1: Cash ({eventConfig.currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-2.5 py-1.5 text-xs font-black text-[#2D3548] shadow-[1px_1px_0px_#2D3548]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#616D86] block mb-1">
                      Part 2: Balance Electronic
                    </label>
                    <div className="p-1.5 bg-white border-2 border-[#2D3548] rounded-xl text-center shadow-[1px_1px_0px_#2D3548]">
                      <span className="text-xs font-black text-[#2D3548]">
                        {formatCurrency(splitElectronicDue, eventConfig.currencySymbol)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitMethod('qr_pay')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] ${
                      splitMethod === 'qr_pay' ? 'bg-[#FF85A1] text-white' : 'bg-white text-[#2D3548]'
                    }`}
                  >
                    Remaining via QR Pay
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMethod('card')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] ${
                      splitMethod === 'card' ? 'bg-[#FF85A1] text-white' : 'bg-white text-[#2D3548]'
                    }`}
                  >
                    Remaining via Card
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Transaction Notes / Attendee Tag (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cosplay: Hatsune Miku, VIP badge, special commission note"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>
          </div>

          {/* Right Column: Order Summary & Receipt Preview Box */}
          <div className="md:col-span-5 p-4 rounded-3xl bg-white border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2 pb-2 border-b-2 border-[#2D3548]/20">
                <span className="text-sm font-black text-[#2D3548] uppercase tracking-wider">
                  Order Summary
                </span>
                <span className="text-xs text-[#616D86] font-mono font-bold">
                  {cart.length} item{cart.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Items scrollable list */}
              <div className="max-h-44 overflow-y-auto pr-1 mb-3 space-y-1.5">
                {cart.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="flex justify-between items-center py-1 border-b border-dashed border-[#2D3548]/15 text-xs"
                  >
                    <div className="truncate pr-2">
                      <span className="mr-1.5">{item.emoji}</span>
                      <span className="font-black text-[#2D3548]">{item.name}</span>
                      <span className="text-[#616D86] text-[11px] ml-1">x{item.quantity}</span>
                    </div>
                    <span className="font-black text-[#2D3548] whitespace-nowrap">
                      {formatCurrency(item.unitPrice * item.quantity, eventConfig.currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Financial Breakdowns */}
              <div className="space-y-1.5 text-xs text-[#616D86] font-bold pt-2 border-t-2 border-[#2D3548]/20">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-[#2D3548]">{formatCurrency(subtotal, eventConfig.currencySymbol)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#FF85A1]">
                    <span>Discount ({Math.round(discountRate * 100)}%):</span>
                    <span>-{formatCurrency(discountAmount, eventConfig.currencySymbol)}</span>
                  </div>
                )}

                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({eventConfig.taxPercent}%):</span>
                    <span>+{formatCurrency(taxAmount, eventConfig.currencySymbol)}</span>
                  </div>
                )}

                <div className="h-[2px] bg-[#2D3548]/20 my-1"></div>

                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-sm font-black text-[#2D3548] uppercase">Total Payable:</span>
                  <span className="text-2xl font-black text-[#FF85A1]">
                    {formatCurrency(finalTotal, eventConfig.currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-[#1B5E45] font-bold pt-0.5">
                  <span>Est. Gross Profit:</span>
                  <span>+{formatCurrency(netProfit, eventConfig.currencySymbol)}</span>
                </div>
              </div>

              {/* Stamp Rally Perk Notice if threshold reached */}
              {finalTotal >= eventConfig.stampRallyThreshold && (
                <div className="mt-3 p-2.5 rounded-2xl bg-[#FFD6E8] border-2 border-[#2D3548] text-xs font-black text-[#BE185D] shadow-[2px_2px_0px_#2D3548]">
                  ⭐ Qualifies for <strong>+1 ACG Booth Stamp</strong> (Spend &gt; {formatCurrency(eventConfig.stampRallyThreshold, eventConfig.currencySymbol)})!
                </div>
              )}
            </div>

            <div className="mt-4">
              <button
                type="button"
                disabled={paymentMethod === 'cash' && !isCashSufficient}
                onClick={handleFinishPayment}
                className={`w-full py-3 rounded-2xl text-sm font-black uppercase tracking-wider border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] active:translate-y-0.5 transition-all ${
                  paymentMethod === 'cash' && !isCashSufficient
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#FF85A1] hover:bg-[#FF6B8D] text-white'
                }`}
              >
                {isProcessingCard
                  ? 'Connecting Terminal...'
                  : `Complete Sale (${formatCurrency(finalTotal, eventConfig.currencySymbol)})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
