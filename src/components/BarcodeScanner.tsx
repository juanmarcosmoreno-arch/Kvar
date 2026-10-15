import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { isNative } from '../lib/platform';
import { m } from '../i18n';

/**
 * Cámara + lector de códigos (ZXing). Funciona en Safari, en la PWA instalada y en la app.
 * Llama a onDetect una vez por código (ignora el mismo código leído seguido).
 */
export function BarcodeScanner({ onDetect, paused }: { onDetect: (code: string) => void; paused?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef<{ code: string; at: number } | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const cb = useRef(onDetect);
  cb.current = onDetect;

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;
    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128,
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100 });
        if (cancelled || !video.current) return;
        controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          video.current,
          (result) => {
            if (!result || pausedRef.current) return;
            const code = result.getText();
            const now = Date.now();
            if (last.current && last.current.code === code && now - last.current.at < 2500) return;
            last.current = { code, at: now };
            cb.current(code);
          },
        );
        if (cancelled) controls.stop();
      } catch (e) {
        const name = (e as { name?: string }).name;
        setError(
          name === 'NotAllowedError'
            ? isNative
              ? m.capture.scanner.deniedApp
              : m.capture.scanner.deniedWeb
            : m.capture.scanner.cantOpen,
        );
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-black">
      <video ref={video} className="h-full w-full object-cover" playsInline muted autoPlay />
      {!error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[38%] w-[78%] rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
        </div>
      )}
      {error && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">{error}</p>}
    </div>
  );
}
