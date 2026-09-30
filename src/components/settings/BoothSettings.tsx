import React, { useState } from 'react';
import {
  Save as SaveIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import { EventConfig } from '../../types';
import { soundEngine } from '../../utils/audio';
const officialLogo = `${import.meta.env.BASE_URL}ChibishoppuLogo2.jpeg`;

interface BoothSettingsProps {
  eventConfig: EventConfig;
  onUpdateEventConfig: (newConfig: EventConfig) => void;
  onResetDemoData: () => void;
}

export const BoothSettings: React.FC<BoothSettingsProps> = ({
  eventConfig,
  onUpdateEventConfig,
  onResetDemoData,
}) => {
  const [eventName, setEventName] = useState(eventConfig.eventName);
  const [boothNumber, setBoothNumber] = useState(eventConfig.boothNumber);
  const [cashierName, setCashierName] = useState(eventConfig.cashierName);
  const [location, setLocation] = useState(eventConfig.location || '');
  const [startDate, setStartDate] = useState(eventConfig.startDate || '');
  const [endDate, setEndDate] = useState(eventConfig.endDate || '');
  const [currencySymbol, setCurrencySymbol] = useState(eventConfig.currencySymbol);
  const [currencyCode, setCurrencyCode] = useState(eventConfig.currencyCode);
  const [openingCashFloat, setOpeningCashFloat] = useState(eventConfig.openingCashFloat.toString());
  const [taxPercent, setTaxPercent] = useState(eventConfig.taxPercent.toString());
  const [soundEnabled, setSoundEnabled] = useState(eventConfig.soundEffectsEnabled);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: EventConfig = {
      eventName: eventName.trim(),
      boothNumber: boothNumber.trim(),
      cashierName: cashierName.trim(),
      location: location.trim(),
      startDate,
      endDate,
      currencySymbol: currencySymbol || 'RM',
      currencyCode: currencyCode || 'MYR',
      openingCashFloat: parseFloat(openingCashFloat) || 0,
      taxPercent: parseFloat(taxPercent) || 0,
      soundEffectsEnabled: soundEnabled,
    };

    soundEngine.setEnabled(soundEnabled);
    soundEngine.playSuccessChime();
    onUpdateEventConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4 select-none pb-8">
      <form onSubmit={handleSave}>
        <div className="p-4 sm:p-6 rounded-3xl bg-white border-3 sm:border-4 border-[#2D3548] shadow-[5px_5px_0px_#2D3548] flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b-3 border-[#2D3548]">
            <div className="w-12 h-12 bg-white rounded-2xl border-2 border-[#2D3548] flex items-center justify-center shadow-[2px_2px_0px_#2D3548] overflow-hidden p-0.5">
              <img
                src={officialLogo}
                alt="Chibishoppu Logo"
                className="w-full h-full object-cover rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#2D3548] uppercase tracking-wider leading-tight">
                Booth & Convention Settings
              </h2>
              <p className="text-xs font-bold text-[#616D86]">
                Configure event details, currency symbols, starting cash drawer & attendee perks
              </p>
            </div>
          </div>

          {savedSuccess && (
            <div className="p-3 rounded-2xl bg-[#A3E7D0] border-2 border-[#2D3548] text-xs font-black text-[#1B5E45] shadow-[2px_2px_0px_#2D3548] flex items-center gap-2">
              <span>✨</span>
              <span>Settings saved successfully! Active booth configuration updated.</span>
            </div>
          )}

          <div className="h-[2px] bg-[#2D3548]/20 my-1"></div>

          {/* Event & Booth Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Active Event Name
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Enter event name"
                className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Booth Table / Number
              </label>
              <input
                type="text"
                value={boothNumber}
                onChange={(e) => setBoothNumber(e.target.value)}
                placeholder="Enter booth number"
                className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Active Cashier Staff
              </label>
              <input
                type="text"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder="Enter cashier name"
                className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Venue / Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Mid Valley Exhibition Hall"
                className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Event Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Event End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Opening Cash Float (Drawer Start)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-[#2D3548]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={openingCashFloat}
                  onChange={(e) => setOpeningCashFloat(e.target.value)}
                  required
                  step="1"
                  className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="h-[2px] bg-[#2D3548]/20 my-1"></div>

          {/* Currency & Tax Config */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="RM"
                className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Currency Code
              </label>
              <input
                type="text"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                placeholder="MYR"
                className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Booth Sales Tax %
              </label>
              <input
                type="number"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                min="0"
                max="100"
                className="w-full bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
              <span className="text-[10px] font-bold text-[#616D86] mt-0.5 block">0% for ACG booths</span>
            </div>
          </div>

          {/* Sound Effects */}
          <div className="p-3 rounded-2xl bg-[#F4F9FE] border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-[#2D3548] block">Kawaii Audio Effects</span>
              <span className="text-[10px] font-bold text-[#616D86]">Coin & chime audio feedback</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                soundEngine.setEnabled(next);
                if (next) soundEngine.playCoin();
              }}
              className={`px-3 py-1 rounded-xl text-xs font-black border-2 border-[#2D3548] shadow-[1px_1px_0px_#2D3548] transition-all ${
                soundEnabled ? 'bg-[#A3E7D0] text-[#1B5E45]' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {soundEnabled ? 'ENABLED 🔊' : 'MUTED 🔇'}
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-[#FF85A1] hover:bg-[#FF6B8D] text-white border-3 border-[#2D3548] px-6 py-2.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-[4px_4px_0px_#2D3548] active:translate-y-0.5 active:shadow-[2px_2px_0px_#2D3548] flex items-center gap-2"
            >
              <SaveIcon sx={{ fontSize: 18 }} />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </form>

      {/* Danger Zone / Clear All Data */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#FFE2ED] border-3 sm:border-4 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-black text-[#2D3548] text-sm sm:text-base uppercase tracking-wide">
            Clear All Data
          </h3>
          <p className="text-xs font-bold text-[#616D86]">
            Permanently deletes all products, sales transactions & cart. Only booth settings are kept. This cannot be undone.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (window.confirm('Delete ALL products, transactions and cart? This cannot be undone.')) {
              soundEngine.playVoid();
              onResetDemoData();
            }
          }}
          className="bg-white hover:bg-[#FFE2ED] text-rose-600 border-2 border-[#2D3548] px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wide shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5 whitespace-nowrap flex items-center gap-1.5"
        >
          <ResetIcon sx={{ fontSize: 16 }} />
          <span>Clear All Data</span>
        </button>
      </div>
    </div>
  );
};
