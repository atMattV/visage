
'use client';
import { useState, useEffect } from 'react';
import VisageForgeApp from "@/components/client/visage-forge-app";
import Splash from "@/components/client/splash";
import { cn } from "@/lib/utils";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAppVisible, setIsAppVisible] = useState(false);

  const startExit = () => {
    // Start fading in the main app
    setIsAppVisible(true);
    // Remove splash screen from the DOM after its animation finishes
    setTimeout(() => {
      setShowSplash(false);
    }, 1000); // Should be same or longer than splash animation
  };

  return (
    <main>
      {/* Both components are in the DOM during the transition */}
      {showSplash && <Splash onEnter={startExit} />}

      <div className={cn(
        "main-app-container",
        isAppVisible ? "opacity-100" : "opacity-0"
      )}>
        <VisageForgeApp isSplashVisible={showSplash} />
      </div>
    </main>
  );
}
