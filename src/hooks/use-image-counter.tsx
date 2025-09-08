'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DAILY_IMAGE_LIMIT = 70;

interface ImageCounterContextType {
  count: number;
  limit: number;
  isLoading: boolean;
  increment: (model: string, amount?: number) => void;
}

const ImageCounterContext = createContext<ImageCounterContextType | undefined>(undefined);

const getTodayDateString = () => new Date().toDateString();

export const ImageCounterProvider = ({ children }: { children: React.ReactNode }) => {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem('imageCounterData');
      const today = getTodayDateString();

      if (storedData) {
        const { count: storedCount, lastReset } = JSON.parse(storedData);
        if (lastReset === today) {
          setCount(storedCount);
        } else {
          // It's a new day, reset the counter
          setCount(0);
          localStorage.setItem('imageCounterData', JSON.stringify({ count: 0, lastReset: today }));
        }
      } else {
        // No data, initialize it
        localStorage.setItem('imageCounterData', JSON.stringify({ count: 0, lastReset: today }));
      }
    } catch (error) {
      console.error("Failed to access image counter data from localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const increment = useCallback((model: string, amount = 1) => {
    if (!model.startsWith('imagen-4')) {
      return; // Only count Imagen 4 generations
    }
    
    const today = getTodayDateString();
    setCount(prevCount => {
      const newCount = prevCount + amount;
      try {
        localStorage.setItem('imageCounterData', JSON.stringify({ count: newCount, lastReset: today }));
      } catch (error) {
        console.error("Failed to save image counter data to localStorage", error);
      }
      return newCount;
    });
  }, []);

  return (
    <ImageCounterContext.Provider value={{ count, limit: DAILY_IMAGE_LIMIT, isLoading, increment }}>
      {children}
    </ImageCounterContext.Provider>
  );
};

export const useImageCounter = () => {
  const context = useContext(ImageCounterContext);
  if (context === undefined) {
    throw new Error('useImageCounter must be used within an ImageCounterProvider');
  }
  return context;
};
