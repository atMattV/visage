'use client';

import { ImageCounterProvider } from '@/hooks/use-image-counter';

export function GlobalProvider({ children }: { children: React.ReactNode }) {
    return (
        <ImageCounterProvider>
            {children}
        </ImageCounterProvider>
    );
}
