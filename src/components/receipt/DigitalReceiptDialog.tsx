import React, { useMemo } from 'react';
import { Dialog } from '@mui/material';
import { Close as CloseIcon, QrCode2 as QrIcon } from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';
import { Transaction, EventConfig } from '../../types';
import { buildDigitalReceiptUrl } from '../../utils/digitalReceipt';
import { formatCurrency } from '../../utils/export';

interface DigitalReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  eventConfig: EventConfig;
}

/**
 * Shows a QR code encoding the digital receipt viewer URL.
 * Fully local — no network needed to generate. Customer scans with their
 * phone camera; the hosted static viewer decodes the URL fragment.
 */
export const DigitalReceiptDialog: React.FC<DigitalReceiptDialogProps> = ({
  open,
  onClose,
  transaction,
  eventConfig,
}) => {
  const url = useMemo(
    () => (transaction ? buildDigitalReceiptUrl(transaction, eventConfig) : ''),
    [transaction, eventConfig]
  );

  if (!transaction) return null;

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
            margin: { xs: 2, sm: 4 },
          },
        },
      }}
    >
      <div className="bg-[#FFD6E8] border-b-3 border-[#2D3548] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white border-2 border-[#2D3548] flex items-center justify-center shadow-[1px_1px_0px_#2D3548]">
            <QrIcon sx={{ fontSize: 18, color: '#2D3548' }} />
          </div>
          <h3 className="text-base font-black text-[#2D3548] uppercase tracking-wider">
            Digital Receipt
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE2ED] text-[#2D3548] border-2 border-[#2D3548] flex items-center justify-center font-black shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      <div className="p-5 flex flex-col items-center gap-3">
        <p className="text-xs font-bold text-[#616D86] text-center">
          Ask the customer to scan this QR code with their phone camera to view the receipt.
        </p>

        <div className="p-3 bg-white rounded-2xl border-3 border-[#2D3548] shadow-[3px_3px_0px_#2D3548]">
          <QRCodeCanvas value={url} size={200} level="M" marginSize={1} />
        </div>

        <div className="text-center">
          <p className="text-sm font-black text-[#2D3548]">Receipt #{transaction.receiptNumber}</p>
          <p className="text-xs font-bold text-[#FF85A1] mt-0.5">
            Total {formatCurrency(transaction.total, eventConfig.currencySymbol)}
          </p>
        </div>

        <p className="text-[10px] font-medium text-[#616D86] text-center">
          Works offline here — the customer's phone needs internet to open the page.
        </p>

        <button
          onClick={onClose}
          className="w-full bg-[#FF85A1] hover:bg-[#FF6B8D] text-white border-2 border-[#2D3548] px-4 py-2 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
        >
          Close
        </button>
      </div>
    </Dialog>
  );
};
