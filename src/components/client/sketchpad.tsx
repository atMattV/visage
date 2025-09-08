'use client';

import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Button } from "@/components/ui/button";
import { Eraser, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SketchpadRef {
  exportAsDataURL: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

const Sketchpad = forwardRef<SketchpadRef, {}>((props, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const historyStack = useRef<ImageData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [historyLength, setHistoryLength] = useState(0);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    historyStack.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    setHistoryLength(historyStack.current.length);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // Make canvas responsive
    const resizeCanvas = () => {
        const { width, height } = parent.getBoundingClientRect();
        
        // Preserve drawing on resize
        const context = canvas.getContext('2d');
        const currentDrawing = context ? context.getImageData(0, 0, canvas.width, canvas.height) : null;
        
        canvas.width = width;
        canvas.height = height;

        if (context) {
            context.lineCap = 'round';
            context.strokeStyle = 'white';
            context.lineWidth = 5;
            context.fillStyle = '#0f0e11';
            contextRef.current = context;
            
            // Restore drawing
            if (currentDrawing) {
                context.putImageData(currentDrawing, 0, 0);
            }
            
            // If history is empty after a resize, initialize it
            if (historyStack.current.length === 0) {
              saveHistory();
            }
        }
    }
    
    resizeCanvas();
    // We initialize the first history state here
    if (contextRef.current && historyStack.current.length === 0) {
        saveHistory();
    }
    
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getCoords = (event: MouseEvent | TouchEvent): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const rect = canvas.getBoundingClientRect();
    if (event instanceof MouseEvent) {
      return [event.clientX - rect.left, event.clientY - rect.top];
    } else {
      return [event.touches[0].clientX - rect.left, event.touches[0].clientY - rect.top];
    }
  }

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    const context = contextRef.current;
    if (!context) return;
    const [x, y] = getCoords(event.nativeEvent);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const finishDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    const context = contextRef.current;
    if (!context || !isDrawing) return;
    context.closePath();
    setIsDrawing(false);
    saveHistory(); // Save state after a stroke is completed
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    event.preventDefault();
    const context = contextRef.current;
    if (!context) return;
    const [x, y] = getCoords(event.nativeEvent);
    context.lineTo(x, y);
    context.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
      // Reset history to just the initial blank state
      historyStack.current.splice(1);
      if (historyStack.current.length === 0) {
        saveHistory(); // If stack is empty, save the blank state
      }
      setHistoryLength(1);
    }
  };

  const handleUndo = () => {
    if (historyStack.current.length <= 1) return;

    const context = contextRef.current;
    if (!context) return;
    
    historyStack.current.pop();
    const lastState = historyStack.current[historyStack.current.length - 1];
    context.putImageData(lastState, 0, 0);

    setHistoryLength(historyStack.current.length);
    setHasDrawn(historyStack.current.length > 1);
  };

  useImperativeHandle(ref, () => ({
    exportAsDataURL: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return null;
      const context = contextRef.current;
      if (!context) return null;
      
      const originalContent = context.getImageData(0, 0, canvas.width, canvas.height);
      
      context.globalCompositeOperation = "destination-over";
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/png');
      
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.putImageData(originalContent, 0, 0);
      context.globalCompositeOperation = "source-over";
      
      return dataUrl;
    },
    clear: clearCanvas,
    isEmpty: () => !hasDrawn,
  }));

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none"
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchEnd={finishDrawing}
        onTouchMove={draw}
      />
      <div className="absolute top-2 right-2 flex gap-2">
        <Button variant="outline" size="icon" onClick={handleUndo} title="Undo" disabled={historyLength <= 1}>
          <Undo2 className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={clearCanvas} title="Clear Sketch">
          <Eraser className="h-5 w-5" />
        </Button>
      </div>
       {!hasDrawn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
          <p className="text-muted-foreground text-lg">Draw something here...</p>
          <p className="text-muted-foreground text-sm mt-1">Then press 'Analyze Sketch' to get a prompt.</p>
        </div>
      )}
    </div>
  );
});

Sketchpad.displayName = 'Sketchpad';
export default Sketchpad;
