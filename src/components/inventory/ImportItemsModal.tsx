import React, { useState, useRef } from 'react';
import {
  Dialog,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Close as CloseIcon,
  FileUpload as UploadIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import Papa from 'papaparse';
import { Product, ProductCategory } from '../../types';
import { CATEGORY_META } from '../../data/categories';

interface ImportItemsModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onImportProducts: (items: Product[]) => void;
}

type DupMode = 'skip' | 'update';

interface ParsedItem {
  rowNum: number;
  product: Product;
  status: 'new' | 'update' | 'error';
  messages: string[];
}

const TEMPLATE_HEADERS = [
  'SKU', 'Barcode', 'Product Name', 'Category', 'Selling Price', 'Cost Price',
  'Stock Qty', 'Low Stock Alert Level', 'Tags', 'Emoji', 'Description',
];

const HEADER_MAP: Record<string, string> = {
  sku: 'sku',
  barcode: 'barcode',
  'product name': 'name',
  name: 'name',
  category: 'category',
  'selling price': 'price',
  price: 'price',
  'cost price': 'cost',
  cost: 'cost',
  'stock qty': 'stock',
  stock: 'stock',
  'low stock alert level': 'lowStockThreshold',
  'low stock threshold': 'lowStockThreshold',
  tags: 'tags',
  emoji: 'emoji',
  description: 'description',
  details: 'description',
};

const TEMPLATE_CSV = `${TEMPLATE_HEADERS.join(',')}
CHS-LAN-JP-001,2200001,Sakura Cat Lanyard,keychain,12.00,4.50,30,5,Handmade;Cat,🌸,Double-sided acrylic lanyard
CHS-TCG-OP-002,2200002,One Piece Booster Pack,pokemon_tcg,25.00,18.00,40,8,TCG;Booster,🎴,
`;

const resolveCategory = (raw: string): { cat: ProductCategory; guessed: boolean } => {
  const q = (raw || '').trim().toLowerCase();
  if (!q) return { cat: 'others', guessed: false };
  const keys = Object.keys(CATEGORY_META) as ProductCategory[];
  const byKey = keys.find((k) => k === q);
  if (byKey) return { cat: byKey, guessed: false };
  const byLabel = keys.find((k) => CATEGORY_META[k].label.toLowerCase() === q);
  if (byLabel) return { cat: byLabel, guessed: false };
  return { cat: 'others', guessed: true };
};

