import React, { useState } from 'react';
import { Dialog } from '@mui/material';
import { Storefront as BoothIcon } from '@mui/icons-material';
import { EventConfig } from '../../types';
import { soundEngine } from '../../utils/audio';
const officialLogo = `${import.meta.env.BASE_URL}ChibishoppuLogo2.jpeg`;

interface EventSetupGateProps {
  eventConfig: EventConfig;
  onSave: (cfg: EventConfig) => void;
}

const inputCls =
  'w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none';
const labelCls = 'text-[11px] font-black uppercase text-[#2D3548] block mb-1';

/**
 * First-run / post-Close-Event setup gate. Rendered whenever the event name
 * is blank — the dialog cannot be dismissed until the event is configured,
 * so a sale can never be recorded against an unconfigured booth.
 */
export const EventSetupGate: React.FC<EventSetupGateProps> = ({ eventConfig, onSave }) => {
  const [eventName, setEventName] = useState(eventConfig.eventName);
  const [boothNumber, setBoothNumber] = useState(eventConfig.boothNumber);
  const [cashierName, setCashierName] = useState(eventConfig.cashierName);
  const [location, setLocation] = useState(eventConfig.location || '');
  const [startDate, setStartDate] = useState(eventConfig.startDate || '');
  const [endDate, setEndDate] = useState(eventConfig.endDate || '');
  const [openingCashFloat, setOpeningCashFloat] = useState(eventConfig.openingCashFloat.toString());

  const canSave = eventName.trim().length > 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    soundEngine.playSuccessChime();
    onSave({
      ...eventConfig,
      eventName: eventName.trim(),
      boothNumber: boothNumber.trim(),
      cashierName: cashierName.trim(),
      location: location.trim(),
      startDate,
      endDate,
      openingCashFloat: parseFloat(openingCashFloat) || 0,
    });
  };

  return (
    <Dialog
      open
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: '24px', border: '4px solid #2D3548', boxShadow: '8px 8px 0px #2D3548' },
        },
      }}
    >
      <form onSubmit={handleSave} className="p-5 sm:p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl border-2 border-[#2D3548] flex items-center justify-center shadow-[2px_2px_0px_#2D3548] overflow-hidden p-0.5 shrink-0">
            <img src={officialLogo} alt="Chibishoppu Logo" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#2D3548] uppercase tracking-wider leading-tight">
              Set Up Your Booth
            </h2>
            <p className="text-xs font-bold text-[#616D86]">
              Before you start selling, tell us about this event.
            </p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={labelCls}>
              Event Name <span className="text-[#FF85A1]">*</span>
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Comic Fiesta 2026"
              autoFocus
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Booth Table / Number</label>
            <input
              type="text"
              value={boothNumber}
              onChange={(e) => setBoothNumber(e.target.value)}
              placeholder="Enter booth number"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Cashier Staff</label>
            <input
              type="text"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              placeholder="Enter cashier name"
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Venue / Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Mid Valley Exhibition Hall"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Event Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Event End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Opening Cash Float (Drawer Start)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-[#2D3548]">
                {eventConfig.currencySymbol}
              </span>
              <input
                type="number"
                value={openingCashFloat}
                onChange={(e) => setOpeningCashFloat(e.target.value)}
                step="1"
                min="0"
                className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSave}
          className="self-end bg-[#FF85A1] hover:bg-[#FF6B8D] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white border-3 border-[#2D3548] px-6 py-2.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_#2D3548] active:translate-y-0.5 active:shadow-[2px_2px_0px_#2D3548] flex items-center gap-2"
        >
          <BoothIcon sx={{ fontSize: 18 }} />
          <span>Start Selling</span>
        </button>
      </form>
    </Dialog>
  );
};
