import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const VIEW = 280;
const EXPORT = 512;

interface AvatarEditorProps {
  file: File;
  saving: boolean;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}

export function AvatarEditor({ file, saving, onCancel, onSave }: AvatarEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setReady(true);
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !ready) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = Math.max(VIEW / image.width, VIEW / image.height) * zoom;
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.clearRect(0, 0, VIEW, VIEW);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, VIEW, VIEW);
    ctx.drawImage(image, (VIEW - width) / 2 + offset.x, (VIEW - height) / 2 + offset.y, width, height);
  }, [zoom, offset, ready]);

  function exportJpeg() {
    const preview = canvasRef.current;
    if (!preview) return;
    const out = document.createElement('canvas');
    out.width = EXPORT;
    out.height = EXPORT;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.scale(EXPORT / VIEW, EXPORT / VIEW);
    ctx.drawImage(preview, 0, 0);
    onSave(out.toDataURL('image/jpeg', 0.9));
  }

  return (
    <div className="flex flex-col gap-4">
      <canvas
        ref={canvasRef}
        width={VIEW}
        height={VIEW}
        className="mx-auto cursor-grab touch-none rounded-full"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          setOffset({
            x: drag.current.ox + event.clientX - drag.current.x,
            y: drag.current.oy + event.clientY - drag.current.y,
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      />
      <label className="flex flex-col gap-2 text-sm text-muted-foreground">
        Масштаб
        <Slider
          min={1}
          max={3}
          step={0.01}
          value={[zoom]}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            if (typeof next === 'number') setZoom(next);
          }}
        />
      </label>
      <p className="text-center text-xs text-muted-foreground">Перетащите фото, чтобы выбрать кадр</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Отмена
        </Button>
        <Button type="button" onClick={exportJpeg} disabled={!ready || saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
