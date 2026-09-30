import React, { useState } from 'react';
import { Dialog } from '@mui/material';
import {
  Close as CloseIcon,
  Inventory as RestockIcon,
} from '@mui/icons-material';
import { Product, EventConfig } from '../../types';
import { formatCurrency } from '../../utils/export';
import { soundEngine } from '../../utils/audio';

interface QuickRestockModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onBatchRestock: (updates: { id: string; addQty: number }[]) => void;
  eventConfig: EventConfig;
}

export const QuickRestockModal: React.FC<QuickRestockModalProps> = ({
  open,
  onClose,
  products,
  onBatchRestock,
  eventConfig,
}) => {
  const [search, setSearch] = useState('');
  const [restockMap, setRestockMap] = useState<Record<string, number>>({});

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleSetAdd = (id: string, delta: number) => {
    setRestockMap((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleApplyRestock = () => {
    const updates = Object.entries(restockMap)
      .filter(([_, qty]) => qty > 0)
      .map(([id, addQty]) => ({ id, addQty }));

    if (updates.length > 0) {
      soundEngine.playCoin();
      onBatchRestock(updates);
    }
    setRestockMap({});
    onClose();
  };

  const totalRestockCount = Object.values(restockMap).reduce((s, v) => s + v, 0);

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
          },
        },
      }}
    >
      <div className="bg-[#D8EDFC] border-b-3 border-[#2D3548] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RestockIcon sx={{ color: '#2D3548', fontSize: 24 }} />
          <div>
            <h3 className="text-base font-black text-[#2D3548] uppercase tracking-wider">
              Quick Booth Restock / Stock-In
            </h3>
            <p className="text-[11px] font-bold text-[#616D86]">
              Add extra units unpacked from backup boxes during event hours
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE2ED] text-[#2D3548] border-2 border-[#2D3548] flex items-center justify-center font-black shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      <div className="p-4 bg-[#F4F9FE] flex flex-col gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter items to restock..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none placeholder:text-[#616D86]/60"
          />
        </div>

        <div className="max-h-[340px] overflow-y-auto flex flex-col gap-2 pr-1">
          {filtered.map((product) => {
            const addAmount = restockMap[product.id] || 0;
            return (
              <div
                key={product.id}
                className={`p-3 rounded-2xl border-2 border-[#2D3548] flex items-center justify-between transition-all ${
                  addAmount > 0
                    ? 'bg-[#FFD6E8]/40 shadow-[3px_3px_0px_#2D3548]'
                    : 'bg-white shadow-[2px_2px_0px_#2D3548]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="text-2xl p-1 bg-[#F4F9FE] border-2 border-[#2D3548] rounded-xl flex-shrink-0">
                    {product.emoji}
                  </span>
                  <div className="truncate">
                    <p className="text-xs font-black text-[#2D3548] truncate">
                      {product.name}
                    </p>
                    <p className="text-[11px] font-bold text-[#616D86]">
                      Stock: <span className="font-black text-[#2D3548]">{product.stock}</span> • {formatCurrency(product.price, eventConfig.currencySymbol)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetAdd(product.id, 5)}
                    className="px-2 py-1 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] rounded-lg text-xs font-black shadow-[1px_1px_0px_#2D3548] active:translate-y-0.5"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetAdd(product.id, 10)}
                    className="px-2 py-1 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] rounded-lg text-xs font-black shadow-[1px_1px_0px_#2D3548] active:translate-y-0.5"
                  >
                    +10
                  </button>
                  <input
                    type="number"
                    value={addAmount === 0 ? '' : addAmount}
                    placeholder="+0"
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setRestockMap((prev) => ({ ...prev, [product.id]: Math.max(0, val) }));
                    }}
                    className="w-14 bg-white border-2 border-[#2D3548] rounded-lg py-1 px-1 text-center text-xs font-black text-[#2D3548] shadow-[1px_1px_0px_#2D3548] focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 bg-[#F4F9FE] border-t-3 border-[#2D3548] flex items-center justify-between">
        <p className="text-xs font-black uppercase text-[#2D3548]">
          Total to add: <span className="text-[#FF85A1] font-black text-sm">+{totalRestockCount} units</span>
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase text-[#2D3548] bg-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] hover:bg-[#F4F9FE] active:translate-y-0.5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={totalRestockCount === 0}
            onClick={handleApplyRestock}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#FF85A1] hover:bg-[#FF6B8D] disabled:opacity-50 disabled:cursor-not-allowed text-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5 transition-all"
          >
            Apply Restock (+{totalRestockCount})
          </button>
        </div>
      </div>
    </Dialog>
  );
};
