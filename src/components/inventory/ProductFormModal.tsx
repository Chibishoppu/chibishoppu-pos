import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Product, ProductCategory } from '../../types';
import { CATEGORY_META } from '../../data/categories';
import { compressImageToBlob } from '../../utils/image';
import { fetchProductImage } from '../../services/db';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  /** imageBlob = new photo to store; removeImage = delete any stored photo */
  onSaveProduct: (product: Product, imageBlob?: Blob | null, removeImage?: boolean) => void;
  editingProduct?: Product | null;
  currencySymbol: string;
  products: Product[];
}

const POPULAR_EMOJIS = ['🌸', '⚡', '🎴', '🧁', '⭐', '🧋', '🐰', '🦊', '🎁', '👑', '🎀', '🪄', '🖼️', '✨', '🛍️', '🐱', '🍙', '🍡', '🍵', '🎨'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  open,
  onClose,
  onSaveProduct,
  editingProduct,
  currencySymbol,
  products,
}) => {
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('keychain');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [emoji, setEmoji] = useState('🌸');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Visual: emoji mascot OR uploaded photo
  const [imageMode, setImageMode] = useState<'emoji' | 'photo'>('emoji');
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hasExistingImage, setHasExistingImage] = useState(false);
  const previewUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setPreviewUrl = (url: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setImagePreview(url);
  };

  useEffect(() => {
    if (editingProduct) {
      setSku(editingProduct.sku);
      setBarcode(editingProduct.barcode || '');
      setName(editingProduct.name);
      setCategory(editingProduct.category);
      setPrice(editingProduct.price.toString());
      setCost(editingProduct.cost.toString());
      setStock(editingProduct.stock.toString());
      setLowStockThreshold(editingProduct.lowStockThreshold.toString());
      setEmoji(editingProduct.emoji);
      setTags(editingProduct.tags || []);
      setDescription(editingProduct.description || '');
      setImageBlob(null);
      fetchProductImage(editingProduct.id).then((blob) => {
        if (blob) {
          setImageMode('photo');
          setHasExistingImage(true);
          setPreviewUrl(URL.createObjectURL(blob));
        } else {
          setImageMode('emoji');
          setHasExistingImage(false);
          setPreviewUrl(null);
        }
      });
    } else {
      setSku('');
      setBarcode('');
      setName('');
      setCategory('keychain');
      setPrice('');
      setCost('');
      setStock('20');
      setLowStockThreshold('5');
      setEmoji('🌸');
      setTags(['Handmade']);
      setDescription('');
      setImageMode('emoji');
      setImageBlob(null);
      setHasExistingImage(false);
      setPreviewUrl(null);
    }
    setFormError('');
    return () => setPreviewUrl(null);
  }, [editingProduct, open]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handlePickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const blob = await compressImageToBlob(file);
      setImageBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setFormError('');
    } catch {
      setFormError('Could not read that image file. Try a JPG or PNG.');
    }
  };

  /**
   * SKU and barcode must be unique across both fields of every other product —
   * scanners resolve by either code, so a collision would add the wrong item.
   */
  const validateUniqueCodes = (): string | null => {
    const s = sku.trim().toLowerCase();
    const b = barcode.trim().toLowerCase();
    for (const p of products) {
      if (p.id === editingProduct?.id) continue;
      const pSku = p.sku.toLowerCase();
      const pBc = (p.barcode ?? '').toLowerCase();
      if (s && (s === pSku || (pBc && s === pBc)))
        return `SKU "${sku.trim()}" collides with "${p.name}".`;
      if (b && (b === pSku || b === pBc))
        return `Barcode "${barcode.trim()}" is already used by "${p.name}".`;
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(price);
    const parsedCost = parseFloat(cost) || 0;
    const parsedStock = parseInt(stock) || 0;
    const parsedLow = parseInt(lowStockThreshold) || 5;

    if (!name || isNaN(parsedPrice)) return;

    if (!sku.trim()) {
      setFormError('SKU Code is required.');
      return;
    }

    const codeError = validateUniqueCodes();
    if (codeError) {
      setFormError(codeError);
      return;
    }
    setFormError('');

    const productData: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      sku: sku.trim(),
      barcode: barcode.trim() || undefined,
      name: name.trim(),
      category,
      price: parsedPrice,
      cost: parsedCost,
      stock: Math.max(0, parsedStock),
      lowStockThreshold: Math.max(1, parsedLow),
      emoji,
      tags,
      description: description.trim() || undefined,
      isFeatured: editingProduct ? editingProduct.isFeatured : false,
    };

    const removeImage = imageMode === 'emoji' || (hasExistingImage && !imagePreview);
    onSaveProduct(productData, imageMode === 'photo' ? imageBlob : null, removeImage);
    onClose();
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
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            margin: { xs: 2, sm: 4 },
          },
        },
      }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="bg-[#FFD6E8] border-b-3 border-[#2D3548] p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <h3 className="text-base font-black text-[#2D3548] uppercase tracking-wider">
              {editingProduct ? 'Edit Booth Product' : 'Add New Inventory Item'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE2ED] text-[#2D3548] border-2 border-[#2D3548] flex items-center justify-center font-black shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3.5 bg-[#F4F9FE] flex-1 min-h-0 overflow-y-auto">
          {formError && (
            <div className="p-2.5 rounded-xl bg-[#FFE2ED] border-2 border-[#2D3548] text-xs font-black text-rose-700 shadow-[2px_2px_0px_#2D3548]">
              ⚠️ {formError}
            </div>
          )}

          {/* Product Visual: emoji mascot OR uploaded photo */}
          <div className="p-3 bg-white border-2 border-[#2D3548] rounded-2xl shadow-[2px_2px_0px_#2D3548]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-black uppercase text-[#2D3548]">
                Product Visual
              </span>
              <div className="flex gap-1.5">
                {(['emoji', 'photo'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setImageMode(m)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border-2 transition ${
                      imageMode === m
                        ? 'border-[#2D3548] bg-[#FF85A1] text-white shadow-[1px_1px_0px_#2D3548]'
                        : 'border-[#2D3548]/30 bg-white text-[#616D86] hover:bg-[#F4F9FE]'
                    }`}
                  >
                    {m === 'emoji' ? '😀 Emoji' : '📷 Photo'}
                  </button>
                ))}
              </div>
            </div>

            {imageMode === 'emoji' ? (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-2xl p-1.5 bg-[#FFD6E8] rounded-xl border-2 border-[#2D3548] shadow-[1px_1px_0px_#2D3548]">
                  {emoji}
                </span>
                {POPULAR_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`text-lg p-1 rounded-xl transition border-2 ${
                      emoji === em
                        ? 'border-[#2D3548] bg-[#FF85A1] shadow-[2px_2px_0px_#2D3548]'
                        : 'border-transparent hover:bg-[#F4F9FE]'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePickImage}
                />
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-16 h-16 rounded-xl border-2 border-[#2D3548] object-cover shadow-[2px_2px_0px_#2D3548]"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-[#2D3548]/40 bg-[#F4F9FE] flex items-center justify-center text-2xl">
                    📷
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] rounded-xl text-[11px] font-black uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
                  >
                    {imagePreview ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageBlob(null);
                        setPreviewUrl(null);
                      }}
                      className="px-3 py-1 text-[10px] font-black uppercase text-rose-600 hover:bg-[#FFE2ED] rounded-lg"
                    >
                      Remove Photo
                    </button>
                  )}
                  <span className="text-[9px] font-bold text-[#616D86]">
                    Auto-resized &amp; compressed for storage
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                SKU Code *
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
                placeholder="e.g. KC-SHAKER-01"
                className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
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
          </div>

          <div>
            <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
              Barcode (Optional — click field & scan, or type)
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 8901234567890"
              className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
              Product Name (English) *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Holographic Decoden Toploader"
              className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
            />
          </div>

          {/* Pricing & Stock Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
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
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Cost Price ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Initial Stock *
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
                className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
                Low Stock Threshold *
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                required
                className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
              Add Tags
            </label>
            <div className="flex gap-2 mb-1.5">
              <input
                type="text"
                placeholder="e.g. Handmade, Pokemon, Bestseller"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 bg-white border-2 border-[#2D3548] rounded-xl px-3 py-1.5 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#2D3548]"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 bg-[#F4F9FE] border-2 border-[#2D3548] rounded-lg px-2 py-0.5 text-[11px] font-black text-[#2D3548] shadow-[1px_1px_0px_#2D3548]"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-red-500 font-black text-xs"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase text-[#2D3548] block mb-1">
              Product Details / Crafting Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-white border-2 border-[#2D3548] rounded-xl px-3 py-2 text-xs font-bold text-[#2D3548] shadow-[2px_2px_0px_#2D3548] focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="p-3 bg-[#F4F9FE] border-t-3 border-[#2D3548] flex justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase text-[#2D3548] bg-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] hover:bg-[#F4F9FE] active:translate-y-0.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#FF85A1] hover:bg-[#FF6B8D] text-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5 transition-all"
          >
            {editingProduct ? 'Save Changes' : 'Add to Inventory'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
