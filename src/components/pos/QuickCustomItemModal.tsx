import React, { useState } from 'react';
import { Dialog } from '@mui/material';
import { ProductCategory, CartItem } from '../../types';
import { CATEGORY_META } from '../../data/categories';
import { soundEngine } from '../../utils/audio';

interface QuickCustomItemModalProps {
  open: boolean;
  onClose: () => void;
  onAddCustomItem: (item: CartItem) => void;
  currencySymbol: string;
}

export const QuickCustomItemModal: React.FC<QuickCustomItemModalProps> = ({
  open,
  onClose,
  onAddCustomItem,
  currencySymbol,
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [category, setCategory] = useState<ProductCategory>('card_holder');
  const [customNote, setCustomNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price);
    if (!name || isNaN(parsedPrice) || parsedPrice < 0) return;

    const parsedCost = parseFloat(cost) || (parsedPrice * 0.4);

    const newItem: CartItem = {
      id: `custom-${Date.now()}`,
      productId: `custom-${Date.now()}`,
      name: name.trim(),
      category,
      emoji: CATEGORY_META[category]?.emoji || '✨',
      unitPrice: parsedPrice,
      unitCost: parsedCost,
      quantity: Math.max(1, quantity),
      customNote: customNote.trim() ? customNote.trim() : undefined,
    };

    soundEngine.playPop();
    onAddCustomItem(newItem);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setName('');
    setPrice('');
    setCost('');
    setCategory('card_holder');
    setCustomNote('');
    setQuantity(1);
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
          },
        },
      }}
    >
      <form onSubmit={handleSubmit}>
        <div className="bg-gradient-to-r from-[#D8EDFC] to-[#FFD6E8] border-b-3 border-[#2D3548] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-[#2D3548] flex items-center justify-center shadow-[2px_2px_0px_#2D3548]">
              <span className="text-xl">✨</span>
            </div>
            <div>
              <h3 className="text-base font-black text-[#2D3548] uppercase tracking-wider">
                Quick Custom / Commission Item
              </h3>
              <p className="text-xs font-bold text-[#616D86]">
                Add on-the-spot customizations (lettering, live decoden, clasps)
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4 bg-[#F4F9FE]">
          <div>
            <label className="text-xs font-black uppercase text-[#2D3548] block mb-1">
              Item Description / Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Custom Decoden Lettering / Extra Keychain Clasp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase text-[#2D3548] block mb-1">
                Selling Price ({currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="0.00"
                className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase text-[#2D3548] block mb-1">
                Cost ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Auto-estimated 40%"
                className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase text-[#2D3548] block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-black text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              >
                {Object.entries(CATEGORY_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.emoji} {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-[#2D3548] block mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-[#2D3548] block mb-1">
              Custom Note / Attendee Request
            </label>
            <textarea
              placeholder="e.g. Name: 'Hina', Pink Ribbon, Holo Star seal"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              rows={2}
              className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="p-3 bg-[#F4F9FE] border-t-3 border-[#2D3548] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase text-[#2D3548] bg-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] hover:bg-[#F4F9FE] active:translate-y-0.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name || !price}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5 transition-all ${
              !name || !price
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-[#FF85A1] hover:bg-[#FF6B8D] text-white'
            }`}
          >
            Add to Order
          </button>
        </div>
      </form>
    </Dialog>
  );
};
