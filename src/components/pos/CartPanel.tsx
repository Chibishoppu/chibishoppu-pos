import React from 'react';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  DeleteOutlined as DeleteIcon,
  FlashOn as QuickAddIcon,
  PointOfSale as CheckoutIcon,
  ClearAll as ClearCartIcon,
} from '@mui/icons-material';
import { CartItem, EventConfig } from '../../types';
import { formatCurrency } from '../../utils/export';
import { soundEngine } from '../../utils/audio';

interface CartPanelProps {
  cart: CartItem[];
  eventConfig: EventConfig;
  onUpdateQuantity: (id: string, newQty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onOpenQuickCustom: () => void;
  onOpenCheckout: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cart,
  eventConfig,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenQuickCustom,
  onOpenCheckout,
}) => {
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  const handleQtyChange = (id: string, delta: number, currentQty: number) => {
    const nextQty = currentQty + delta;
    if (nextQty <= 0) {
      soundEngine.playVoid();
      onRemoveItem(id);
    } else {
      soundEngine.playPop();
      onUpdateQuantity(id, nextQty);
    }
  };

  return (
    <div className="bg-white border-3 sm:border-4 border-[#2D3548] rounded-3xl shadow-[5px_5px_0px_#2D3548] flex flex-col h-full overflow-hidden select-none">
      {/* Cart Header */}
      <div className="p-3.5 bg-gradient-to-r from-[#D8EDFC] to-[#FFD6E8] border-b-3 border-[#2D3548] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white rounded-xl border-2 border-[#2D3548] flex items-center justify-center shadow-[1px_1px_0px_#2D3548]">
            <span className="text-xl">{cart.length > 0 ? '🛍️' : '🍙'}</span>
          </div>
          <div>
            <h3 className="font-black text-[#2D3548] text-sm uppercase tracking-wider leading-tight">
              Active Bag
            </h3>
            <span className="text-[11px] font-black text-[#FF85A1] uppercase tracking-wide">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} queued
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenQuickCustom}
            title="Add Custom Commission / Service"
            className="flex items-center gap-1 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] px-2.5 py-1 rounded-xl text-xs font-black shadow-[1px_1px_0px_#2D3548] active:translate-y-0.5"
          >
            <QuickAddIcon sx={{ fontSize: 14 }} />
            <span>Custom</span>
          </button>

          {cart.length > 0 && (
            <button
              onClick={() => {
                soundEngine.playVoid();
                onClearCart();
              }}
              title="Clear Entire Cart"
              className="w-8 h-8 bg-white/80 hover:bg-[#FFE2ED] text-[#2D3548] border-2 border-[#2D3548] rounded-xl flex items-center justify-center shadow-[1px_1px_0px_#2D3548]"
            >
              <ClearCartIcon sx={{ fontSize: 16 }} />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 bg-[#FBFDFF]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="w-16 h-16 bg-[#FFF0F5] border-3 border-[#2D3548] rounded-2xl flex items-center justify-center mb-3 shadow-[3px_3px_0px_#2D3548] rotate-2">
              <span className="text-3xl">🧺</span>
            </div>
            <h4 className="font-black text-[#2D3548] text-base mb-1">Bag is Empty</h4>
            <p className="text-xs font-bold text-[#616D86] max-w-[190px] mb-3">
              Tap any merchandise card from the booth catalogue to add!
            </p>
            <button
              onClick={onOpenQuickCustom}
              className="bg-[#D8EDFC] text-[#2D3548] border-2 border-[#2D3548] px-3.5 py-1.5 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] hover:bg-[#C2E3FA]"
            >
              + Quick Custom Price
            </button>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-2xl bg-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] flex items-center justify-between gap-2 hover:shadow-[3px_3px_0px_#2D3548] transition-all"
            >
              {/* Item Info */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{item.emoji}</span>
                  <span className="font-black text-[#2D3548] text-xs sm:text-sm truncate block" title={item.name}>
                    {item.name}
                  </span>
                </div>

                {item.customNote && (
                  <span className="text-[11px] font-bold text-[#FF85A1] italic block truncate mt-0.5">
                    Note: {item.customNote}
                  </span>
                )}

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-black text-[#FF85A1]">
                    {formatCurrency(item.unitPrice, eventConfig.currencySymbol)}
                  </span>
                  {item.quantity > 1 && (
                    <span className="text-[10px] font-bold text-[#616D86]">
                      ({formatCurrency(item.unitPrice * item.quantity, eventConfig.currencySymbol)})
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-1 bg-[#F4F9FE] p-1 rounded-xl border border-[#2D3548]">
                <button
                  onClick={() => handleQtyChange(item.id, -1, item.quantity)}
                  className="w-7 h-7 rounded-lg bg-white border border-[#2D3548] flex items-center justify-center font-black text-[#2D3548] hover:bg-[#FFE2ED] active:scale-95 transition-transform"
                >
                  {item.quantity === 1 ? (
                    <DeleteIcon sx={{ fontSize: 14, color: '#EF4444' }} />
                  ) : (
                    <RemoveIcon sx={{ fontSize: 14 }} />
                  )}
                </button>

                <span className="font-black text-xs text-[#2D3548] min-w-[20px] text-center">
                  {item.quantity}
                </span>

                <button
                  onClick={() => handleQtyChange(item.id, 1, item.quantity)}
                  className="w-7 h-7 rounded-lg bg-[#FFD6E8] border border-[#2D3548] flex items-center justify-center font-black text-[#2D3548] hover:bg-[#FFAEC9] active:scale-95 transition-transform"
                >
                  <AddIcon sx={{ fontSize: 14 }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Checkout Action Footer */}
      {cart.length > 0 && (
        <div className="p-3.5 bg-white border-t-3 border-[#2D3548] shadow-[0_-2px_10px_rgba(45,53,72,0.05)]">
          <div className="flex justify-between items-center mb-1 text-xs font-bold text-[#616D86]">
            <span>Items ({totalItemCount})</span>
            <span>{formatCurrency(subtotal, eventConfig.currencySymbol)}</span>
          </div>

          <div className="flex justify-between items-baseline mb-3 pt-1 border-t border-dashed border-[#2D3548]/30">
            <span className="text-sm font-black text-[#2D3548] uppercase tracking-wider">Total</span>
            <span className="text-2xl sm:text-3xl font-black text-[#FF85A1] font-sans tracking-tight">
              {formatCurrency(subtotal, eventConfig.currencySymbol)}
            </span>
          </div>

          <button
            onClick={() => {
              soundEngine.playCoin();
              onOpenCheckout();
            }}
            className="w-full bg-[#FF85A1] hover:bg-[#FF6B8D] text-white border-3 border-[#2D3548] py-3 rounded-2xl font-black text-base uppercase tracking-wider shadow-[4px_4px_0px_#2D3548] active:translate-y-0.5 active:shadow-[2px_2px_0px_#2D3548] transition-all flex items-center justify-center gap-2"
          >
            <CheckoutIcon fontSize="small" />
            <span>Charge {formatCurrency(subtotal, eventConfig.currencySymbol)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

