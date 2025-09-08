'use client';
import { useImageCounter } from '@/hooks/use-image-counter';
import { Camera } from 'lucide-react';

export function ImageCounterDisplay() {
  const { count, limit, isLoading } = useImageCounter();

  if (isLoading) {
    return null;
  }

  return (
    <div className="text-xs text-muted-foreground font-sans mt-2 text-center space-y-1">
      <div className="flex items-center justify-center gap-2">
          <Camera className="h-4 w-4" />
          <span>Daily Imagen 4 Usage: {count} / {limit}</span>
      </div>
      <p>Imagen 3 usage is not counted.</p>
    </div>
  );
}
