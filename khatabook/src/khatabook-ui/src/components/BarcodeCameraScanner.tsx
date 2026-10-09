import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { playScannerBeep } from '../utils/audioBeep';

interface BarcodeCameraScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  title?: string;
  subtitle?: string;
  continuous?: boolean;
}

export const BarcodeCameraScanner: React.FC<BarcodeCameraScannerProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Camera Barcode & QR Scanner',
  subtitle = 'Point camera at the item barcode or QR code to scan',
  continuous = true,
}) => {
  const [scannerError, setScannerError] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimestamp = useRef<number>(0);
  const scannerContainerId = 'barcode-camera-scanner-view';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsInitializing(true);
    setScannerError('');

    const formatsToSupport = [
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.ITF,
    ];

    const config = {
      fps: 15,
      qrbox: { width: 280, height: 180 },
      aspectRatio: 1.333333,
      formatsToSupport,
    };

    const startScanner = async () => {
      try {
        const qrCodeInstance = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = qrCodeInstance;

        await qrCodeInstance.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            const now = Date.now();
            // Prevent immediate duplicate firing within 1200ms
            if (now - lastScanTimestamp.current < 1200 && decodedText === lastScannedCode) {
              return;
            }
            lastScanTimestamp.current = now;
            setLastScannedCode(decodedText);
            playScannerBeep(true);
            onScan(decodedText);

            if (!continuous) {
              stopScanner();
              onClose();
            }
          },
          () => {
            // Frame scan without barcode - ignore frame failures
          }
        );

        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (err: any) {
        console.error('Camera scanner init failed', err);
        if (isMounted) {
          setIsInitializing(false);
          setScannerError(
            err?.message ||
              'Could not access camera. Please allow camera permissions or use a USB handheld barcode scanner.'
          );
        }
      }
    };

    // Small delay to ensure DOM element is ready
    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current
        .stop()
        .then(() => {
          html5QrCodeRef.current?.clear();
          html5QrCodeRef.current = null;
        })
        .catch((err) => console.error('Error stopping scanner', err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden text-slate-900 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">{title}</h4>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="p-4 bg-slate-900 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
          <div
            id={scannerContainerId}
            className="w-full max-w-[340px] rounded-xl overflow-hidden border-2 border-indigo-500/50 shadow-inner"
          />

          {isInitializing && !scannerError && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white space-y-2">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
              <p className="text-xs font-semibold">Starting camera viewfinder...</p>
            </div>
          )}

          {scannerError && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-rose-300 space-y-2">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <p className="text-xs font-bold">{scannerError}</p>
              <p className="text-[11px] text-slate-400">
                You can also type barcodes or use any USB / Bluetooth barcode gun.
              </p>
            </div>
          )}

          {/* Aiming Reticle Overlay Guide */}
          {!scannerError && !isInitializing && (
            <div className="absolute pointer-events-none flex flex-col items-center justify-center">
              <div className="w-64 h-32 border-2 border-dashed border-emerald-400 rounded-lg animate-pulse flex items-center justify-center">
                <div className="w-full h-0.5 bg-rose-500/80 shadow-xs shadow-rose-400" />
              </div>
              <span className="text-[10px] text-emerald-300 bg-black/60 px-2 py-0.5 rounded mt-2 font-mono">
                Align barcode line within box
              </span>
            </div>
          )}
        </div>

        {/* Footer / Last Scanned Toast */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          {lastScannedCode ? (
            <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-bold">Scanned:</span>
              <span className="font-mono text-xs">{lastScannedCode}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500">
              Continuous scanning active. Items add automatically.
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-xs transition ml-auto"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
