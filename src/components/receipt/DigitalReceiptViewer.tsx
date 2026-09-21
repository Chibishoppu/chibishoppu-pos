import React, { useMemo, useState } from 'react';
import { Button } from '@mui/material';
import {
  Share as ShareIcon,
  Print as PrintIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { readReceiptFromHash, DigitalReceiptPayload } from '../../utils/digitalReceipt';
import { formatCurrency } from '../../utils/export';

const logo = `${import.meta.env.BASE_URL}ChibishoppuLogo2.jpeg`;

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  missing: {
    title: 'No receipt data',
    body: 'This digital receipt could not be opened. Please ask the seller to display the QR code again.',
  },
  invalid: {
    title: 'Invalid receipt data',
    body: 'This digital receipt could not be opened. Please ask the seller to display the QR code again.',
  },
  version: {
    title: 'Unsupported receipt version',
    body: 'This receipt was made with a newer format. Please ask the seller for help.',
  },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Static, read-only receipt viewer for customers.
 * Decodes #data=... from the URL fragment — never touches the POS database.
 */
export const DigitalReceiptViewer: React.FC = () => {
  const result = useMemo(() => readReceiptFromHash(), []);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: 'Chibishoppu Receipt',
      text: `Your Chibishoppu receipt`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => window.print();

  // --- error / empty states ---
  if (result.ok === false) {
    const copy = ERROR_COPY[result.reason];
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="w-full max-w-sm bg-white rounded-3xl border-3 border-[#2D3548] shadow-[6px_6px_0px_#2D3548] p-6 text-center">
          <img
            src={logo}
            alt="Chibishoppu"
            className="w-16 h-16 mx-auto rounded-2xl border-2 border-[#2D3548] object-cover shadow-[2px_2px_0px_#2D3548]"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-lg font-black text-[#2D3548] mt-3">{copy.title}</h1>
          <p className="text-sm font-medium text-[#616D86] mt-1.5 leading-relaxed">{copy.body}</p>
        </div>
      </div>
    );
  }

  const receipt: DigitalReceiptPayload = result.receipt;
  const cur = receipt.cur || 'RM';

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6">
      {/* Receipt card */}
      <div className="w-full max-w-sm bg-white rounded-3xl border-3 border-[#2D3548] shadow-[6px_6px_0px_#2D3548] overflow-hidden">
        {/* Header */}
        <div className="bg-[#FFD6E8] border-b-3 border-[#2D3548] px-5 py-4 text-center">
          <img
            src={logo}
            alt="Chibishoppu"
            className="w-16 h-16 mx-auto rounded-2xl border-2 border-[#2D3548] object-cover shadow-[2px_2px_0px_#2D3548]"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl font-black text-[#FF85A1] tracking-wide mt-2">ちびショップ Chibishoppu</h1>
          <p className="text-[11px] font-bold text-[#616D86] uppercase tracking-widest">Digital Receipt</p>
          {receipt.e && (
            <p className="text-[11px] font-black text-[#2D3548] mt-1">{receipt.e}</p>
          )}
        </div>

        <div className="px-5 py-4">
          {/* Meta */}
          <div className="text-center pb-3 border-b-2 border-dashed border-[#2D3548]/25">
            <p className="text-sm font-black text-[#2D3548]">Receipt #{receipt.r}</p>
            <p className="text-xs font-medium text-[#616D86] mt-0.5">
              {fmtDate(receipt.d)} • {fmtTime(receipt.d)}
            </p>
          </div>

          {/* Items */}
          <div className="py-3 border-b-2 border-dashed border-[#2D3548]/25 space-y-2.5">
            {receipt.i.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#2D3548] leading-snug">{item.n}</p>
                  <p className="text-[11px] font-medium text-[#616D86]">
                    {item.q} × {formatCurrency(item.p, cur)}
                  </p>
                </div>
                <span className="text-sm font-black text-[#2D3548] whitespace-nowrap">
                  {formatCurrency(item.s, cur)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-3 space-y-1 text-xs font-medium text-[#616D86]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-[#2D3548]">{formatCurrency(receipt.st, cur)}</span>
            </div>
            {receipt.dc ? (
              <div className="flex justify-between text-[#FF85A1]">
                <span>Discount</span>
                <span className="font-bold">-{formatCurrency(receipt.dc, cur)}</span>
              </div>
            ) : null}
            {receipt.tx ? (
              <div className="flex justify-between">
                <span>Tax</span>
                <span className="font-bold text-[#2D3548]">+{formatCurrency(receipt.tx, cur)}</span>
              </div>
            ) : null}
            <div className="flex justify-between items-center pt-2 mt-1 border-t-2 border-[#2D3548]/15">
              <span className="text-sm font-black text-[#2D3548] uppercase tracking-wide">Total</span>
              <span className="text-lg font-black text-[#FF85A1]">{formatCurrency(receipt.t, cur)}</span>
            </div>
            {receipt.pm && (
              <div className="flex justify-between pt-1">
                <span>Paid via</span>
                <span className="font-black uppercase text-[#2D3548]">{receipt.pm}</span>
              </div>
            )}
          </div>

          {/* Thanks */}
          <div className="text-center pt-2 pb-1">
            <p className="text-sm font-black text-[#2D3548]">Thank you! ♡</p>
            <p className="text-[10px] font-medium text-[#616D86] mt-0.5">@chibishoppu.crafts</p>
          </div>
        </div>
      </div>

      {/* Actions — hidden when printing */}
      <div className="no-print w-full max-w-sm flex gap-2.5 mt-4">
        <Button
          fullWidth
          variant="contained"
          startIcon={copied ? <CopyIcon /> : <ShareIcon />}
          onClick={handleShare}
          sx={{
            bgcolor: '#FF85A1',
            color: '#fff',
            border: '2px solid #2D3548',
            borderRadius: '14px',
            fontWeight: 900,
            textTransform: 'uppercase',
            fontSize: '0.72rem',
            boxShadow: '3px 3px 0px #2D3548',
            '&:hover': { bgcolor: '#FF6B8D' },
          }}
        >
          {copied ? 'Link Copied!' : 'Share Receipt'}
        </Button>
        <Button
          fullWidth
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
          sx={{
            bgcolor: '#D8EDFC',
            color: '#2D3548',
            border: '2px solid #2D3548',
            borderRadius: '14px',
            fontWeight: 900,
            textTransform: 'uppercase',
            fontSize: '0.72rem',
            boxShadow: '3px 3px 0px #2D3548',
            '&:hover': { bgcolor: '#BEE0FB' },
          }}
        >
          Save / Print
        </Button>
      </div>
      <p className="no-print text-[10px] font-medium text-[#616D86] mt-3 text-center">
        Powered by Chibishoppu POS — receipt encoded in this link, no account needed.
      </p>
    </div>
  );
};