const parseNum = (raw: string): number | null => {
  const n = parseFloat((raw || '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/**
 * Bulk CSV import: pick a file → preview rows with per-row validation →
 * choose how existing matches are handled → confirm. Nothing is written
 * until "Import" is pressed.
 */
export const ImportItemsModal: React.FC<ImportItemsModalProps> = ({
  open,
  onClose,
  products,
  onImportProducts,
}) => {
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [dupMode, setDupMode] = useState<DupMode>('skip');
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFileName('');
    setItems([]);
    setDupMode('skip');
    setParseError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDownloadTemplate = () => {
    // \uFEFF = UTF-8 BOM so Excel detects the encoding correctly
    const blob = new Blob(['\uFEFF' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'chibishoppu_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseRows = (rows: Record<string, string>[]): ParsedItem[] => {
    // Codes seen inside this file (cross-checked both directions like the app does)
    const seenCodes = new Map<string, number>();

    return rows.map((row, idx) => {
      const rowNum = idx + 2; // +1 for header, +1 for 0-index
      const messages: string[] = [];

      const get = (field: string) => (row[field] ?? '').toString().trim();
      const sku = get('sku');
      const barcode = get('barcode');
      const name = get('name');
      const priceRaw = get('price');

      // --- required fields ---
      if (!sku) messages.push('SKU is required');
      if (!name) messages.push('Name is required');
      const price = parseNum(priceRaw);
      if (price === null || price < 0) messages.push('Valid selling price is required');

      const cost = parseNum(get('cost')) ?? 0;
      const stockParsed = parseNum(get('stock'));
      const stock = stockParsed === null ? 0 : Math.max(0, Math.round(stockParsed));
      const lowParsed = parseNum(get('lowStockThreshold'));
      const lowStockThreshold = lowParsed === null ? 5 : Math.max(1, Math.round(lowParsed));

      const { cat, guessed } = resolveCategory(get('category'));
      if (guessed) messages.push(`Unknown category "${get('category')}" → set to Others`);

      const tags = get('tags')
        .split(/[;,]/)
        .map((t) => t.trim())
        .filter(Boolean);

      // --- existing product match (by sku or barcode, both directions) ---
      const existing = products.find(
        (p) =>
          (sku && (p.sku.toLowerCase() === sku.toLowerCase() || (p.barcode ?? '').toLowerCase() === sku.toLowerCase())) ||
          (barcode && (p.sku.toLowerCase() === barcode.toLowerCase() || (p.barcode ?? '').toLowerCase() === barcode.toLowerCase()))
      );

      // --- duplicate codes inside the file itself ---
      for (const code of [sku, barcode].filter(Boolean)) {
        const key = code.toLowerCase();
        const firstRow = seenCodes.get(key);
        if (firstRow !== undefined) {
          messages.push(`"${code}" duplicated in this file (row ${firstRow})`);
        } else {
          seenCodes.set(key, rowNum);
        }
      }

      const product: Product = {
        id: existing ? existing.id : `prod-${Date.now()}-${idx}`,
        sku,
        barcode: barcode || undefined,
        name,
        category: cat,
        price: price ?? 0,
        cost,
        stock,
        lowStockThreshold,
        // Blank cells preserve existing values on update (export CSVs lack Emoji/Description)
        emoji: get('emoji') || existing?.emoji || '🌸',
        tags: tags.length ? tags : (existing?.tags ?? []),
        description: get('description') || existing?.description,
        isFeatured: existing ? existing.isFeatured : false,
        defectiveStock: existing?.defectiveStock,
      };

      const status: ParsedItem['status'] =
        messages.some((m) => m.includes('required') || m.includes('duplicated'))
          ? 'error'
          : existing
          ? 'update'
          : 'new';
      if (existing && status !== 'error') messages.unshift(`Matches existing "${existing.name}"`);

      return { rowNum, product, status, messages };
    });
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    setParseError('');

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => HEADER_MAP[h.trim().toLowerCase()] ?? '',
      complete: (result) => {
        if (!result.data.length) {
          setItems([]);
          setParseError('No data rows found. Check the file matches the template headers.');
          return;
        }
        setItems(parseRows(result.data));
      },
      error: () => setParseError('Could not parse that file — save it as CSV (UTF-8) and retry.'),
    });
  };

  const newCount = items.filter((i) => i.status === 'new').length;
  const updateCount = items.filter((i) => i.status === 'update').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const importable = items.filter(
    (i) => i.status === 'new' || (i.status === 'update' && dupMode === 'update')
  );

  const handleConfirmImport = () => {
    if (!importable.length) return;
    onImportProducts(importable.map((i) => i.product));
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
      <div className="bg-[#FFD6E8] border-b-3 border-[#2D3548] p-4 flex items-center justify-between flex-shrink-0">
        <h3 className="text-base font-black text-[#2D3548] uppercase tracking-wider">
          📦 Import Items from CSV
        </h3>
        <button
          type="button"
          onClick={handleClose}
          className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE2ED] text-[#2D3548] border-2 border-[#2D3548] flex items-center justify-center font-black shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-3.5 bg-[#F4F9FE] flex-1 min-h-0 overflow-y-auto">
        {/* File pick + template */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFilePicked}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-[#FF85A1] hover:bg-[#FF6B8D] text-white border-2 border-[#2D3548] px-4 py-2 rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
          >
            <UploadIcon sx={{ fontSize: 16 }} />
            {fileName ? 'Choose Another File' : 'Choose CSV File'}
          </button>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 bg-white hover:bg-[#F4F9FE] text-[#2D3548] border-2 border-[#2D3548] px-3 py-2 rounded-xl text-xs font-black uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
          >
            <DownloadIcon sx={{ fontSize: 16 }} />
            Template
          </button>
          {fileName && (
            <span className="text-xs font-bold text-[#616D86] truncate">📄 {fileName}</span>
          )}
        </div>
        <p className="text-[11px] font-bold text-[#616D86] -mt-1">
          Tip: fill the template in Excel, then save as <strong>CSV (UTF-8)</strong>. Category accepts a key (<code>keychain</code>, <code>pokemon_tcg</code>…) or label (<code>TCG Card</code>…).
        </p>

        {parseError && (
          <div className="p-2.5 rounded-xl bg-[#FFE2ED] border-2 border-[#2D3548] text-xs font-black text-rose-700 shadow-[2px_2px_0px_#2D3548]">
            ⚠️ {parseError}
          </div>
        )}

        {/* Preview + options once parsed */}
        {items.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-[#A3E7D0] border-2 border-[#2D3548] text-[11px] font-black text-[#1B5E45]">
                {newCount} new
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#FFE699] border-2 border-[#2D3548] text-[11px] font-black text-[#8a6100]">
                {updateCount} existing
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-[#FFD6E8] border-2 border-[#2D3548] text-[11px] font-black text-rose-700">
                {errorCount} errors
              </span>
            </div>

            {updateCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548]">
                <span className="text-[11px] font-black uppercase text-[#2D3548]">
                  Existing matches:
                </span>
                {(['skip', 'update'] as DupMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDupMode(m)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase border-2 transition ${
                      dupMode === m
                        ? 'border-[#2D3548] bg-[#D8EDFC] text-[#2D3548] shadow-[1px_1px_0px_#2D3548]'
                        : 'border-[#2D3548]/30 bg-white text-[#616D86]'
                    }`}
                  >
                    {m === 'skip' ? '⏭ Skip them' : '🔁 Update them'}
                  </button>
                ))}
                <span className="text-[10px] font-bold text-[#616D86]">
                  {dupMode === 'skip'
                    ? 'Rows matching an existing product are left untouched.'
                    : 'Matching products are overwritten by the CSV row (stock is set to the CSV value).'}
                </span>
              </div>
            )}

            <div className="rounded-2xl border-2 border-[#2D3548] overflow-hidden bg-white shadow-[2px_2px_0px_#2D3548]">
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: '#D8EDFC', fontWeight: 900, fontSize: '0.68rem', color: '#2D3548' } }}>
                      <TableCell>#</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Stock</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow
                        key={item.rowNum}
                        sx={{
                          bgcolor:
                            item.status === 'error'
                              ? '#FFE2ED'
                              : item.status === 'update'
                              ? '#FFFBEB'
                              : '#FFFFFF',
                        }}
                      >
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700 }}>{item.rowNum}</TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700 }}>
                          {item.product.sku || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700 }}>
                          {item.product.name || '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.7rem' }}>
                          {item.product.price ? item.product.price.toFixed(2) : '—'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.7rem' }}>{item.product.stock}</TableCell>
                        <TableCell sx={{ fontSize: '0.68rem', fontWeight: 900 }}>
                          {item.status === 'new' && <span className="text-[#1B5E45]">NEW</span>}
                          {item.status === 'update' && (
                            <span className="text-[#8a6100]">{dupMode === 'skip' ? 'SKIP' : 'UPDATE'}</span>
                          )}
                          {item.status === 'error' && <span className="text-rose-700">ERROR</span>}
                          {item.messages.length > 0 && (
                            <div className="font-bold text-[#616D86] normal-case text-[9px] leading-tight">
                              {item.messages.join(' · ')}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </>
        )}
      </div>

      <div className="p-3 bg-[#F4F9FE] border-t-3 border-[#2D3548] flex justify-end gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleClose}
          className="px-4 py-2 rounded-xl text-xs font-black uppercase text-[#2D3548] bg-white border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] hover:bg-[#F4F9FE] active:translate-y-0.5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirmImport}
          disabled={importable.length === 0}
          className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-[#A3E7D0] hover:bg-[#7ED9B8] text-[#1B5E45] border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Import {importable.length} Item{importable.length === 1 ? '' : 's'}
        </button>
      </div>
    </Dialog>
  );
};
