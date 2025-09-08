
'use client';

import { VisageLogo, PaletteIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

interface SplashProps {
    onEnter: () => void;
}

export default function Splash({ onEnter }: SplashProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleEnter = () => {
        setIsExiting(true);
        onEnter();
    };

    return (
        <div className={cn(
            "fixed inset-0 bg-background z-50 transition-all duration-500",
            // Fade out the background, then set to pointer-events-none so app is clickable
            isExiting ? 'bg-opacity-0 pointer-events-none' : 'bg-opacity-100',
            !isMounted && 'opacity-0'
        )}>
            {/* Logo and Title Group - this is what animates to the corner */}
            <div className={cn(
                "splash-logo-group", // CSS class for animation
                isMounted && "mounted",
                isExiting && "exiting"
            )}>
                <VisageLogo className="h-24 w-24 text-primary" />
                <h1 className="text-6xl font-headline text-white mt-4">Visage</h1>
            </div>

            {/* Subtitle and Button Group - this just fades out */}
            <div className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 w-full text-center transition-opacity duration-300",
                "mt-[120px]", // Position below the logo group
                isMounted && !isExiting ? "opacity-100" : "opacity-0"
            )}>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
                    <Button
                        onClick={handleEnter}
                        className="font-headline bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                    >
                        Studio Mode
                    </Button>
                    <Link href="/story" className="w-full sm:w-auto">
                        <Button
                            variant="secondary"
                            className="story-mode-splash-btn font-headline text-lg px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 w-full"
                        >
                            Story Mode
                        </Button>
                    </Link>
                     <Link href="/kids" className="w-full sm:w-auto">
                        <Button
                            variant="secondary"
                            className="kids-mode-splash-btn font-headline text-lg px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 w-full"
                        >
                            Kids Mode
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
