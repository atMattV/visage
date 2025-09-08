
'use client';

import { useState, useEffect, useRef } from 'react';
import { generateImageAction, optimizePromptAction, describeImageAction, chatImageAction } from '@/lib/actions';
import type { ChatHistoryItem } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { saveHistoryItem, getHistory, pruneHistory } from '@/lib/db';
import Sketchpad from '@/components/client/sketchpad';
import type { SketchpadRef } from '@/components/client/sketchpad';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Download, SlidersHorizontal, Sparkles, Paintbrush, HelpCircle, History, Type, Brush, Copy, Mic, MicOff, ImagePlus, MessageSquare, Send, Upload, X } from "lucide-react";
import { VisageLogo, GoogleLogo } from "@/components/icons";
import { useImageCounter } from '@/hooks/use-image-counter';
import { ImageCounterDisplay } from './image-counter-display';
import { ScrollArea } from '../ui/scroll-area';


export interface GeneratedImage {
    url: string;
}

export interface HistoryItem {
    id: string;
    prompt: string;
    images: GeneratedImage[];
    settings: {
        model: string;
        style: string;
        imageCount: number;
        aspectRatio: string;
    };
    generationMode?: 'text' | 'sketch' | 'img2img' | 'chat';
}

const styles = [
    { key: '3d_render', label: '3D Render', prompt: 'high quality 3D render, Cycles renderer, physically-based rendering, intricate details, cinematic lighting, octane render, unreal engine, photorealistic PBR materials' },
    { key: 'abstract', label: 'Abstract', prompt: 'abstract painting, non-representational, bold gestural brushstrokes, rich textures, vibrant color field, emotional and expressive, style of Wassily Kandinsky' },
    { key: 'anime_90s', label: '90s Anime', prompt: '90s anime aesthetic, retro anime screenshot, cel animation, pastel color palette, detailed hand-painted background art, iconic 90s anime style, film grain, subtle light bloom' },
    { key: 'art_deco', label: 'Art Deco', prompt: 'Art Deco architecture, geometric patterns, sleek lines, gold and chrome accents, 1920s glamour, high society, luxurious materials, strong symmetry, style of The Great Gatsby' },
    { key: 'blueprint', label: 'Blueprint', prompt: 'detailed engineering blueprint, technical schematics, clean vector lines on blue paper, cyanotype, architectural drawing, annotations and measurements, grid lines' },
    { key: 'cinematic', label: 'Cinematic', prompt: 'A gritty, raw cinematic film still. Shot on 35mm Kodak Vision3 film with a vintage anamorphic lens. Heavy organic film grain, subtle motion blur, and realistic skin textures with imperfections. The lighting is low-key and dramatic with deep crushed blacks and atmospheric volumetric light. Critically, this must look like a real photograph from a movie, not a 3d render, cgi, vfx, or a video game screenshot. No digital perfection.' },
    { key: 'claymation', label: 'Claymation', prompt: 'charming claymation scene, stop-motion animation aesthetic, plasticine models, visible fingerprints and tool marks, miniature set design, slightly imperfect and tactile' },
    { key: 'cyberpunk', label: 'Cyberpunk', prompt: 'cyberpunk cityscape at night, neon-drenched streets, towering holographic advertisements, dystopian future, grimy and high-tech, rain-slicked pavement, style of Blade Runner' },
    { key: 'double_exposure', label: 'Double Exposure', prompt: 'creative double exposure photograph, silhouette of a person blended with a forest landscape, abstract and ethereal, monochromatic with a single color highlight' },
    { key: 'fantasy_art', label: 'Fantasy Art', prompt: 'epic fantasy concept art, style of Frank Frazetta and an oil painting, dramatic lighting, mythical creatures, enchanted landscapes, powerful and dynamic composition, heroic scale' },
    { key: 'gothic_horror', label: 'Gothic Horror', prompt: 'gothic horror illustration, macabre and moody, dark and stormy atmosphere, style of Bram Stoker\'s Dracula, eerie castle setting, deep shadows, Victorian era' },
    { key: 'graffiti', label: 'Graffiti', prompt: 'vibrant graffiti mural on a brick wall, street art style, bold spray paint lettering with wildstyle elements, drips and splatters, urban art, dynamic and energetic' },
    { key: 'holographic', label: 'Holographic', prompt: 'holographic and iridescent material, shimmering rainbow colors, futuristic and ethereal, light refraction, glowing light trails, translucent and shimmering' },
    { key: 'impressionism', label: 'Impressionism', prompt: 'impressionist oil painting, style of Claude Monet, visible short thick brushstrokes, soft focus, emphasis on light and its changing qualities, outdoor scene, vibrant palette' },
    { key: 'infographic', label: 'Infographic', prompt: 'clean modern infographic, isometric design, flat icons, clear data visualization, minimalist color palette, connecting lines and labels, sharp vector graphics' },
    { key: 'kawaii', label: 'Kawaii', prompt: 'kawaii chibi illustration, super cute, big sparkling eyes, soft pastel colors, simple and adorable design, rounded shapes, minimal shading, clean lines' },
    { key: 'line_art', label: 'Line Art', prompt: 'minimalist single-line drawing, clean vector lines, black on a white background, simple and elegant, continuous line, abstract form' },
    { key: 'low_poly', label: 'Low Poly', prompt: 'low poly 3D art, faceted surfaces, vibrant geometric shapes, minimalist aesthetic, stylized and colorful, isometric perspective, simple lighting' },
    { key: 'modern_cartoon', label: 'Modern Cartoon', prompt: 'modern animation style, clean lines, bold colors, expressive characters, inspired by Pixar and Disney animation, dynamic poses, cel-shaded look' },
    { key: 'oil_painting', label: 'Oil Painting', prompt: 'masterpiece oil painting, rich impasto texture, visible brushstrokes, chiaroscuro lighting, style of Rembrandt, dramatic and emotional, deep color palette' },
    { key: 'papercraft', label: 'Papercraft', prompt: 'intricate layered papercraft, cut paper art, origami, dimensional illustration, shadow box effect, soft ambient lighting creating depth and shadows' },
    { key: 'pencil_sketch', label: 'Pencil Sketch', prompt: 'detailed graphite pencil sketch, hand-drawn, cross-hatching and smudged shading, on textured sketchbook paper, realistic proportions, artist\'s signature' },
    { key: 'photorealistic', label: 'Photorealistic', prompt: 'hyperrealistic photograph, sharp focus, high detail, shot on a DSLR camera with a 50mm f/1.8 lens, 8k resolution, professional photography, natural lighting' },
    { key: 'pixel_art', label: 'Pixel Art', prompt: 'detailed 16-bit pixel art, retro video game aesthetic, vibrant color palette, crisp pixels, style of classic SNES RPGs, isometric view' },
    { key: 'pop_art', label: 'Pop Art', prompt: 'Pop Art screenprint, style of Andy Warhol, bold graphic colors, Ben-Day dots for shading, iconic and repeating imagery, high contrast, flat planes of color' },
    { key: 'steampunk', label: 'Steampunk', prompt: 'steampunk invention, intricate brass and copper gears, polished wood, Victorian engineering, anachronistic technology, glowing vacuum tubes, rivets and leather straps' },
    { key: 'surrealist', label: 'Surrealist', prompt: 'surrealist dreamscape painting, style of Salvador Dalí and René Magritte, bizarre and illogical scene, unexpected juxtapositions, realistic technique with impossible concepts' },
    { key: 'ukiyo_e', label: 'Ukiyo-e', prompt: 'Japanese ukiyo-e woodblock print, style of Hokusai, flat areas of color, bold outlines, floating world aesthetic, beautiful women, kabuki actors, landscapes' },
    { key: 'vintage_comic', label: 'Vintage Comic', prompt: 'vintage comic book panel, 1960s pop art style, bold ink lines, four-color printing process, halftone dot shading, yellowed paper texture, action words' },
    { key: 'watercolor', label: 'Watercolor', prompt: 'delicate watercolor painting, soft translucent washes of color, blended edges, on textured cotton paper, bleeding colors, loose and expressive style' },
].sort((a, b) => a.label.localeCompare(b.label));


