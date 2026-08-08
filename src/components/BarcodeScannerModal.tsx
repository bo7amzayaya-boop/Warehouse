import React, { useEffect, useState, useRef } from 'react';
import { Camera, Search, X, Check, Package } from 'lucide-react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Modal } from './Modal';
import { Material } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  onSelectMaterial: (mat: Material) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  materials,
  onSelectMaterial
}) => {
  const [manualCode, setManualCode] = useState('');
  const [scannedMaterial, setScannedMaterial] = useState<Material | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      setScannedMaterial(null);
      setManualCode('');
      setCameraError(null);

      // Timeout to ensure DOM element exists
      const timer = setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            'reader-element',
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
          );

          scanner.render(
            (decodedText) => {
              handleCodeFound(decodedText);
              scanner.clear();
            },
            (errorMessage) => {
              // ignore parse errors
            }
          );
          scannerRef.current = scanner;
          setIsScanning(true);
        } catch (e: any) {
          console.warn('Camera scanner initialization error:', e);
          setCameraError('لم نتمكن من تشغيل الكاميرا تلقائياً. يمكنك استخدام البحث بالإدخال اليدوي للباركوود.');
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          try {
            scannerRef.current.clear();
          } catch (e) {
            // ignore
          }
        }
      };
    }
  }, [isOpen]);

  const handleCodeFound = (code: string) => {
    const trimmed = code.trim();
    const found = materials.find(m => m.barcode === trimmed || m.code === trimmed || m.id === trimmed);
    if (found) {
      setScannedMaterial(found);
    } else {
      setCameraError(`لم يتم العثور على مادة بالباركوود أو الكود: (${trimmed})`);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode) {
      handleCodeFound(manualCode);
    }
  };

  const handleConfirmSelect = () => {
    if (scannedMaterial) {
      onSelectMaterial(scannedMaterial);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ماسح الباركوود والـ QR Code" maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Manual Barcode Input */}
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="أدخل رقم الباركوود أو كود المادة هنا..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors shrink-0"
          >
            بحث
          </button>
        </form>

        {/* Camera Container */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 min-h-[260px] flex flex-col items-center justify-center p-2">
          <div id="reader-element" className="w-full" />
          {cameraError && (
            <div className="p-4 text-center text-xs text-amber-400 bg-amber-950/40 w-full rounded-xl mt-2">
              {cameraError}
            </div>
          )}
        </div>

        {/* Search Result Card */}
        {scannedMaterial && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 dark:text-white text-base truncate">
                  {scannedMaterial.nameAr}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  الكود: <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{scannedMaterial.code}</span> | الباركوود: <span className="font-mono">{scannedMaterial.barcode}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
              <div className="p-2 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                <span className="block text-slate-400">الرصيد الحالي</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  {scannedMaterial.currentQuantity} {scannedMaterial.unit}
                </span>
              </div>
              <div className="p-2 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                <span className="block text-slate-400">القسم</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                  {scannedMaterial.categoryName}
                </span>
              </div>
              <div className="p-2 bg-white/60 dark:bg-slate-800/60 rounded-lg">
                <span className="block text-slate-400">الموقع</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                  {scannedMaterial.location || 'غير محدد'}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmSelect}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Check className="w-4 h-4" />
              اختيار المادة المحددة
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
