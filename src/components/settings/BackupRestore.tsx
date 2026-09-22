import React, { useRef, useState } from 'react';
import { Dialog } from '@mui/material';
import {
  Save as SaveIcon,
  UploadFile as ImportIcon,
  Shield as BackupIcon,
  WarningAmber as WarnIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  createBackup,
  downloadBackup,
  parseAndValidateBackup,
  restoreBackup,
  BackupFile,
} from '../../services/backupService';

const LAST_EXPORT_KEY = 'chibishoppu.lastBackupAt';

interface BackupRestoreProps {
  onNotify: (message: string, severity: 'success' | 'info' | 'warning' | 'error') => void;
  onRestored: () => Promise<void>;
}

/**
 * Backup & Restore card for the Settings tab.
 * UI only — all logic lives in services/backupService.ts.
 * Export downloads a versioned .json; import validates → confirms → replaces
 * the whole local database inside a Dexie transaction.
 */
export const BackupRestore: React.FC<BackupRestoreProps> = ({ onNotify, onRestored }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(() => localStorage.getItem(LAST_EXPORT_KEY));

  // --- export ---
  const handleExport = async () => {
    try {
      setBusy(true);
      const backup = await createBackup();
      downloadBackup(backup);
      const now = backup.createdAt;
      localStorage.setItem(LAST_EXPORT_KEY, now);
      setLastExport(now);
      onNotify(`Backup saved — ${backup.counts.products} products, ${backup.counts.transactions} transactions.`, 'success');
    } catch (err) {
      console.error('[backup] export failed:', err);
      onNotify('The backup could not be created.', 'error');
    } finally {
      setBusy(false);
    }
  };

  // --- import: pick → read → validate → confirm ---
  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      onNotify('The file could not be read.', 'error');
      return;
    }

    const result = parseAndValidateBackup(text);
    if (result.ok === false) {
      onNotify(result.error, 'error');
      return;
    }
    setPending(result.backup);
  };

  // --- confirmed restore ---
  const handleConfirmRestore = async () => {
    if (!pending) return;
    try {
      setBusy(true);
      await restoreBackup(pending);
      setPending(null);
      await onRestored();
      onNotify('Backup restored successfully!', 'success');
    } catch (err) {
      console.error('[backup] restore error:', err);
      onNotify('The backup could not be restored. Your existing local data has been kept where possible.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="bg-white rounded-3xl border-3 border-[#2D3548] shadow-[4px_4px_0px_#2D3548] p-5 mt-4">
        <div className="flex items-center gap-2 mb-1">
          <BackupIcon sx={{ fontSize: 20, color: '#6B9BC8' }} />
          <h3 className="text-sm font-black text-[#2D3548] uppercase tracking-wider">Backup &amp; Restore</h3>
        </div>
        <p className="text-xs font-medium text-[#616D86] mb-4">
          Protect your local POS data by regularly exporting a backup file. Keep the file somewhere safe —
          restoring it on any device brings back your products, sales history and settings.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Export */}
          <div className="p-3 rounded-2xl bg-[#F4F9FE] border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548]">
            <span className="text-xs font-black text-[#2D3548] block">Export Backup</span>
            <span className="text-[10px] font-bold text-[#616D86] block mb-2">
              Last export: {lastExport ? fmtDate(lastExport) : 'Not available'}
            </span>
            <button
              onClick={handleExport}
              disabled={busy}
              className="flex items-center gap-1.5 bg-[#A3E7D0] hover:bg-[#8CDCC0] disabled:opacity-50 text-[#1B5E45] border-2 border-[#2D3548] px-4 py-2 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
            >
              <SaveIcon sx={{ fontSize: 15 }} />
              <span>Export Backup</span>
            </button>
          </div>

          {/* Import */}
          <div className="p-3 rounded-2xl bg-[#F4F9FE] border-2 border-[#2D3548] shadow-[2px_2px_0px_#2D3548]">
            <span className="text-xs font-black text-[#2D3548] block">Restore from Backup</span>
            <span className="text-[10px] font-bold text-[#616D86] block mb-2">
              Replaces all current data on this device.
            </span>
            <button
              onClick={handlePickFile}
              disabled={busy}
              className="flex items-center gap-1.5 bg-[#D8EDFC] hover:bg-[#BEE0FB] disabled:opacity-50 text-[#2D3548] border-2 border-[#2D3548] px-4 py-2 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
            >
              <ImportIcon sx={{ fontSize: 15 }} />
              <span>Import Backup</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChosen}
            />
          </div>
        </div>
      </div>

      {/* Restore confirmation dialog */}
      <Dialog
        open={pending !== null}
        onClose={() => !busy && setPending(null)}
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
        {pending && (
          <>
            <div className="bg-[#FFE680] border-b-3 border-[#2D3548] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white border-2 border-[#2D3548] flex items-center justify-center shadow-[1px_1px_0px_#2D3548]">
                  <WarnIcon sx={{ fontSize: 18, color: '#2D3548' }} />
                </div>
                <h3 className="text-base font-black text-[#2D3548] uppercase tracking-wider">Restore Backup</h3>
              </div>
              <button
                onClick={() => setPending(null)}
                disabled={busy}
                className="w-8 h-8 rounded-xl bg-white hover:bg-[#FFE2ED] text-[#2D3548] border-2 border-[#2D3548] flex items-center justify-center font-black shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-white rounded-2xl border-2 border-[#2D3548] p-3 text-xs font-bold text-[#616D86] space-y-1">
                <div className="flex justify-between">
                  <span>Backup created:</span>
                  <span className="text-[#2D3548] font-black">{fmtDate(pending.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Products:</span>
                  <span className="text-[#2D3548] font-black">{pending.counts.products}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span className="text-[#2D3548] font-black">{pending.counts.transactions}</span>
                </div>
                <div className="flex justify-between">
                  <span>Product photos:</span>
                  <span className="text-[#2D3548] font-black">{pending.counts.images}</span>
                </div>
                <div className="flex justify-between">
                  <span>Settings:</span>
                  <span className="text-[#2D3548] font-black">{pending.data.eventConfig ? 'Included' : 'Defaults'}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFD6E8] border-2 border-[#2D3548] text-xs font-black text-[#BE185D] flex gap-2">
                <WarnIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                <span>
                  Restoring this backup will replace the current local POS data on this device.
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setPending(null)}
                  disabled={busy}
                  className="flex-1 bg-white hover:bg-[#F4F9FE] disabled:opacity-50 text-[#2D3548] border-2 border-[#2D3548] px-4 py-2 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRestore}
                  disabled={busy}
                  className="flex-1 bg-[#FF85A1] hover:bg-[#FF6B8D] disabled:opacity-50 text-white border-2 border-[#2D3548] px-4 py-2 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_#2D3548] active:translate-y-0.5"
                >
                  {busy ? 'Restoring…' : 'Restore Backup'}
                </button>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
};
