import { useRef, useState, useEffect, useCallback } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "./button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onSign: (signatureBase64: string) => void;
  disabled?: boolean;
  initialSignature?: string | null;
}

export function SignaturePad({ onSign, disabled, initialSignature }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadLib | null>(null);
  const [hasDrawn, setHasDrawn] = useState(!!initialSignature);
  const initialSigRef = useRef(initialSignature);

  const scaleCanvas = (canvas: HTMLCanvasElement) => {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    if (canvas.width === width * ratio && canvas.height === height * ratio) return false;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);
    return true;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    scaleCanvas(canvas);

    const pad = new SignaturePadLib(canvas, {
      minWidth: 0.8,
      maxWidth: 2.8,
      penColor: "rgb(15, 23, 60)",
      backgroundColor: "rgba(0,0,0,0)",
      velocityFilterWeight: 0.7,
    });
    padRef.current = pad;

    if (initialSigRef.current) {
      pad.fromDataURL(initialSigRef.current);
      setHasDrawn(true);
    }

    const handleEnd = () => {
      if (!pad.isEmpty()) {
        setHasDrawn(true);
        onSign(pad.toDataURL("image/png"));
      }
    };

    pad.addEventListener("endStroke", handleEnd);
    if (disabled) pad.off();

    const ro = new ResizeObserver(() => {
      if (!canvas || !pad) return;
      const data = pad.toData();
      const didScale = scaleCanvas(canvas);
      if (didScale) {
        pad.clear();
        if (data.length) pad.fromData(data);
      }
    });
    ro.observe(canvas);

    return () => {
      pad.removeEventListener("endStroke", handleEnd);
      pad.off();
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!padRef.current) return;
    if (disabled) padRef.current.off();
    else padRef.current.on();
  }, [disabled]);

  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;
    if (initialSignature) {
      pad.fromDataURL(initialSignature);
      setHasDrawn(true);
    } else if (!initialSignature && hasDrawn) {
      pad.clear();
      setHasDrawn(false);
    }
  // Only re-run when initialSignature changes from outside
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSignature]);

  const clear = () => {
    if (disabled || !padRef.current) return;
    padRef.current.clear();
    setHasDrawn(false);
    onSign("");
  };

  return (
    <div className="relative rounded-md border border-border overflow-hidden bg-white dark:bg-slate-950">
      <canvas
        ref={canvasRef}
        className={`block w-full h-[140px] touch-none ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-crosshair"
        }`}
        style={{ touchAction: "none" }}
      />
      {!disabled && hasDrawn && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={clear}
          title="Clear signature"
        >
          <Eraser className="h-3.5 w-3.5" />
        </Button>
      )}
      {!disabled && !hasDrawn && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-muted-foreground select-none">Sign here</span>
        </div>
      )}
    </div>
  );
}
