'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, X } from 'lucide-react';
import type { SavedRoute } from '@/types/saved-route';

interface QRCodeShareProps {
  route: SavedRoute;
  onClose: () => void;
}

export function QRCodeShare({ route, onClose }: QRCodeShareProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = `https://midwayder.up.railway.app/?start=${encodeURIComponent(route.startAddress)}&end=${encodeURIComponent(route.endAddress)}${route.category ? `&category=${encodeURIComponent(route.category)}` : ''}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, shareUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      }).catch((err) => {
        console.error('QR Code generation error:', err);
        setError('QR 코드 생성 실패');
      });
    }
  }, [shareUrl]);

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `route-${route.id}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">QR 코드 공유</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col items-center">
          {error ? (
            <p className="text-red-500">{error}</p>
          ) : (
            <canvas ref={canvasRef} className="border border-gray-200 dark:border-gray-700 rounded-lg" />
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
            QR 코드를 스캔하면 경로를 바로 사용할 수 있습니다
          </p>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Download size={16} />
            이미지 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}
