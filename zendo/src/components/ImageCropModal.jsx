import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut } from "lucide-react";

// Returns a cropped, resized circular image as a File (JPEG, max 300x300)
export default function ImageCropModal({ file, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const SIZE = 280; // canvas display size
  const OUTPUT = 300; // output px

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setImg(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }, [file]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Clip circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    const scale = zoom;
    const drawW = img.width * scale * (SIZE / Math.min(img.width, img.height));
    const drawH = img.height * scale * (SIZE / Math.min(img.width, img.height));
    const x = SIZE / 2 - drawW / 2 + offset.x;
    const y = SIZE / 2 - drawH / 2 + offset.y;
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();

    // Circle border
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = "#0079BF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [img, zoom, offset]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const onMouseMove = (e) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setDragging(false);

  // Touch support
  const onTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
  };
  const onTouchMove = (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    // Render at OUTPUT resolution
    const out = document.createElement("canvas");
    out.width = OUTPUT;
    out.height = OUTPUT;
    const ctx = out.getContext("2d");
    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();

    const scale = zoom;
    const drawW = img.width * scale * (SIZE / Math.min(img.width, img.height)) * (OUTPUT / SIZE);
    const drawH = img.height * scale * (SIZE / Math.min(img.width, img.height)) * (OUTPUT / SIZE);
    const x = OUTPUT / 2 - drawW / 2 + offset.x * (OUTPUT / SIZE);
    const y = OUTPUT / 2 - drawH / 2 + offset.y * (OUTPUT / SIZE);
    ctx.drawImage(img, x, y, drawW, drawH);

    out.toBlob((blob) => {
      const croppedFile = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      onConfirm(croppedFile);
    }, "image/jpeg", 0.88);
  };

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-500 -mt-2 mb-2">Drag to reposition · Scroll or use slider to zoom</p>

        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="rounded-full cursor-grab active:cursor-grabbing border border-gray-200"
            style={{ userSelect: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onMouseUp}
            onWheel={(e) => setZoom((z) => Math.min(3, Math.max(0.5, z - e.deltaY * 0.001)))}
          />
        </div>

        <div className="flex items-center gap-3 mt-3">
          <ZoomOut className="h-4 w-4 text-gray-400 shrink-0" />
          <Slider
            value={[zoom]}
            min={0.5}
            max={3}
            step={0.01}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 text-gray-400 shrink-0" />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleConfirm} className="bg-[#0079BF] hover:bg-[#026AA7] text-white">
            Use Photo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}