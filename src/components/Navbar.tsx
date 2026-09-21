import React from 'react';
import {
  PointOfSale as PosIcon,
  Inventory2 as InventoryIcon,
  Assessment as ReportsIcon,
  Tune as SettingsIcon,
} from '@mui/icons-material';
import { EventConfig, Product } from '../types';
import { soundEngine } from '../utils/audio';
const officialLogo = `${import.meta.env.BASE_URL}ChibishoppuLogo2.jpeg`;

interface NavbarProps {
  currentTab: number;
  onTabChange: (newTab: number) => void;
  eventConfig: EventConfig;
  products: Product[];
  cartCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  eventConfig,
  products,
  cartCount,
}) => {
  const lowStockCount = products.filter((p) => p.stock <= p.lowStockThreshold).length;

  const navItems = [
    { id: 0, label: 'Sales / Register', shortLabel: 'Sales', emoji: '🛒', icon: <PosIcon fontSize="small" />, badge: cartCount },
    { id: 1, label: 'Inventory Stock', shortLabel: 'Stock', emoji: '📦', icon: <InventoryIcon fontSize="small" />, badge: lowStockCount, badgeColor: 'warning' as const },
    { id: 2, label: 'Reports & Audit', shortLabel: 'Report', emoji: '📊', icon: <ReportsIcon fontSize="small" /> },
    { id: 3, label: 'Booth Setup', shortLabel: 'Setup', emoji: '⚙️', icon: <SettingsIcon fontSize="small" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-[#9AC8ED] via-[#B8DCFA] to-[#FFBFD7] border-b-4 border-[#2D3548] flex flex-col lg:flex-row lg:h-20 items-center lg:justify-between px-3 sm:px-4 lg:px-6 py-2 lg:py-0 relative overflow-hidden select-none shadow-[0_4px_12px_rgba(45,53,72,0.08)]">
      {/* Subtle background graphic */}
      <div className="absolute top-0 right-0 opacity-15 pointer-events-none">
        <svg width="220" height="220" viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="50" r="40" />
          <path d="M30 40 Q 50 60 70 40" stroke="#2D3548" strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* Left: Brand Identity */}
      <div
        className="flex items-center gap-3 cursor-pointer z-10 min-w-0 shrink"
        onClick={() => onTabChange(0)}
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-white rounded-2xl border-3 sm:border-4 border-[#2D3548] flex items-center justify-center shadow-[2px_2px_0px_#2D3548] hover:scale-105 transition-transform overflow-hidden p-0.5">
          <img
            src={officialLogo}
            alt="Chibishoppu Logo"
            className="w-full h-full object-cover rounded-xl"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#2D3548] tracking-tight leading-none font-sans drop-shadow-sm whitespace-nowrap">
              Chibishoppu
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF85A1] text-white px-1.5 py-0.5 rounded border border-[#2D3548] shadow-[1px_1px_0px_#2D3548] hidden sm:inline">
              ACG POS
            </span>
          </div>
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider bg-[#2D3548] text-white px-2 py-0.5 mt-1 rounded inline-block shadow-[1px_1px_0px_rgba(0,0,0,0.2)] truncate max-w-[140px] sm:max-w-[220px] lg:max-w-none">
            {eventConfig.boothNumber} @ {eventConfig.eventName}
          </p>
        </div>
      </div>

      {/* Navigation Tabs - Pastel Neo-Brutalist Pills (own row below brand on <lg) */}
      <div className="flex items-center gap-1.5 sm:gap-2 z-10 min-w-0 max-w-full overflow-x-auto mt-1.5 lg:mt-0">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundEngine.playPop();
                onTabChange(item.id);
              }}
              className={`flex items-center gap-1.5 shrink-0 px-2.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl border-2 sm:border-3 border-[#2D3548] font-black text-xs sm:text-sm uppercase tracking-wide transition-all ${
                isActive
                  ? 'bg-[#FFD6E8] text-[#2D3548] shadow-[3px_3px_0px_#2D3548] -translate-y-0.5'
                  : 'bg-white/90 text-[#2D3548] hover:bg-white hover:shadow-[2px_2px_0px_#2D3548] opacity-90'
              }`}
            >
              <span className="text-base sm:text-lg">{item.emoji}</span>
              <span className="hidden lg:inline">{item.label}</span>
              <span className="inline lg:hidden">{item.shortLabel}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-[#FF85A1] text-white text-[10px] font-black rounded-full border border-[#2D3548]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};