const cameraAngles = [
    { key: 'low_angle', label: 'Low Angle', prompt: "low-angle shot, worm's-eye view" },
    { key: 'high_angle', label: 'High Angle', prompt: "high-angle shot, bird's-eye view" },
    { key: 'eye_level', label: 'Eye-Level', prompt: 'eye-level shot' },
    { key: 'dutch_angle', label: 'Dutch Angle', prompt: 'dutch angle, canted angle, tilted frame' },
    { key: 'full_shot', label: 'Full Shot', prompt: 'full body shot, long shot' },
    { key: 'medium_shot', label: 'Medium Shot', prompt: 'medium shot' },
    { key: 'close_up', label: 'Close-Up', prompt: 'close-up shot' },
    { key: 'macro', label: 'Macro', prompt: 'macro photography, extreme close-up' },
];

interface VisageForgeAppProps {
    isSplashVisible: boolean;
}

type Mode = 'text' | 'sketch' | 'img2img' | 'chat';

const ModeToggle = ({ mode, setMode }: { mode: Mode, setMode: (mode: Mode) => void }) => (
  <div className="flex rounded-lg bg-secondary p-1">
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={() => setMode('text')} className={cn('flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors', mode === 'text' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
            <Type className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent><p>Text-to-Image</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={() => setMode('sketch')} className={cn('flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors', mode === 'sketch' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
            <Brush className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent><p>Sketch-to-Image</p></TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
           <button onClick={() => setMode('img2img')} className={cn('flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors', mode === 'img2img' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
            <ImagePlus className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent><p>Image-to-Image</p></TooltipContent>
      </Tooltip>
       <Tooltip>
        <TooltipTrigger asChild>
           <button onClick={() => setMode('chat')} className={cn('flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-colors', mode === 'chat' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
            <MessageSquare className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent><p>Chat</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);


export default function VisageForgeApp({ isSplashVisible }: VisageForgeAppProps) {
    // State management
    const { toast } = useToast();
    const [apiKey, setApiKey] = useState('');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [imageCount, setImageCount] = useState(1);
    const [model, setModel] = useState('imagen-3.0-generate-002');
    const [userSelectedModel, setUserSelectedModel] = useState('imagen-3.0-generate-002');
    const [style, setStyle] = useState('none');
    const [stylization, setStylization] = useState(0);
    const [chaos, setChaos] = useState(0);
    const [variety, setVariety] = useState(0);
    const [cameraAngle, setCameraAngle] = useState('');
    
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
    const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

    const [loadingState, setLoadingState] = useState<'placeholder' | 'loading' | 'error' | 'success'>('placeholder');
    const [loadingText, setLoadingText] = useState('');
    const [errorText, setErrorText] = useState('Something went wrong.');
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);
    const [saveButtonText, setSaveButtonText] = useState('Save');
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [mode, setMode] = useState<Mode>('text');
    
    const [analyzedPrompt, setAnalyzedPrompt] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // New state for multimodal
    const [inputImage, setInputImage] = useState<string | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
    const [chatInput, setChatInput] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const abortControllerRef = useRef<AbortController | null>(null);
    const sketchpadRef = useRef<SketchpadRef>(null);

    // Speech Recognition State
    const recognitionRef = useRef<any>(null);
    const [isListening, setIsListening] = useState(false);
    const { increment: incrementImageCount } = useImageCounter();

    // Derived state for displayed images
    const activeHistoryItem = history.find(item => item.id === activeHistoryId) || (activeHistoryId === null && history.length > 0 ? history[0] : undefined);
    const images = activeHistoryItem?.images || [];

    // Auto-scroll chat
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);


    // Load persisted state from local storage on initial render
    useEffect(() => {
        const storedApiKey = localStorage.getItem('googleAiApiKey');
        if (storedApiKey) {
            setApiKey(storedApiKey);
        }
        
        const loadHistory = async () => {
            try {
                const storedHistory = await getHistory();
                if (storedHistory) {
                    setHistory(storedHistory);
                }
            } catch (error) {
                console.error("Failed to load history from IndexedDB", error);
                toast({
                    variant: "destructive",
                    title: "Could not load history",
                    description: "There was an issue reading from the browser database.",
                });
            }
            setIsHistoryLoaded(true);
        };
        loadHistory();
    }, [toast]);

    // Automatic model switching for special modes
    useEffect(() => {
        if (mode === 'img2img' || mode === 'chat') {
            if (model !== 'gemini-2.0-flash-preview-image-generation') {
                setUserSelectedModel(model); // Save the user's last selected model
                setModel('gemini-2.0-flash-preview-image-generation');
            }
        } else {
            // Revert to user's last selection when leaving special modes
            if (model === 'gemini-2.0-flash-preview-image-generation') {
                setModel(userSelectedModel);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);
    
    // Speech Recognition Setup
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported by this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                if (mode === 'chat') {
                    setChatInput(prev => prev + finalTranscript);
                } else {
                    setPrompt(prev => prev + finalTranscript);
                }
            }
        };
        
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                toast({
                    variant: 'destructive',
                    title: 'Microphone Access Denied',
                    description: 'Please enable microphone permissions in your browser settings to use this feature.',
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Speech Recognition Error',
                    description: `An error occurred: ${event.error}`,
                });
            }
            setIsListening(false);
        };
        
        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    }, [toast, mode]);

    const handleToggleListening = () => {
        const recognition = recognitionRef.current;
        if (!recognition) {
             toast({
                variant: 'destructive',
                title: 'Not Supported',
                description: 'Speech recognition is not available in your browser.',
            });
            return
        };

        if (isListening) {
            recognition.stop();
        } else {
            if (mode === 'chat') {
                // Let user append to chat input with voice
            } else {
                setPrompt('');
            }
            recognition.start();
            setIsListening(true);
        }
    };

    
    // Function to handle API key saving
    const handleSaveKey = () => {
        localStorage.setItem('googleAiApiKey', apiKey);
        setSaveButtonText('Saved!');
        setTimeout(() => setSaveButtonText('Save'), 2000);
    };

    // Reset aesthetics sliders and style
    const resetAesthetics = () => {
        setStyle('none');
        setStylization(0);
        setChaos(0);
        setVariety(0);
    };

    // --- Prompt Engineering Helpers ---

    const getStylePrompt = (styleKey: string, stylizationValue: number) => {
        if (styleKey === 'none') return "";
        const selectedStyle = styles.find(s => s.key === styleKey);
        if (!selectedStyle || !selectedStyle.prompt) return "";
        const baseKeywords = selectedStyle.prompt.split(',').map(k => k.trim());
        
        // Weight from 1.1 (base) to 1.6 (max stylization).
        // This ensures style is always applied with emphasis.
        const weight = 1.1 + (stylizationValue / 100) * 0.5;
        return baseKeywords.map(k => `(${k}:${weight.toFixed(2)})`).join(', ');
    };
    
    const getCreativeKeywords = (sliderValue: number, keywords: string[]) => {
        if (sliderValue === 0) return "";
        
        const weight = 1.05 + (sliderValue / 100) * 0.45; // Range: 1.05 to 1.5
        const numKeywords = Math.ceil((sliderValue / 100) * keywords.length);
        const selectedKeywords = keywords.slice(0, numKeywords);
        
        return selectedKeywords.map(k => `(${k}:${weight.toFixed(2)})`).join(', ');
    };
    
    // Main image generation logic
    const handleGenerate = async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setLoadingState('loading');
        setActiveHistoryId(null);

        try {
             if (model === 'gemini-2.0-flash-preview-image-generation' && (mode === 'text' || mode === 'sketch')) {
                toast({
                    variant: 'destructive',
                    title: 'Mode Not Recommended',
                    description: 'Gemini Flash is best for Image-to-Image and Chat. Results for text-only generation may be unreliable.',
                });
            }

            if (!prompt.trim()) {
                 if (mode === 'img2img' && inputImage) {
                    // This is ok, user might just want to use the image with a style
                 } else {
                    toast({ variant: 'destructive', title: 'Prompt is empty', description: 'Please enter a prompt to generate an image.' });
                    setLoadingState('placeholder');
                    return;
                 }
            }

            if(mode === 'img2img' && !inputImage) {
                toast({ variant: 'destructive', title: 'No Image', description: 'Please upload an image for Image-to-Image mode.' });
                setLoadingState('placeholder');
                return;
            }

            const basePrompt = prompt.trim();
            setLoadingText('Generating...');

            if (!apiKey) throw new Error('Please enter your Google AI API key to generate images.');
            
            const promptParts = [basePrompt];
            
            // Apply creative prompt engineering
            const stylePrompt = getStylePrompt(style, stylization);
            if (stylePrompt) promptParts.push(stylePrompt);

            if (cameraAngle) {
                const selectedAngle = cameraAngles.find(a => a.key === cameraAngle);
                if (selectedAngle?.prompt) {
                    const cameraKeywords = selectedAngle.prompt.split(',').map(k => k.trim()).filter(k => k);
                    const cameraPrompt = cameraKeywords.map(k => `(${k}:1.4)`).join(', ');
                    if (cameraPrompt) promptParts.push(cameraPrompt);
                }
            }
            
            const chaosKeywords = "unexpected surreal elements, abstract interpretation, dreamlike logic, psychedelic visuals, distorted reality, unconventional composition, bizarre juxtaposition, optical illusions, impossible geometry, thought-provoking and strange".split(', ');
            const varietyKeywords = "maximalist aesthetic, visually rich and complex, intricate overlapping details, a collage of textures and patterns, high energy composition, dense with elements, a fusion of multiple styles, vibrant and eclectic, dynamic and busy scene".split(', ');

            const chaosPrompt = getCreativeKeywords(chaos, chaosKeywords);
            if (chaosPrompt) promptParts.push(chaosPrompt);
            
            const varietyPrompt = getCreativeKeywords(variety, varietyKeywords);
            if (varietyPrompt) promptParts.push(varietyPrompt);

            const fullPrompt = promptParts.filter(p => p).join(', ');

            const result = await generateImageAction({
                prompt: fullPrompt,
                apiKey,
                numImages: imageCount,
                aspectRatio,
                model,
                inputImage: mode === 'img2img' ? inputImage : undefined,
            });

            if (result.success && result.images && result.images.length > 0) {
                setLoadingState('success');
                incrementImageCount(model, imageCount);
                if (mode !== 'chat') {
                    const newHistoryItem: HistoryItem = {
                        id: new Date().toISOString(),
                        prompt: basePrompt,
                        images: result.images,
                        settings: { model, style, imageCount, aspectRatio },
                        generationMode: mode,
                    };
                    await saveHistoryItem(newHistoryItem);
                    await pruneHistory(10);
                    const updatedHistory = await getHistory();
                    setHistory(updatedHistory);
                    setActiveHistoryId(newHistoryItem.id);
                }
            } else {
                throw new Error(result.error || 'Image generation failed to produce any images.');
            }
        } catch (error) {
             if (error instanceof Error && error.name === 'AbortError') {
                console.log('Request aborted.');
                setLoadingState('placeholder');
                return;
            }
            console.error('Error generating image:', error);
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            setErrorText(message);
            setLoadingState('error');
        } finally {
            setLoadingText('');
        }
    };
    
    // --- New Sketch Analysis Flow ---
    const handleAnalyzeSketch = async () => {
        if (isAnalyzing) return;

        const imageDataUri = sketchpadRef.current?.exportAsDataURL();
        if (!imageDataUri) {
            toast({ variant: 'destructive', title: 'Empty Sketch', description: 'Please draw something before analyzing.' });
            return;
        }

        if (!apiKey) {
            toast({
                variant: "destructive",
                title: "Google AI Key Required",
                description: "Please enter your Google AI API key in the settings to analyze sketches.",
            });
            return;
        }

        setIsAnalyzing(true);
        setAnalyzedPrompt(null);
        try {
            const describeResult = await describeImageAction({ imageDataUri, apiKey });
            if (!describeResult.success || !describeResult.description) {
                throw new Error(describeResult.error || 'Failed to get sketch description.');
            }
            setAnalyzedPrompt(describeResult.description);
        } catch (error) {
            console.error('Error analyzing sketch:', error);
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            toast({ variant: 'destructive', title: 'Analysis Failed', description: message });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleUseAnalyzedPrompt = () => {
        if (analyzedPrompt) {
            setPrompt(analyzedPrompt);
            setMode('text');
            setAnalyzedPrompt(null);
        }
    };

    const handleCopyAnalyzedPrompt = () => {
        if (analyzedPrompt) {
            navigator.clipboard.writeText(analyzedPrompt);
            toast({ title: 'Prompt Copied!', description: 'The suggested prompt has been copied to your clipboard.' });
        }
    };

    // Prompt Optimizer
    const handleOptimizePrompt = async () => {
        if (!prompt.trim() || isOptimizing) return;

        if (!apiKey) {
            toast({
                variant: "destructive",
                title: "API Key Required",
                description: "Please enter your Google AI API key to use the optimizer.",
            });
            return;
        }

        setIsOptimizing(true);
        try {
            const selectedStyle = styles.find(s => s.key === style)?.label;
            const selectedAngle = cameraAngles.find(a => a.key === cameraAngle)?.label;

            const result = await optimizePromptAction({
                prompt,
                style: selectedStyle,
                cameraAngle: selectedAngle,
                apiKey
            });

            if (result.success && result.optimizedPrompt) {
                setPrompt(result.optimizedPrompt);
                 toast({
                    title: "Prompt Optimized!",
                    description: "Your prompt has been enhanced.",
                });
            } else {
                throw new Error(result.error || "Failed to optimize prompt.");
            }
        } catch (error) {
            console.error("Error optimizing prompt:", error);
            const message = error instanceof Error ? error.message : "An unknown error occurred during optimization."
            toast({
                variant: "destructive",
                title: "Optimization Failed",
                description: message,
            });
        } finally {
            setIsOptimizing(false);
        }
    };
    
    // --- Multimodal Handlers ---

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setInputImage(event.target?.result as string);
                // In img2img mode, clear previous output when new image is uploaded
                if (mode === 'img2img') {
                    setActiveHistoryId(null);
                    setLoadingState('placeholder');
                }
                 // In chat mode, clear the chat history
                if (mode === 'chat') {
                    setChatHistory([]);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleUseAsInput = (imageUrl: string) => {
        setInputImage(imageUrl);
        setMode('img2img');
        setSelectedImage(null); // Close the dialog
    };
    
    const handleSendChat = async () => {
        if (!chatInput.trim() && !(inputImage && chatHistory.length === 0)) return;

        const newUserMessage: ChatHistoryItem = {
            role: 'user',
            parts: [{ text: chatInput }]
        };
        
        // Add user image to the message if it exists and it's the first message
        if (inputImage && chatHistory.length === 0) {
            newUserMessage.parts.unshift({ image: inputImage });
        }

        setChatHistory(prev => [...prev, newUserMessage]);
        setChatInput('');
        setLoadingState('loading');
        // The staged image is now part of the history, so we can clear it
        if (inputImage) {
            setInputImage(null);
        }

        try {
             const result = await chatImageAction({
                history: [...chatHistory, newUserMessage],
                apiKey,
             });

             if (result.success && result.reply) {
                setChatHistory(prev => [...prev, result.reply!]);
                incrementImageCount(model, result.reply.parts.filter(p => 'image' in p).length);
             } else {
                throw new Error(result.error || 'The chat failed to respond.');
             }

        } catch (error) {
             const message = error instanceof Error ? error.message : 'An unknown error occurred.';
             toast({ variant: 'destructive', title: 'Chat Error', description: message });
        } finally {
             setLoadingState('placeholder'); // Chat always returns to placeholder
        }
    };


    // Download handlers
    const handleDownloadAll = () => {
        if (images.length > 0) {
            images.forEach((image, index) => {
                 const link = document.createElement('a');
                link.href = image.url;
                const promptText = prompt.trim().toLowerCase().replace(/\s+/g, '-').substring(0, 50);
                link.download = promptText ? `${promptText}-${index + 1}.png` : `generated-image-${index + 1}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }
    };

    const handleDownloadSingle = (url: string) => {
        const link = document.createElement('a');
        link.href = url;
        const promptText = prompt.trim().toLowerCase().replace(/\s+/g, '-').substring(0, 50);
        link.download = promptText ? `${promptText}.png` : 'generated-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleHistorySelect = (item: HistoryItem) => {
        setActiveHistoryId(item.id);
        setLoadingState('success'); 
    
        setPrompt(item.prompt);
        setStyle(item.settings.style);
        setImageCount(item.settings.imageCount);
        setAspectRatio(item.settings.aspectRatio);
        setMode(item.generationMode || 'text');
        setModel(item.settings.model || 'imagen-3.0-generate-002');
    };
    
    // Render logic for image display area
    const renderGeneratedImageGrid = () => {
        if (loadingState === 'loading') {
            return (
                 <div className="flex h-full w-full items-center justify-center text-center p-8">
                    <div>
                        <svg className="animate-spin h-10 w-10 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <p className="mt-4 text-gray-400">{loadingText || 'Generating...'}</p>
                    </div>
                </div>
            );
        }
        if (loadingState === 'error') {
            return (
                <div className="flex h-full w-full items-center justify-center text-red-400 p-8 max-w-md mx-auto">
                    <p>{errorText}</p>
                </div>
            );
        }
         if (loadingState === 'success' && images.length > 0) {
             return (
                <div className={cn("grid w-full h-full gap-2 p-2", images.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
                   {images.map((image, index) => (
                       <button key={index} onClick={() => setSelectedImage(image)} className="relative group w-full h-full overflow-hidden rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-primary">
                           <Image src={image.url} alt={`Generated image ${index + 1}`} width={512} height={512} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
                           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center">
                               <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">View</p>
                           </div>
                       </button>
                   ))}
                </div>
             );
         }
        // Placeholder for all other states
        return (
            <div className="flex h-full w-full items-center justify-center">
                <VisageLogo className="h-24 w-24 text-muted-foreground/30" />
            </div>
        );
    };
    
    const renderMainContent = () => {
        switch (mode) {
            case 'sketch':
                return <Sketchpad ref={sketchpadRef} />;
            case 'img2img':
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-4">
                        {!inputImage ? (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                                <ImagePlus className="h-12 w-12 mb-4" />
                                <h3 className="text-lg font-medium text-foreground">Image-to-Image Mode</h3>
                                <p>Upload an image using the button in the prompt bar to get started.</p>
                            </div>
                        ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
                                <div className="flex flex-col gap-2">
                                    <Label>Input Image</Label>
                                    <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border">
                                        <Image src={inputImage} alt="Input for editing" fill objectFit="contain" />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            onClick={() => setInputImage(null)}
                                            className="absolute top-2 right-2 h-8 w-8"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                     <Label>Generated Image</Label>
                                     <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-border bg-secondary">
                                        {renderGeneratedImageGrid()}
                                     </div>
                                </div>
                             </div>
                        )}
                    </div>
                );
            case 'chat':
                return (
                    <div className="w-full h-full flex flex-col">
                        <ScrollArea className="flex-grow p-4" ref={chatContainerRef}>
                            <div className="space-y-6">
                            {chatHistory.length === 0 && (
                                <div className="text-center text-muted-foreground pt-16">
                                    <MessageSquare className="h-12 w-12 mx-auto" />
                                    <h3 className="mt-4 text-lg font-medium">Chat with AI</h3>
                                    <p className="mt-1 text-sm">Upload an image or ask a question to start the conversation.</p>
                                </div>
                            )}
                            {chatHistory.map((message, index) => (
                                <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    {message.role === 'model' && <Avatar><AvatarFallback>AI</AvatarFallback></Avatar>}
                                    <div className={cn(
                                        "max-w-md rounded-lg px-4 py-2",
                                        message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                                    )}>
                                        {message.parts.map((part, partIndex) => {
                                            if ('text' in part && part.text) {
                                                return <p key={partIndex} className="whitespace-pre-wrap">{part.text}</p>
                                            }
                                            if ('image' in part) {
                                                return <Image key={partIndex} src={part.image} alt="Chat image" width={256} height={256} className="rounded-md mt-2" />
                                            }
                                            return null;
                                        })}
                                    </div>
                                </div>
                            ))}
                            {loadingState === 'loading' && (
                                <div className="flex items-start gap-3 justify-start">
                                    <Avatar><AvatarFallback>AI</AvatarFallback></Avatar>
                                    <div className="max-w-md rounded-lg px-4 py-2 bg-secondary flex items-center gap-2">
                                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                            )}
                            </div>
                        </ScrollArea>
                        
                        {/* Staged Image Preview */}
                        {inputImage && chatHistory.length === 0 && (
                            <div className="p-2 border-t border-border bg-background">
                                <div className="flex items-center gap-2">
                                    <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                                        <Image src={inputImage} alt="Image to chat about" fill objectFit="cover" />
                                    </div>
                                    <p className="text-sm text-muted-foreground flex-grow">Image added to chat. Send a message to discuss it.</p>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setInputImage(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Chat Input Bar */}
                        <div className="p-4 border-t border-border flex items-center gap-2 bg-background">
                            <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-shrink-0 text-gray-400 hover:text-white"
                                            disabled={!!inputImage || chatHistory.length > 0}
                                        >
                                            <Upload className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Upload an image to start the chat</p></TooltipContent>
                                </Tooltip>
                                <Input 
                                    type="text" 
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendChat(); }}}
                                    placeholder="Send a message..."
                                    className="w-full bg-input"
                                />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleToggleListening}
                                            disabled={!recognitionRef.current}
                                            className={cn("flex-shrink-0 text-gray-400 hover:text-white", isListening && "text-primary animate-pulse")}
                                        >
                                            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{isListening ? 'Stop Listening' : 'Speak Message'}</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Button onClick={handleSendChat} disabled={loadingState === 'loading'}>
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                );
            case 'text':
            default:
                return renderGeneratedImageGrid();
        }
    }


    return (
        <div className={cn("main-grid-container p-4 md:p-8", isSettingsOpen ? "settings-open" : "settings-closed")}>
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
            />
            {/* Left Collapsible Panel (Controls) */}
            <div className="overflow-hidden md:sticky md:top-8 md:self-start">
                 <a href="/" className="font-headline mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </a>
                 <div className={cn(
                    "flex items-center justify-between h-[44px] transition-opacity duration-300",
                    isSplashVisible ? "opacity-0" : "opacity-100"
                 )}>
                    <div className="flex items-center gap-2 overflow-hidden flex-shrink-0">
                        <VisageLogo className="h-7 w-7 text-primary flex-shrink-0" />
                        <h1 className={cn("text-2xl font-headline text-white whitespace-nowrap transition-all duration-200", isSettingsOpen ? "opacity-100 w-auto" : "opacity-0 w-0")}>
                            Studio
                        </h1>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        className="flex-shrink-0"
                    >
                        <SlidersHorizontal className="h-5 w-5" />
                    </Button>
                </div>
                 <div className="settings-accordion-wrapper">
                    <div className="space-y-1">
                        <Accordion type="single" collapsible defaultValue={'model'} className="w-full">
                            <AccordionItem value="api-key">
                                <Card className="bg-transparent border-0 shadow-none">
                                    <AccordionTrigger className="py-0">
                                        <CardHeader className="p-0">
                                            <CardTitle className="text-lg font-headline">API Key</CardTitle>
                                        </CardHeader>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2 text-gray-300 font-medium font-sans">
                                                    <GoogleLogo className="h-5 w-5" />
                                                    <span>Google AI (Imagen / Gemini)</span>
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-input border-border" placeholder="Your Google AI API Key" />
                                                    <Button onClick={handleSaveKey} className="whitespace-nowrap font-sans">{saveButtonText}</Button>
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground text-center pt-2 font-sans">Your keys are stored only in your browser.</p>
                                            <ImageCounterDisplay />
                                        </CardContent>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                             <AccordionItem value="model">
                                <Card className="bg-transparent border-0 shadow-none">
                                    <AccordionTrigger className="py-0">
                                        <CardHeader className="p-0">
                                            <CardTitle className="text-lg font-headline">Model</CardTitle>
                                        </CardHeader>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <CardContent>
                                            <Select 
                                                value={model} 
                                                onValueChange={(value) => {
                                                    setModel(value);
                                                    if (mode !== 'img2img' && mode !== 'chat') {
                                                        setUserSelectedModel(value);
                                                    }
                                                }}
                                                disabled={mode === 'img2img' || mode === 'chat'}
                                            >
                                                <SelectTrigger className="w-full bg-input border-border">
                                                    <SelectValue placeholder="Select a model" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="imagen-3.0-generate-002">
                                                        <div>Imagen 3</div>
                                                    </SelectItem>
                                                    <SelectItem value="imagen-4.0-ultra-generate-001">
                                                        <div>Imagen 4 <span className="text-muted-foreground">(Preview)</span></div>
                                                    </SelectItem>
                                                     <SelectItem value="gemini-2.0-flash-preview-image-generation">
                                                        <div>Gemini 2 Flash <span className="text-muted-foreground">(Multimodal)</span></div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </CardContent>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                            <AccordionItem value="output">
                                <Card className="bg-transparent border-0 shadow-none">
                                    <AccordionTrigger className="py-0">
                                        <CardHeader className="p-0">
                                            <CardTitle className="text-lg font-headline">Image Output</CardTitle>
                                        </CardHeader>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <CardContent className="space-y-6">
                                            <div>
                                                <h4 className="font-headline text-white mb-2 text-base">Image Size</h4>
                                                <div className="flex justify-center gap-2">
                                                    {['9:16', '3:4', '1:1', '4:3', '16:9'].map(ar => (
                                                        <button key={ar} onClick={() => setAspectRatio(ar)} className={cn('control-btn font-headline', aspectRatio === ar ? 'control-btn-active' : 'control-btn-inactive')}>
                                                            {ar}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-headline text-white mb-2 text-base">Number of Images</h4>
                                                <div className="flex justify-center gap-2">
                                                    {[1, 2, 3, 4].map(count => (
                                                        <button key={count} onClick={() => setImageCount(count)} className={cn('control-btn font-headline', imageCount === count ? 'control-btn-active' : 'control-btn-inactive')}>{count}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                            <AccordionItem value="camera">
                                <Card className="bg-transparent border-0 shadow-none">
                                    <AccordionTrigger className="py-0">
                                    <CardHeader className="flex flex-row items-center justify-between p-0 w-full">
                                        <CardTitle className="text-lg font-headline">Camera Angle</CardTitle>
                                        <div role="button" onClick={(e) => { e.stopPropagation(); setCameraAngle('');}} className="text-sm text-gray-400 hover:text-white transition-colors mr-4 cursor-pointer font-sans">Reset</div>
                                    </CardHeader>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <CardContent>
                                            <div className="grid grid-cols-4 gap-2">
                                                {cameraAngles.map((angle) => (
                                                    <button 
                                                        key={angle.key} 
                                                        onClick={() => setCameraAngle(angle.key)} 
                                                        className={cn('control-btn !w-full text-xs font-headline', cameraAngle === angle.key ? 'control-btn-active' : 'control-btn-inactive')}
                                                        title={angle.prompt}
                                                    >
                                                        {angle.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                            <AccordionItem value="aesthetics" className="border-b-0">
                                <Card className="bg-transparent border-0 shadow-none">
                                    <AccordionTrigger className="py-0">
                                        <CardHeader className="flex flex-row items-center justify-between p-0 w-full">
                                            <CardTitle className="text-lg font-headline">Aesthetics</CardTitle>
                                            <div role="button" onClick={(e) => { e.stopPropagation(); resetAesthetics(); }} className="text-sm text-gray-400 hover:text-white transition-colors mr-4 cursor-pointer font-sans">Reset</div>
                                        </CardHeader>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <CardContent className="space-y-4">
                                            <div className="slider-group">
                                                <label htmlFor="style-select" className="text-sm font-medium text-gray-300 font-sans">Style</label>
                                                <Select value={style} onValueChange={setStyle}>
                                                    <SelectTrigger id="style-select" className="w-full mt-1 bg-input border-border font-sans">
                                                        <SelectValue placeholder="Default Style" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">Default Style</SelectItem>
                                                        {styles.map((s) => (
                                                            <SelectItem key={s.key} value={s.key} title={s.prompt}>{s.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="slider-group pt-2">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <label htmlFor="stylization-slider" className="text-sm font-medium text-gray-300 font-sans">Stylization</label>
                                                        <TooltipProvider delayDuration={150}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild><button className="text-gray-400 hover:text-white"><HelpCircle className="h-4 w-4"/></button></TooltipTrigger>
                                                                <TooltipContent><p>Controls the intensity of the selected artistic style.</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                    <span className="text-sm text-gray-400 font-mono">{stylization}</span>
                                                </div>
                                                <Slider id="stylization-slider" value={[stylization]} onValueChange={(v) => setStylization(v[0])} max={100} step={1} className="mt-2" />
                                            </div>
                                            <div className="slider-group">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <label htmlFor="chaos-slider" className="text-sm font-medium text-gray-300 font-sans">Chaos</label>
                                                        <TooltipProvider delayDuration={150}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild><button className="text-gray-400 hover:text-white"><HelpCircle className="h-4 w-4"/></button></TooltipTrigger>
                                                                <TooltipContent><p>Introduces surreal, unexpected, and abstract elements.</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                    <span className="text-sm text-gray-400 font-mono">{chaos}</span>
                                                </div>
                                                <Slider id="chaos-slider" value={[chaos]} onValueChange={(v) => setChaos(v[0])} max={100} step={1} className="mt-2" />
                                            </div>
                                            <div className="slider-group">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <label htmlFor="variety-slider" className="text-sm font-medium text-gray-300 font-sans">Variety</label>
                                                        <TooltipProvider delayDuration={150}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild><button className="text-gray-400 hover:text-white"><HelpCircle className="h-4 w-4"/></button></TooltipTrigger>
                                                                <TooltipContent><p>Increases visual complexity, detail, and texture.</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                    <span className="text-sm text-gray-400 font-mono">{variety}</span>
                                                </div>
                                                <Slider id="variety-slider" value={[variety]} onValueChange={(v) => setVariety(v[0])} max={100} step={1} className="mt-2" />
                                            </div>
                                        </CardContent>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        </Accordion>
                    </div>
                 </div>
            </div>

            {/* Right Panel (Main Content) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 flex flex-col">
                    {/* Main Prompt Bar */}
                     {mode !== 'chat' && (
                        <div className="prompt-bar w-full p-2 flex flex-col md:flex-row items-center gap-2 rounded-lg md:sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
                            <div className="flex items-center w-full">
                                
                                <TooltipProvider delayDuration={150}>
                                    {mode === 'img2img' && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="flex-shrink-0 text-gray-400 hover:text-white"
                                                >
                                                    <Upload className="h-5 w-5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Upload Image</p></TooltipContent>
                                        </Tooltip>
                                    )}
                                    {(mode === 'text' || mode === 'img2img') && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={handleToggleListening}
                                                    disabled={!recognitionRef.current}
                                                    className={cn("flex-shrink-0 text-gray-400 hover:text-white", isListening && "text-primary animate-pulse")}
                                                >
                                                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{isListening ? 'Stop Listening' : 'Speak Prompt'}</p></TooltipContent>
                                        </Tooltip>
                                    )}
                                </TooltipProvider>

                                <input 
                                    type="text" 
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerate(); }}}
                                    className="w-full bg-transparent text-base md:text-lg text-gray-200 placeholder-gray-500 font-sans" 
                                    placeholder={
                                        mode === 'img2img' ? 'Describe what to change...' : 
                                        'What will you imagine?'
                                    } 
                                    autoFocus
                                />
                            </div>
                            <div className="flex items-center justify-end flex-wrap gap-2 w-full md:w-auto ml-auto">
                                <ModeToggle mode={mode} setMode={(newMode) => {
                                    setMode(newMode);
                                    setAnalyzedPrompt(null);
                                    if (newMode !== 'chat') setChatHistory([]);
                                    if (newMode !== 'img2img') setInputImage(null);
                                }} />
                                {mode === 'text' ? (
                                    <Button variant="default" onClick={handleOptimizePrompt} disabled={isOptimizing || !prompt.trim()} className="font-headline whitespace-nowrap w-full md:w-auto">
                                        {isOptimizing ? <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Sparkles className="h-5 w-5 mr-2" />}
                                        Optimize
                                    </Button>
                                ) : mode === 'sketch' ? (
                                    <Button onClick={handleAnalyzeSketch} disabled={isAnalyzing} className="whitespace-nowrap w-full md:w-auto generate-btn">
                                        {isAnalyzing ? <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Sparkles className="h-5 w-5 mr-2" />}
                                        Analyze Sketch
                                    </Button>
                                ) : null }
                                <button onClick={handleGenerate} className="generate-btn w-full md:w-auto justify-center font-headline">
                                    Generate
                                </button>
                            </div>
                        </div>
                     )}
                     {mode === 'chat' && (
                        <div className="prompt-bar w-full p-2 flex items-center justify-end gap-2 rounded-lg md:sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
                            <ModeToggle mode={mode} setMode={(newMode) => {
                                setMode(newMode);
                                setAnalyzedPrompt(null);
                                if (newMode !== 'chat') setChatHistory([]);
                                if (newMode !== 'img2img') setInputImage(null);
                            }} />
                        </div>
                     )}

                    {/* Image Display */}
                    <div className="w-full bg-secondary border border-border rounded-lg flex-grow flex items-center justify-center min-h-[540px] transition-all duration-300 mt-6">
                        {renderMainContent()}
                    </div>

                    {/* Analyzed Prompt Display */}
                    {mode === 'sketch' && analyzedPrompt && (
                        <Card className="mt-4 animate-in fade-in-50">
                            <CardHeader>
                                <CardTitle className="font-headline">Suggested Prompt</CardTitle>
                                <CardDescription>Here's what the AI thinks you drew. Use this to generate an image, or switch back to text mode to edit it.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-foreground italic font-sans">"{analyzedPrompt}"</p>
                            </CardContent>
                            <CardFooter className="gap-2">
                                <Button onClick={handleUseAnalyzedPrompt}>
                                    <Paintbrush className="mr-2 h-4 w-4"/>
                                    Edit & Generate
                                </Button>
                                <Button variant="secondary" onClick={handleCopyAnalyzedPrompt}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Prompt
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                    
                    {/* Actions */}
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleDownloadAll} variant="outline" size="sm" title="Download All Images" disabled={images.length === 0} className="font-headline">
                            <Download className="h-4 w-4 mr-2" />
                            Download Images
                        </Button>
                    </div>
                </div>

                 {/* History Panel */}
                <div className="md:col-span-1 flex flex-col">
                    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-2">
                        <h2 className="text-xl flex items-center gap-2 font-headline"><History className="h-5 w-5" /> History</h2>
                        <p className="text-xs text-muted-foreground mt-1">Your last 10 generations are saved in your browser.</p>
                    </div>
                    <div className="space-y-4 mt-4">
                        {history.length === 0 && <p className="text-muted-foreground text-sm">Your previous generations will appear here.</p>}
                        {history.map(item => (
                            <button key={item.id} onClick={() => handleHistorySelect(item)} className={cn("w-full text-left p-0 border-0 rounded-lg overflow-hidden", activeHistoryItem?.id === item.id ? 'ring-2 ring-primary' : '')}>
                                <Card className="hover:bg-border transition-colors">
                                    <CardContent className="p-3">
                                        <div className="flex gap-4">
                                            {item.images[0]?.url && <Image src={item.images[0].url} alt={item.prompt} width={64} height={64} className="rounded-md object-cover w-16 h-16 flex-shrink-0 bg-gray-800"/>}
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium truncate text-foreground">{item.prompt}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{item.generationMode === 'sketch' && 'Sketch • '}{item.settings.model.startsWith('imagen-3') ? 'Imagen 3' : 'Imagen 4'} &bull; {item.settings.style !== 'none' ? styles.find(s=>s.key === item.settings.style)?.label : 'Default'}</p>
                                                <p className="text-xs text-muted-foreground">{item.settings.imageCount} image{item.settings.imageCount > 1 ? 's' : ''} &bull; {item.settings.aspectRatio}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Image Viewer Dialog */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
                <DialogContent className="max-w-3xl p-0 border-0 bg-card">
                    {selectedImage && (
                        <>
                            <DialogHeader className="p-4 pb-0">
                                <DialogTitle>Image Preview</DialogTitle>
                            </DialogHeader>
                            <div className="p-4">
                                <Image src={selectedImage.url} alt="Selected generated image" width={1024} height={1024} className="w-full h-auto object-contain rounded-md" />
                            </div>
                            <DialogFooter className="p-4 pt-0 flex-col sm:flex-row sm:justify-between gap-2">
                                <Button variant="secondary" onClick={() => setSelectedImage(null)}>Close</Button>
                                <div className="flex flex-col sm:flex-row gap-2">
                                     <Button variant="outline" onClick={() => handleUseAsInput(selectedImage.url)}>
                                        <Brush className="mr-2 h-4 w-4" />
                                        Edit this Image
                                    </Button>
                                    <Button onClick={() => handleDownloadSingle(selectedImage.url)}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                    </Button>
                                </div>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
