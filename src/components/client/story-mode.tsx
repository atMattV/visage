
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateStorySceneAction, packageStoryAction, optimizeStoryPromptAction, surpriseMeAction, startAdventureAction, progressAdventureAction, generateCharacterIdeaAction, buildRandomAdventureAction, generateImageAction, generateAdventureOpeningAction, generateAdventureSceneImageAction } from '@/lib/actions';
import type { GeneratedImage } from '@/lib/actions';
import { getStoryHistory, pruneStoryHistory, saveStoryHistoryItem } from '@/lib/db';
import type { AdventureState, Character, InventoryItem, Choice as AdventureChoice } from '@/ai/adventure-schemas';
import Image from 'next/image';
import { ArrowLeft, BookOpen, Download, Mic, MicOff, FileImage, Sparkles, ChevronLeft, ChevronRight, Copy, Bot, ChevronDown, UserSquare, Briefcase, Dices, Heart, Shield, Star as StarIcon, Brain, MessageSquare, Plus, Minus, History as HistoryIcon, Camera, ToggleRight, ToggleLeft, BookText } from 'lucide-react';
import { GoogleLogo, VisageLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
    type CarouselApi,
} from "@/components/ui/carousel"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDescriptionComponent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useImageCounter } from '@/hooks/use-image-counter';
import { ImageCounterDisplay } from './image-counter-display';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


export interface Scene {
    narrative: string;
    imagePrompt: string;
    imageUrl?: string;
    isGeneratingImage: boolean;
}

export interface StoryHistoryItem {
  id: string;
  prompt: string;
  settings: {
    genre: string;
    style: string;
    panelCount: string;
  };
  scenes: Scene[];
  thumbnail: string;
}

type Skill = 'strength' | 'agility' | 'intelligence' | 'charisma' | 'luck';

const skillsList: { id: Skill, name: string, icon: React.ElementType }[] = [
    { id: 'strength', name: 'Strength', icon: Shield },
    { id: 'agility', name: 'Agility', icon: Dices },
    { id: 'intelligence', name: 'Intelligence', icon: Brain },
    { id: 'charisma', name: 'Charisma', icon: MessageSquare },
    { id: 'luck', name: 'Luck', icon: StarIcon },
];

const genres = [
    {id: 'Fantasy'},
    {id: 'Sci-Fi'},
    {id: 'Horror'},
    {id: 'Thriller'},
    {id: 'Adventure'},
    {id: 'Noir'},
    {id: 'Kids'},
    {id: 'Action'},
    {id: 'Comedy'},
    {id: 'Drama'},
    {id: 'Romance'},
];

const storyStyles = [
  { id: 'photographic', label: 'Photographic', prompt: 'hyperrealistic photograph, sharp focus, high detail, professional photography, 8k, shot on a DSLR camera with a 50mm lens, cinematic lighting' },
  { id: 'found_footage', label: 'Found Footage', prompt: 'found footage style, point-of-view, realistic, grainy, VHS aesthetic, screen artifacts, timestamp in corner, shaky cam, low-light, lens distortion' },
  { id: 'disposable_camera', label: 'Disposable Camera', prompt: 'disposable camera photo, harsh direct on-camera flash, 90s aesthetic, grainy, slightly blurry, color shifts to green in shadows, date stamp in the corner, candid moment' },
  { id: 'pixar_animation', label: 'Pixar Animation', prompt: 'Pixar animation style, 3D render, vibrant colors, friendly expressive characters with exaggerated features, detailed textures, soft global illumination lighting, cinematic composition' },
  { id: 'ghibli_animation', label: 'Ghibli Animation', prompt: 'Studio Ghibli anime style, hand-drawn, lush watercolor backgrounds, whimsical atmosphere, soft pastel colors, emotional character expressions, nostalgic feel' },
  { id: '50s_comic', label: '1950s Sci-Fi Comic', prompt: '1950s science fiction comic book art, retrofuturism, pulp art style, bold ink outlines, limited color palette with yellowed paper texture, halftone dots for shading, dramatic angles' },
  { id: 'noir_film', label: 'Noir Film', prompt: 'black and white, high-contrast film noir aesthetic, dramatic chiaroscuro lighting, deep shadows cutting across the scene, smoke-filled room, 1940s fashion, Venetian blinds effect' },
  { id: 'claymation', label: 'Claymation', prompt: 'detailed claymation scene, stop-motion animation look, plasticine characters, tactile feel with visible fingerprints and tool marks, miniature set design, quirky and charming' },
  { id: 'storybook', label: 'Children\'s Storybook', prompt: 'charming children\'s storybook illustration, gentle watercolors and colored pencil textures, soft ink lines, whimsical and friendly characters, pastel color palette, detailed and cozy environment' },
  { id: 'dark_fantasy', label: 'Dark Fantasy Art', prompt: 'dark fantasy concept art, epic scale, moody atmospheric lighting, style of Frank Frazetta and Zdzisław Beksiński, detailed battle-worn armor, grotesque monstrous creatures, dramatic and grim tone' },
  { id: 'crayon', label: 'Crayon Drawing', prompt: 'charming and slightly messy crayon drawing, waxy textures and variable line thickness, as if drawn by hand on paper.'},
  { id: 'sticker', label: 'Die-Cut Sticker', prompt: 'glossy, die-cut sticker style illustration, thick white border, vibrant colors, and a simple, cute design.'},
  { id: 'felt', label: 'Felt Craft', prompt: "soft and fuzzy felt craft illustration. The image should look like it's made from cut-out pieces of felt, layered on top of each other, with visible stitching details."},
];

const panelCounts = ['6', '12', '18', '24', '30', '36'];

const adventureLengths = [
    { id: 'skirmish', label: 'Skirmish', length: 1 },
    { id: 'adventure', label: 'Adventure', length: 2 },
    { id: 'campaign', label: 'Campaign', length: 3 },
    { id: 'odyssey', label: 'Odyssey', length: 4 },
];
const adventurerSettings = ['Fantasy', 'Sci-Fi', 'Horror', 'Cyberpunk', 'Medieval', 'Noir', 'Western', 'Post-Apocalyptic', 'Steampunk'];
const adventurerStyles = [
    { id: 'illustrated', label: 'Illustrated', prompt: 'detailed fantasy illustration, vibrant colors, clear outlines, style of a modern RPG concept art.' },
    { id: 'cinematic', label: 'Cinematic', prompt: 'A gritty, raw cinematic film still. Shot on 35mm Kodak Vision3 film with a vintage anamorphic lens. Heavy organic film grain, subtle motion blur, and realistic skin textures with imperfections. The lighting is low-key and dramatic with deep crushed blacks and atmospheric volumetric light. Critically, this must look like a real photograph from a movie, not a 3d render, cgi, vfx, or a video game screenshot. No digital perfection.' }
];


const LoadingSpinner = ({className = "h-5 w-5"}: {className?: string}) => (
    <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
)

const HealthDisplay = ({ character }: { character: Character | null }) => {
    if (!character) return (
        <Card className="bg-card/80 border-border/50 animate-in fade-in-50">
            <CardContent className="p-3">
                 <div className="flex items-center gap-4 text-lg">
                    <Heart className="h-6 w-6 text-red-500/50 flex-shrink-0" />
                    <div className="w-full">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm text-muted-foreground">Health</span>
                            <span className="font-bold text-sm">-- / --</span>
                        </div>
                        <Progress value={100} className="h-2 bg-muted" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const healthPercentage = (character.health / character.maxHealth) * 100;
    return (
        <Card className="bg-card/80 border-border/50 animate-in fade-in-50">
            <CardContent className="p-3">
                 <div className="flex items-center gap-4 text-lg">
                    <Heart className="h-6 w-6 text-red-500 flex-shrink-0" />
                    <div className="w-full">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm text-muted-foreground">Health</span>
                            <span className="font-bold text-sm">{character.health} / {character.maxHealth}</span>
                        </div>
                        <Progress value={healthPercentage} className="h-2" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


const CharacterSheet = ({ character }: { character: Character | null }) => {
    return (
    <Card className="bg-card/80 border-border/50 animate-in fade-in-50">
        <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-lg"><UserSquare className="h-5 w-5"/> {character?.name || 'Character Sheet'}</CardTitle>
            <CardDescription className="text-xs">{character?.description || 'Your character\'s stats will appear here.'}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            {character ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                         {skillsList.map(skillInfo => (
                             <div key={skillInfo.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                     <skillInfo.icon className="h-4 w-4 text-muted-foreground" />
                                     <span>{skillInfo.name}</span>
                                </div>
                                <span className="font-bold text-base">{character.skills[skillInfo.id as keyof typeof character.skills]}</span>
                            </div>
                         ))}
                    </div>
                </div>
            ) : (
                <p className="text-muted-foreground text-xs">Character details not yet generated.</p>
            )}
        </CardContent>
    </Card>
)};

const InventorySheet = ({ inventory }: { inventory: InventoryItem[] | null }) => (
    <Card className="bg-card/80 border-border/50 animate-in fade-in-50">
        <CardHeader className="p-4">
            <CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5"/> Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
            <TooltipProvider>
                <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 15 }).map((_, index) => {
                        const item = inventory?.[index];
                        return (
                            <Tooltip key={index} delayDuration={150}>
                                <TooltipTrigger asChild>
                                    <button className={cn(
                                        "aspect-square bg-input rounded-md border border-border/50 hover:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary transition-colors flex items-center justify-center text-foreground font-mono",
                                        item && 'bg-primary/10 border-primary/50'
                                    )}>
                                        {item && <span className="text-xs">{item.name.substring(0,3)}</span>}
                                    </button>
                                </TooltipTrigger>
                                {item && (
                                  <TooltipContent>
                                      <div>
                                          <p className="font-bold">{item.name} (x{item.quantity})</p>
                                          <p className="max-w-xs text-xs">{item.description}</p>
                                      </div>
                                  </TooltipContent>
                                )}
                            </Tooltip>
                        );
                    })}
                </div>
            </TooltipProvider>
        </CardContent>
    </Card>
);

const TOTAL_SKILL_POINTS = 15;

export default function StoryMode() {
  const [isMounted, setIsMounted] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saveButtonText, setSaveButtonText] = useState('Save');
  
  const [storyMode, setStoryMode] = useState<'storyteller' | 'adventurer'>('storyteller');
  
  // Shared state
  const [model, setModel] = useState('imagen-3.0-generate-002');
  
  // Storyteller state
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('Fantasy');
  const [style, setStyle] = useState('photographic');
  const [panelCount, setPanelCount] = useState('6');
  const [storyHistory, setStoryHistory] = useState<StoryHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isStorytellerImageGenEnabled, setIsStorytellerImageGenEnabled] = useState(false);
  const [sceneImageLoading, setSceneImageLoading] = useState<Record<number, boolean>>({});

  
  // Adventurer state
  const [adventurerSetting, setAdventurerSetting] = useState('Fantasy');
  const [adventurerStyle, setAdventurerStyle] = useState('cinematic');
  const [adventureLength, setAdventureLength] = useState('skirmish');
  const [adventureState, setAdventureState] = useState<AdventureState | null>(null);
  const [isGeneratingOpening, setIsGeneratingOpening] = useState(false);
  const [skills, setSkills] = useState({ strength: 3, agility: 3, intelligence: 3, charisma: 3, luck: 3 });
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [isBuildingAdventure, setIsBuildingAdventure] = useState(false);
  const [customChoiceText, setCustomChoiceText] = useState('');
  const [isAdventurerImageGenEnabled, setIsAdventurerImageGenEnabled] = useState(true);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logImageLoading, setLogImageLoading] = useState<Record<number, boolean>>({});


  const pointsSpent = Object.values(skills).reduce((a, b) => a + b, 0);
  const pointsRemaining = TOTAL_SKILL_POINTS - pointsSpent;
  
  const calculateHealth = (strength: number) => {
    // 5 HP for Strength 1-2, 10 for 3-4, 15 for 5-6, 20 for 7-10
    if (strength <= 2) return 5;
    if (strength <= 4) return 10;
    if (strength <= 6) return 15;
    return 20;
  };
  
  const previewCharacter = useMemo(() => {
    const health = calculateHealth(skills.strength);
    return {
        health: health,
        maxHealth: health,
        name: "Preview",
        description: "",
        skills: skills,
        characterVisualDescription: ""
    } as Character;
  }, [skills]);

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPackaging, setIsPackaging] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSurprising, setIsSurprising] = useState(false);
  const { toast } = useToast();
  const { increment: incrementImageCount } = useImageCounter();

  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  
  const isGeneratingRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
    const storedApiKey = localStorage.getItem('googleAiApiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    const loadHistory = async () => {
        try {
            const storedHistory = await getStoryHistory();
            setStoryHistory(storedHistory);
        } catch (error) {
            console.error("Failed to load story history", error);
        }
    }
    loadHistory();
  }, []);

  useEffect(() => {
    if (!carouselApi) return;
    
    setCurrentSlide(carouselApi.selectedScrollSnap());
    
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });

  }, [carouselApi]);
  
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
          const transcript = Array.from(event.results)
              .map((result: any) => result[0])
              .map((result) => result.transcript)
              .join('');
          setPrompt(transcript);
      };
      
      recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          toast({ variant: 'destructive', title: 'Speech Recognition Error', description: `An error occurred: ${event.error}`});
          setIsListening(false);
      };
      
      recognition.onend = () => {
          setIsListening(false);
      };

      recognitionRef.current = recognition;
  }, [toast]);

  // Effect to handle background image generation for Adventurer Mode
  useEffect(() => {
    const generateImagesForAdventure = async (state: AdventureState) => {
      if (!isAdventurerImageGenEnabled || !apiKey) return;

      const { character, currentScene } = state;
      const stylePrompt = adventurerStyles.find(s => s.id === adventurerStyle)?.prompt || '';
      
      // Generate Character Portrait if needed
      if (character.characterVisualDescription && !character.characterImageUrl) {
        generateAdventureSceneImageAction({
            characterVisualDescription: character.characterVisualDescription,
            imagePrompt: `cinematic character portrait of the character`,
            visualStylePrompt: stylePrompt,
            apiKey,
            model,
        }).then(result => {
            if (result.success && result.imageUrl) {
              incrementImageCount(model, 1);
              setAdventureState(prev => {
                if (prev && prev.character.name === character.name) {
                  return { ...prev, character: { ...prev.character, characterImageUrl: result.imageUrl } };
                }
                return prev;
              });
            } else {
              console.error("Character portrait generation failed:", result.error);
              toast({ variant: 'destructive', title: 'Portrait Failed', description: result.error });
            }
          }).catch(err => {
            console.error("Unhandled error in portrait generation:", err);
            toast({ variant: 'destructive', title: 'Portrait Error', description: 'An unexpected error occurred.' });
          });
      }

      // Generate Scene Image if needed
      if (currentScene.imagePrompt && !currentScene.imageUrl && !currentScene.isGeneratingImage) {
        setAdventureState(prev => {
          if (prev && prev.currentScene.imagePrompt === currentScene.imagePrompt) {
            return { ...prev, currentScene: { ...prev.currentScene, isGeneratingImage: true } };
          }
          return prev;
        });

        generateAdventureSceneImageAction({
            characterVisualDescription: character.characterVisualDescription,
            imagePrompt: currentScene.imagePrompt,
            visualStylePrompt: stylePrompt,
            apiKey,
            model,
        }).then(result => {
            if (result.success && result.imageUrl) {
              incrementImageCount(model, 1);
              setAdventureState(prev => {
                if (prev && prev.currentScene.imagePrompt === currentScene.imagePrompt) {
                  return { ...prev, currentScene: { ...prev.currentScene, imageUrl: result.imageUrl, isGeneratingImage: false } };
                }
                return prev;
              });
            } else {
              console.error("Scene image generation failed:", result.error);
              toast({ variant: 'destructive', title: 'Scene Image Failed', description: result.error });
              setAdventureState(prev => {
                 if (prev && prev.currentScene.imagePrompt === currentScene.imagePrompt) {
                  return { ...prev, currentScene: { ...prev.currentScene, isGeneratingImage: false } };
                }
                return prev;
              });
            }
          }).catch(err => {
              console.error("Unhandled error in scene image generation:", err);
              toast({ variant: 'destructive', title: 'Scene Image Error', description: 'An unexpected error occurred.' });
              setAdventureState(prev => {
                 if (prev && prev.currentScene.imagePrompt === currentScene.imagePrompt) {
                  return { ...prev, currentScene: { ...prev.currentScene, isGeneratingImage: false } };
                }
                return prev;
              });
          });
      }
    };

    if (adventureState) {
      generateImagesForAdventure(adventureState);
    }
  }, [adventureState, adventurerStyle, apiKey, toast, isAdventurerImageGenEnabled, incrementImageCount, model]);
  
  // Effect to generate opening scene after character is created
  useEffect(() => {
    const createOpeningScene = async () => {
        if (adventureState && adventureState.character && adventureState.currentScene.narrative === '' && !isGeneratingOpening) {
            setIsGeneratingOpening(true);
            setLoadingText('Building your world...');
            try {
                const openingResult = await generateAdventureOpeningAction({
                    character: adventureState.character,
                    setting: adventurerSetting,
                    adventureLength,
                    apiKey,
                });

                if (!openingResult.success || !openingResult.opening) {
                    throw new Error(openingResult.error || 'Failed to build the world.');
                }
                
                const { inventory, currentScene } = openingResult.opening;
                setAdventureState(prev => ({
                    ...prev!,
                    inventory,
                    currentScene,
                }));
            } catch (error) {
                const message = error instanceof Error ? error.message : `An unknown error occurred.`;
                toast({ variant: 'destructive', title: 'Adventure Creation Failed', description: message });
                setAdventureState(null); // Clear partial state on error
            } finally {
                setIsGeneratingOpening(false);
                setLoadingText('');
                setIsLoading(false); 
            }
        }
    };
    if (apiKey) {
      createOpeningScene();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adventureState, apiKey]);


  const handleToggleListening = () => {
      const recognition = recognitionRef.current;
      if (!recognition) {
           toast({ variant: 'destructive', title: 'Not Supported', description: 'Speech recognition is not available in your browser.'});
          return
      };

      if (isListening) {
          recognition.stop();
      } else {
          setPrompt('');
          recognition.start();
          setIsListening(true);
      }
  };

  const handleSaveKey = () => {
    localStorage.setItem('googleAiApiKey', apiKey);
    setSaveButtonText('Saved!');
    setTimeout(() => setSaveButtonText('Save'), 2000);
  };
  
  const handleOptimizePrompt = async () => {
      if (!prompt.trim() || isOptimizing) return;

      if (!apiKey) {
          toast({ variant: 'destructive', title: 'API Key Missing', description: 'Please enter your Google AI API key.'});
          return;
      }
      setIsOptimizing(true);
      try {
          const result = await optimizeStoryPromptAction({ prompt, genre, style, panelCount, apiKey });
          if (result.success && result.optimizedPrompt) {
              setPrompt(result.optimizedPrompt);
              toast({ title: 'Idea Optimized!', description: 'Your story idea has been enhanced.' });
          } else {
              throw new Error(result.error || 'Failed to optimize prompt.');
          }
      } catch (error) {
          const message = error instanceof Error ? error.message : 'An unknown error occurred.';
          toast({ variant: 'destructive', title: 'Optimization Failed', description: message });
      } finally {
          setIsOptimizing(false);
      }
  };

  const handleSurpriseMe = async () => {
      if (!apiKey) {
          toast({ variant: 'destructive', title: 'API Key Missing', description: 'Please enter your Google AI API key.'});
          return;
      }
      setIsSurprising(true);
      try {
          const randomGenre = genres[Math.floor(Math.random() * genres.length)].id;
          const randomStyle = storyStyles[Math.floor(Math.random() * storyStyles.length)].id;
          const randomPanelCount = panelCounts[Math.floor(Math.random() * panelCounts.length)];
          
          const result = await surpriseMeAction({
              genre: randomGenre,
              style: randomStyle,
              panelCount: randomPanelCount,
              apiKey
          });

          if (result.success && result.surprisePrompt) {
              setPrompt(result.surprisePrompt);
              setGenre(randomGenre);
              setStyle(randomStyle);
              setPanelCount(randomPanelCount);
              toast({ title: 'Surprise!', description: 'A new story awaits.' });
          } else {
              throw new Error(result.error || 'Failed to generate a surprise idea.');
          }
      } catch (error) {
          const message = error instanceof Error ? error.message : 'An unknown error occurred.';
          toast({ variant: 'destructive', title: 'Surprise Failed', description: message });
      } finally {
          setIsSurprising(false);
      }
  };

  const handleGenerateCharacter = async () => {
    if (!apiKey) {
        toast({ variant: 'destructive', title: 'API Key Missing' });
        return;
    }
    setIsGeneratingCharacter(true);
    try {
        const result = await generateCharacterIdeaAction({ prompt, apiKey });
        if (result.success && result.character) {
            setPrompt(result.character.description);
            setSkills(result.character.skills);
            toast({ title: 'Character Generated!', description: `Meet ${result.character.name}. You can now adjust their skills.` });
        } else {
            throw new Error(result.error || 'Failed to generate character.');
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        toast({ variant: 'destructive', title: 'Character Generation Failed', description: message });
    } finally {
        setIsGeneratingCharacter(false);
    }
  };

  const handleBuildAdventureRandom = async () => {
      if (!apiKey) {
        toast({ variant: 'destructive', title: 'API Key Missing' });
        return;
    }
    setIsBuildingAdventure(true);
    try {
        const result = await buildRandomAdventureAction({ apiKey, setting: adventurerSetting });
        if (result.success && result.setup) {
            const { character, setting, adventureLength, visualStyle } = result.setup;
            setPrompt(character.description);
            setSkills(character.skills);
            setAdventurerSetting(setting);
            setAdventureLength(adventureLength);
            setAdventurerStyle(visualStyle);
            toast({ title: 'Adventure Built!', description: `A new world with ${character.name} awaits. Review and start!` });
        } else {
             throw new Error(result.error || 'Failed to build adventure.');
        }
    } catch (error) {
         const message = error instanceof Error ? error.message : 'Unknown error';
        toast({ variant: 'destructive', title: 'Adventure Build Failed', description: message });
    } finally {
        setIsBuildingAdventure(false);
    }
  };

  const handleStartAdventure = async () => {
      if (isLoading || isGeneratingRef.current) return;
      if (!apiKey && isAdventurerImageGenEnabled) {
          toast({ variant: 'destructive', title: 'API Key Missing', description: "API Key is required to generate images. You can disable image generation in the settings." });
          return;
      }
      if (!prompt.trim()) {
          toast({ variant: 'destructive', title: 'Prompt Missing', description: 'Please describe your character idea.' });
          return;
      }
  
      isGeneratingRef.current = true;
      setIsLoading(true);
      setAdventureState(null);
      setLoadingText('Forging your character...');
  
      try {
          const characterResult = await startAdventureAction({
              prompt,
              setting: adventurerSetting,
              apiKey,
              skills,
          });
  
          if (!characterResult.success || !characterResult.character) {
              throw new Error(characterResult.error || 'Failed to create character.');
          }

          setAdventureState({ 
            character: characterResult.character, 
            inventory: [], 
            currentScene: { narrative: '', imagePrompt: '', choices: [] }, 
            sceneHistory: [] 
          });
  
      } catch (error) {
          const message = error instanceof Error ? error.message : `An unknown error occurred.`;
          toast({ variant: 'destructive', title: 'Adventure Creation Failed', description: message });
          setAdventureState(null);
          setIsLoading(false);
          setLoadingText('');
          isGeneratingRef.current = false;
      }
  }

  const generateImageWithRetry = async (prompt: string, apiKey: string, panelNumber: number, modelToUse: string, retries = 1): Promise<{ success: boolean; images?: GeneratedImage[]; error?: string }> => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        if (attempt > 1) {
          setLoadingText(`Illustrating panel ${panelNumber} (attempt ${attempt})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt - 1)));
        }
        
        const result = await generateImageAction({
          prompt,
          apiKey,
          numImages: 1,
          aspectRatio: '16:9',
          model: modelToUse,
        });

        if (result.success) {
          return result;
        }

        const error = result.error?.toLowerCase() || '';
        if (error.includes('safety policy') || error.includes('api key') || error.includes('authentication')) {
          return result;
        }

        if (attempt > retries) {
          return { success: false, error: result.error || 'Image generation failed after multiple attempts.'};
        }
        
        console.warn(`Image generation failed on attempt ${attempt} for panel ${panelNumber}. Retrying...`);

      } catch (e) {
        if (attempt > retries) {
          const message = e instanceof Error ? e.message : 'An unknown network error occurred.';
          return { success: false, error: message };
        }
        console.warn(`A network error occurred on attempt ${attempt} for panel ${panelNumber}. Retrying...`);
      }
    }
    return { success: false, error: 'Image generation failed after all retry attempts.' };
  };

  const handleSaveStoryToHistory = async (storyScenes: Scene[]) => {
      const firstImage = storyScenes.find(s => s.imageUrl)?.imageUrl;
      if (!firstImage) return; // Cannot save to history without a thumbnail.

      const idToSave = activeHistoryId || new Date().toISOString();

      const newHistoryItem: StoryHistoryItem = {
        id: idToSave,
        prompt,
        settings: { genre, style, panelCount },
        scenes: storyScenes,
        thumbnail: firstImage,
      };

      await saveStoryHistoryItem(newHistoryItem);
      await pruneStoryHistory(3);
      const updatedHistory = await getStoryHistory();
      setStoryHistory(updatedHistory);
      setActiveHistoryId(idToSave);
  };

  const startStoryGeneration = async () => {
    if (isGeneratingRef.current) return;
    if (!apiKey) {
      toast({ variant: 'destructive', title: 'API Key Missing', description: 'Please enter your Google AI API key.' });
      return;
    }
    if (!prompt.trim()) {
      toast({ variant: 'destructive', title: 'Prompt Missing', description: 'Please enter a story idea.' });
      return;
    }

    isGeneratingRef.current = true;
    setIsLoading(true);
    setScenes([]);
    setActiveHistoryId(null);

    const stylePrompt = storyStyles.find(s => s.id === style)?.prompt || '';
    const finalScenes: Scene[] = [];

    try {
        for (let i = 0; i < Number(panelCount); i++) {
            const panelNumber = i + 1;
            
            setLoadingText(`Writing panel ${panelNumber} of ${panelCount}...`);
            
            const previousSceneNarrative = i > 0 ? finalScenes[i-1]?.narrative : '';

            const sceneResult = await generateStorySceneAction({
                prompt,
                genre,
                style: stylePrompt,
                panelNumber,
                totalPanels: Number(panelCount),
                previousSceneNarrative,
                apiKey,
            });

            if (!sceneResult.success || !sceneResult.scene) {
                throw new Error(sceneResult.error || `Failed to generate text for panel ${panelNumber}.`);
            }

            const newScene: Scene = {
                narrative: sceneResult.scene.narrative,
                imagePrompt: sceneResult.scene.imagePrompt,
                isGeneratingImage: isStorytellerImageGenEnabled,
            };
            
            finalScenes.push(newScene);
            setScenes(currentScenes => [...currentScenes, newScene]);
            
            if (isStorytellerImageGenEnabled) {
                setLoadingText(`Illustrating panel ${panelNumber}...`);
                const fullImagePrompt = `${newScene.imagePrompt}, ${stylePrompt}`;
                const imageResult = await generateImageWithRetry(fullImagePrompt, apiKey, panelNumber, model, 1);
                
                if (imageResult.success && imageResult.images) {
                    finalScenes[i].imageUrl = imageResult.images[0].url;
                    incrementImageCount(model, 1);
                } else {
                    console.error(`Image generation failed for panel ${panelNumber}:`, imageResult.error);
                    toast({ variant: 'destructive', title: `Image Error (Panel ${panelNumber})`, description: imageResult.error });
                }
                finalScenes[i].isGeneratingImage = false;

                setScenes(currentScenes => {
                    const updatedScenes = [...currentScenes];
                    if (updatedScenes[i]) {
                        updatedScenes[i].imageUrl = finalScenes[i].imageUrl;
                        updatedScenes[i].isGeneratingImage = false;
                    }
                    return updatedScenes;
                });
            }
        }
        if (isStorytellerImageGenEnabled) {
          await handleSaveStoryToHistory(finalScenes);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : `An unknown error occurred during story generation.`;
        toast({ variant: 'destructive', title: 'Story Generation Halted', description: message });
    } finally {
        setIsLoading(false);
        setLoadingText('');
        isGeneratingRef.current = false;
    }
  };

  const handleSkillChange = (skill: Skill, delta: number) => {
    const currentSkillValue = skills[skill];

    if (delta > 0) { // Increasing skill
        if (pointsRemaining > 0 && currentSkillValue < 10) {
            setSkills(prev => ({...prev, [skill]: prev[skill] + 1}));
        }
    } else { // Decreasing skill
        if (currentSkillValue > 0) {
            setSkills(prev => ({...prev, [skill]: prev[skill] - 1}));
        }
    }
  }


  const handleCreateStory = () => {
    const storyExists = storyMode === 'storyteller' ? scenes.length > 0 : !!adventureState;
    if (storyExists && !isLoading) {
      setIsAlertOpen(true);
    } else {
      if (storyMode === 'storyteller') {
        startStoryGeneration();
      } else {
         handleStartAdventure();
      }
    }
  }

  const handleDownload = (url: string | undefined, filename: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: 'Narrative Copied!',
        description: 'The text for this panel has been copied to your clipboard.',
    });
  };
  
  const handleDownloadZip = async () => {
    if (scenes.length === 0) return;
    setIsPackaging(true);
    try {
        const result = await packageStoryAction({
            scenes: scenes.map(s => ({
                narrative: s.narrative,
                image: s.imageUrl,
            })),
            title: prompt.trim().slice(0, 50) || 'My Story'
        });

        if (result.success && result.zipData) {
            const link = document.createElement('a');
            link.href = `data:application/zip;base64,${result.zipData}`;
            link.download = `${(prompt.trim().slice(0, 50) || 'story').replace(/\s+/g, '_')}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            throw new Error(result.error || 'Failed to package story.');
        }

    } catch (error) {
         const message = error instanceof Error ? error.message : 'An unknown error occurred while packaging the story.';
         toast({ variant: 'destructive', title: 'Packaging Failed', description: message });
    } finally {
        setIsPackaging(false);
    }
  };

  const handleChoiceClick = async (choice: AdventureChoice) => {
    if (isLoading || !adventureState) return;
    
    setIsLoading(true);
    setLoadingText('Deciding your fate...');
    setCustomChoiceText(''); // Clear custom input on any choice submission
    
    try {
        const stylePrompt = adventurerStyles.find(s => s.id === adventurerStyle)?.prompt || '';
        const result = await progressAdventureAction({
            adventureState,
            choice,
            visualStyle: stylePrompt,
            apiKey
        });
        
        if (result.success && result.state) {
            setAdventureState(result.state);
        } else {
             throw new Error(result.error || 'Failed to progress adventure.');
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : `An unknown error occurred.`;
        toast({ variant: 'destructive', title: 'Adventure Update Failed', description: message });
    } finally {
        setIsLoading(false);
        setLoadingText('');
    }
  }

  const handleHistorySelect = (item: StoryHistoryItem) => {
    setIsAlertOpen(false);
    setPrompt(item.prompt);
    setGenre(item.settings.genre);
    setStyle(item.settings.style);
    setPanelCount(item.settings.panelCount);
    setScenes(item.scenes);
    setActiveHistoryId(item.id);
    setStoryMode('storyteller');
    setAdventureState(null);
    setIsLoading(false);
    isGeneratingRef.current = false;
  };
  
  const handleGenerateLogImage = async (index: number) => {
    if (logImageLoading[index] || !adventureState) return;

    if (!apiKey) {
      toast({ variant: 'destructive', title: 'API Key Missing' });
      return;
    }

    setLogImageLoading(prev => ({ ...prev, [index]: true }));

    const scene = adventureState.sceneHistory[index];
    const visualStylePrompt = adventurerStyles.find(s => s.id === adventurerStyle)?.prompt || '';

    const result = await generateAdventureSceneImageAction({
      characterVisualDescription: adventureState.character.characterVisualDescription,
      imagePrompt: scene.imagePrompt,
      visualStylePrompt: visualStylePrompt,
      apiKey,
      model,
    });

    if (result.success && result.imageUrl) {
      setAdventureState(prevState => {
        if (!prevState) return null;
        const newSceneHistory = [...prevState.sceneHistory];
        newSceneHistory[index] = { ...newSceneHistory[index], imageUrl: result.imageUrl };
        return { ...prevState, sceneHistory: newSceneHistory };
      });
      incrementImageCount(model, 1);
    } else {
      toast({
        variant: 'destructive',
        title: 'Image Generation Failed',
        description: result.error,
      });
    }
    setLogImageLoading(prev => ({ ...prev, [index]: false }));
  };

  const handleGenerateStorytellerImage = async (index: number) => {
    if (sceneImageLoading[index] || !apiKey) {
        if (!apiKey) toast({ variant: 'destructive', title: 'API Key Missing' });
        return;
    }

    setSceneImageLoading(prev => ({ ...prev, [index]: true }));

    try {
        const scene = scenes[index];
        const stylePrompt = storyStyles.find(s => s.id === style)?.prompt || '';
        const fullPrompt = `${scene.imagePrompt}, ${stylePrompt}`;

        const imageResult = await generateImageWithRetry(fullPrompt, apiKey, index + 1, model, 1);

        if (imageResult.success && imageResult.images) {
            const newScenes = [...scenes];
            newScenes[index].imageUrl = imageResult.images[0].url;
            newScenes[index].isGeneratingImage = false;
            setScenes(newScenes);

            await handleSaveStoryToHistory(newScenes);
            incrementImageCount(model, 1);
        } else {
            throw new Error(imageResult.error || `Image generation failed for panel ${index + 1}.`);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        toast({ variant: 'destructive', title: 'Image Generation Failed', description: message });
    } finally {
        setSceneImageLoading(prev => ({ ...prev, [index]: false }));
    }
  };


  if (!isMounted) {
    return null;
  }
  
  const isTerminalScene = adventureState?.currentScene.isTerminal || (adventureState && adventureState.currentScene.choices.length === 0 && adventureState.sceneHistory.length > 0);


  const mainButtonText = () => {
    if (isLoading) {
        return <span className="flex items-center justify-center gap-2"><LoadingSpinner /> {loadingText}</span>;
    }
    if (storyMode === 'adventurer') {
        return "Start Adventure";
    }
    // Storyteller mode
    if (scenes.length > 0) {
        return 'Create New Story';
    }
    return 'Create Story';
  };

  const placeholderText = () => {
      if (storyMode === 'adventurer') {
          return {
              title: "Your adventure awaits",
              description: "Describe your character and world, then click \"Start Adventure\" to begin."
          }
      }
      return {
          title: "Your story will appear here",
          description: "Fill out the details on the left and click \"Create Story\" to begin your adventure."
      }
  }

  const renderAdventurerContent = () => {
    if (isLoading && !adventureState) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
                <LoadingSpinner className="h-16 w-16 text-primary" />
                <h2 className="mt-6 text-2xl">{loadingText || 'Starting...'}</h2>
            </div>
        );
    }

    if (adventureState && isGeneratingOpening) {
        return (
             <div className="flex-grow flex flex-col items-center justify-center text-center">
                <LoadingSpinner className="h-16 w-16 text-primary" />
                <h2 className="mt-6 text-2xl">Building your world...</h2>
                <p className="mt-2 text-muted-foreground">The adventure is about to begin.</p>
            </div>
        )
    }

    if (adventureState) {
       return (
        <div className="flex-grow flex flex-col h-full">
            <div className="aspect-[16/9] w-full bg-secondary rounded-lg flex items-center justify-center relative overflow-hidden mb-4">
                {adventureState.currentScene.isGeneratingImage ? (
                     <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <LoadingSpinner className="h-12 w-12 text-primary" />
                        <p className="text-lg">Illustrating scene...</p>
                     </div>
                ) : adventureState.currentScene.imageUrl ? (
                    <button 
                        className="relative w-full h-full group focus:outline-none"
                        onClick={() => {
                            setSelectedImageUrl(adventureState.currentScene.imageUrl!);
                            setIsViewerOpen(true);
                        }}
                    >
                        <Image src={adventureState.currentScene.imageUrl} alt="Current scene" fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                            <p className="text-white text-lg font-bold">View Image</p>
                        </div>
                    </button>
                ) : (
                    <BookOpen className="h-24 w-24 text-muted-foreground/30" />
                )}
            </div>
            <div className="flex-grow overflow-y-auto pr-2 mb-4">
                <p className="text-base leading-relaxed text-left whitespace-pre-line text-foreground/90">
                    {adventureState.currentScene.narrative}
                </p>
            </div>
            
            {isTerminalScene ? (
                <div className="mt-auto pt-4 border-t border-border/50 text-center">
                    <h3 className="text-2xl font-bold mb-4 font-story-title">The End</h3>
                    <Button onClick={() => setAdventureState(null)}>
                        <Sparkles className="mr-2 h-4 w-4"/>
                        Start a New Adventure
                    </Button>
                </div>
            ) : (
                <div className="mt-auto pt-4 border-t border-border/50">
                    <h3 className="text-lg font-bold mb-2">What do you do?</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {adventureState.currentScene.choices.map((choice, index) => (
                            <Button key={index} variant="secondary" className="h-auto justify-start text-left py-2 whitespace-normal" onClick={() => handleChoiceClick(choice)} disabled={isLoading}>
                                <div>
                                    <span>{choice.text}</span>
                                    {choice.skillCheck && (
                                        <span className="text-xs text-primary/80 block capitalize">({choice.skillCheck.skill} DC {choice.skillCheck.dc})</span>
                                    )}
                                </div>
                            </Button>
                        ))}
                    </div>
                    <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                            <Input 
                                type="text" 
                                placeholder="Write your own action..." 
                                value={customChoiceText}
                                onChange={(e) => setCustomChoiceText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customChoiceText.trim() && !isLoading) {
                                        handleChoiceClick({ text: customChoiceText });
                                    }
                                }}
                                className="bg-input"
                            />
                            <Button 
                                onClick={() => handleChoiceClick({ text: customChoiceText })}
                                disabled={!customChoiceText.trim() || isLoading}
                            >
                                Submit
                            </Button>
                        </div>
                        <p className="text-xs text-primary/80 text-center">The DM will decide the outcome.</p>
                    </div>
                </div>
            )}
        </div>
       )
    }

    // Default placeholder
    return (
        <div className="flex-grow flex flex-col items-center justify-center text-center">
            <BookOpen className="h-24 w-24 text-muted-foreground/30" />
            <h2 className="mt-6 text-2xl">{placeholderText().title}</h2>
            <p className="mt-2 text-muted-foreground">{placeholderText().description}</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8 font-story-base">
      <div className="max-w-screen-2xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
            Back to Home
          </a>
          <div className="flex items-center gap-3">
            <VisageLogo className="h-9 w-9 text-primary" />
            <h1 className="text-4xl sm:text-5xl text-primary tracking-wider font-bold font-story-title">Story Mode</h1>
          </div>
          <div className="w-auto flex justify-end">
            {adventureState && (
                <Button variant="outline" onClick={() => setIsLogOpen(true)}>
                    <BookText className="mr-2 h-4 w-4" />
                    Adventure Log
                </Button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-card/80 border-border/50">
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <Label htmlFor="api-key-input" className="flex items-center gap-2">
                            <GoogleLogo className="h-5 w-5" />
                            <span>Google AI Key</span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input id="api-key-input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-input" placeholder="Your Google AI API Key" />
                            <Button onClick={handleSaveKey}>{saveButtonText}</Button>
                        </div>
                    </div>
                    <ImageCounterDisplay />
                </CardContent>
            </Card>

            <Card className="bg-card/80 border-border/50">
                <CardHeader className="p-6">
                    <CardTitle className="text-lg">Generation Model</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <Select value={model} onValueChange={setModel}>
                        <SelectTrigger className="w-full bg-input border-border">
                            <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="imagen-3.0-generate-002">
                                <div>Imagen 3</div>
                            </SelectItem>
                            <SelectItem value="imagen-4.0-generate-preview-06-06">
                                <div>Imagen 4 <span className="text-muted-foreground">(Preview)</span></div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

             <Card className="bg-card/80 border-border/50">
                <CardHeader className="p-6">
                    <CardTitle className="text-lg">Choose Your Experience</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                    <ToggleGroup 
                        type="single" 
                        value={storyMode} 
                        onValueChange={(value) => { if (value) setStoryMode(value as 'storyteller' | 'adventurer') }} 
                        className="grid grid-cols-2 gap-2"
                    >
                        <ToggleGroupItem value="storyteller" aria-label="Storyteller Mode" className="h-auto py-2 flex-col gap-1">
                            <span className="font-bold text-base">Storyteller</span>
                            <span className="text-xs text-muted-foreground font-normal text-center">A linear, illustrated story created from your idea.</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="adventurer" aria-label="Adventurer Mode" className="h-auto py-2 flex-col gap-1">
                            <span className="font-bold text-base">Adventurer</span>
                            <span className="text-xs text-muted-foreground font-normal text-center">An interactive, choice-driven adventure.</span>
                        </ToggleGroupItem>
                    </ToggleGroup>
                </CardContent>
            </Card>
            
            <Card className="bg-card/80 border-border/50">
                <CardContent className="p-6 space-y-4">
                    <div>
                        <Label htmlFor="prompt-input" className="text-lg">{storyMode === 'storyteller' ? 'Your Story Idea' : 'Describe Your Character & World'}</Label>
                        <div className="relative mt-2">
                            <Textarea
                                id="prompt-input"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder={storyMode === 'storyteller' ? "A lost robot searches for its creator..." : "A grizzled detective in a rain-slicked cyberpunk city..."}
                                className="bg-input pr-10 min-h-[100px]"
                            />
                            <Button variant="ghost" size="icon" onClick={handleToggleListening} className={cn("absolute right-1 top-1 h-8 w-8 text-muted-foreground", isListening && "text-primary animate-pulse")}>
                                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </Button>
                        </div>
                         {storyMode === 'storyteller' ? (
                            <div className="flex flex-col gap-2 mt-2">
                                <Button onClick={handleOptimizePrompt} disabled={isOptimizing || !prompt.trim()} variant="secondary" size="sm" className="w-full">
                                    <div className="flex items-center justify-center gap-2">
                                        {isOptimizing ? <LoadingSpinner /> : <Sparkles />}
                                        <span>{isOptimizing ? 'Optimizing...' : 'Optimize Idea'}</span>
                                    </div>
                                </Button>
                                <Button onClick={handleSurpriseMe} disabled={isSurprising || isOptimizing} variant="secondary" size="sm" className="w-full">
                                    <div className="flex items-center justify-center gap-2">
                                        {isSurprising ? <LoadingSpinner /> : <Bot />}
                                        <span>{isSurprising ? 'Generating...' : 'Surprise Me!'}</span>
                                    </div>
                                </Button>
                            </div>
                         ) : (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <Button onClick={handleGenerateCharacter} disabled={isGeneratingCharacter || isBuildingAdventure} variant="secondary" className="w-full">
                                    <div className="flex items-center justify-center gap-2">
                                        {isGeneratingCharacter ? <LoadingSpinner className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                        <span>{isGeneratingCharacter ? 'Generating...' : 'Generate Character'}</span>
                                    </div>
                                </Button>
                                 <Button onClick={handleBuildAdventureRandom} disabled={isGeneratingCharacter || isBuildingAdventure} variant="secondary" className="w-full">
                                     <div className="flex items-center justify-center gap-2">
                                        {isBuildingAdventure ? <LoadingSpinner className="h-4 w-4" /> : <Dices className="h-4 w-4" />}
                                        <span>{isBuildingAdventure ? 'Building...' : 'Build Journey'}</span>
                                    </div>
                                </Button>
                            </div>
                         )}
                    </div>

                    {storyMode === 'storyteller' ? (
                        <>
                            <div>
                                <Label className="text-lg">Artistic Style</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full mt-2 bg-input justify-between">
                                            <span>{storyStyles.find(s => s.id === style)?.label || 'Select Style'}</span>
                                            <ChevronDown className="h-4 w-4 opacity-50"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                        <DropdownMenuRadioGroup value={style} onValueChange={setStyle}>
                                            {storyStyles.map(s => <DropdownMenuRadioItem key={s.id} value={s.id}>{s.label}</DropdownMenuRadioItem>)}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div>
                                <Label className="text-lg">Genre</Label>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full mt-2 bg-input justify-between">
                                            <span>{genres.find(g => g.id === genre)?.id || 'Select Genre'}</span>
                                            <ChevronDown className="h-4 w-4 opacity-50"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                        <DropdownMenuRadioGroup value={genre} onValueChange={setGenre}>
                                            {genres.map(g => <DropdownMenuRadioItem key={g.id} value={g.id}>{g.id}</DropdownMenuRadioItem>)}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div>
                                <Label className="text-lg">Story Length</Label>
                                <ToggleGroup type="single" value={panelCount} onValueChange={(v) => v && setPanelCount(v)} className="w-full grid grid-cols-3 gap-2 mt-2">
                                    {panelCounts.map(pc => (
                                        <ToggleGroupItem 
                                          key={pc} 
                                          value={pc} 
                                          className="h-auto py-2 flex flex-col leading-snug border border-border data-[state=on]:border-primary"
                                        >
                                          <span className="font-bold text-base">{pc}</span>
                                          <span className="text-xs font-normal">Panels</span>
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </div>
                             <div className="flex items-center justify-between mt-2 pt-4 border-t border-border/50">
                                <Label htmlFor="story-image-gen-switch" className="flex items-center gap-2 text-base">
                                    <Camera className="h-5 w-5" />
                                    <span>Generate Images</span>
                                </Label>
                                <Switch
                                    id="story-image-gen-switch"
                                    checked={isStorytellerImageGenEnabled}
                                    onCheckedChange={setIsStorytellerImageGenEnabled}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-center">Disable to write the story first, then generate images on demand to save API calls.</p>
                        </>
                    ) : (
                        <>
                             <div>
                                <Label className="text-lg">Setting</Label>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full mt-2 bg-input justify-between">
                                            <span>{adventurerSetting}</span>
                                            <ChevronDown className="h-4 w-4 opacity-50"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                                        <DropdownMenuRadioGroup value={adventurerSetting} onValueChange={setAdventurerSetting}>
                                            {adventurerSettings.map(s => <DropdownMenuRadioItem key={s} value={s}>{s}</DropdownMenuRadioItem>)}
                                        </DropdownMenuRadioGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div>
                                <Label className="text-lg">Visual Style</Label>
                                <ToggleGroup type="single" value={adventurerStyle} onValueChange={(v) => v && setAdventurerStyle(v)} className="w-full grid grid-cols-2 gap-2 mt-2">
                                    {adventurerStyles.map(item => (
                                        <ToggleGroupItem key={item.id} value={item.id} className="h-12 text-base">{item.label}</ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                                <div className="flex items-center justify-between mt-2">
                                    <Label htmlFor="image-gen-switch" className="flex items-center gap-2 text-sm">
                                        <Camera className="h-4 w-4" />
                                        <span>Generate Images</span>
                                    </Label>
                                    <Switch
                                        id="image-gen-switch"
                                        checked={isAdventurerImageGenEnabled}
                                        onCheckedChange={setIsAdventurerImageGenEnabled}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-lg">Journey Length</Label>
                                <ToggleGroup type="single" value={adventureLength} onValueChange={(v) => v && setAdventureLength(v)} className="w-full grid grid-cols-2 gap-2 mt-2">
                                    {adventureLengths.map(item => (
                                        <ToggleGroupItem key={item.id} value={item.id} className="h-auto py-3 flex-col gap-2">
                                            <span className="font-bold text-base">{item.label}</span>
                                            <div className="flex items-center gap-0.5">
                                                {Array.from({ length: 4 }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            'h-1.5 w-5 rounded-full transition-colors',
                                                            i < item.length ? 'bg-primary/70' : 'bg-input'
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Button onClick={handleCreateStory} disabled={isLoading || isGeneratingCharacter || isBuildingAdventure} className="w-full h-16 text-xl">
                 {isLoading ? <LoadingSpinner className="h-8 w-8" /> : (storyMode === 'storyteller' ? <Sparkles className="mr-2 h-6 w-6"/> : <Bot className="mr-2 h-6 w-6" />)}
                 {mainButtonText()}
            </Button>

            {scenes.length > 0 && !isLoading && storyMode === 'storyteller' &&
              <Button onClick={handleDownloadZip} disabled={isPackaging} variant="secondary" className="w-full h-12 text-lg">
                {isPackaging ? 'Packaging...' : 'Download Story (.zip)'}
              </Button>
            }
          </div>

          <div className="lg:col-span-2">
            {storyMode === 'storyteller' ? (
                <>
                    {isLoading && scenes.length === 0 && (
                        <div className="h-full min-h-[70vh] flex flex-col items-center justify-center bg-card/50 border-2 border-dashed border-border/50 rounded-xl text-center p-8">
                            <BookOpen className="h-24 w-24 text-primary animate-pulse" />
                            <h2 className="mt-6 text-2xl">{loadingText || 'Preparing your story...'}</h2>
                            <p className="mt-2 text-muted-foreground">This may take a moment.</p>
                        </div>
                    )}

                    {!isLoading && scenes.length === 0 && (
                        <div className="h-full min-h-[70vh] flex flex-col items-center justify-center bg-card/50 border-2 border-dashed border-border/50 rounded-xl text-center p-8">
                            <BookOpen className="h-24 w-24 text-muted-foreground/30" />
                            <h2 className="mt-6 text-2xl">{placeholderText().title}</h2>
                            <p className="mt-2 text-muted-foreground">{placeholderText().description}</p>
                        </div>
                    )}

                    {scenes.length > 0 && (
                      <Carousel setApi={setCarouselApi} className="w-full">
                        <CarouselContent>
                            {scenes.map((scene, index) => (
                                <CarouselItem key={index}>
                                   <Card className="bg-card/80 border-border/50 overflow-hidden">
                                       <div className="aspect-[16/9] bg-secondary flex items-center justify-center relative">
                                        {scene.isGeneratingImage ? (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <LoadingSpinner />
                                                <span>Illustrating scene {index + 1}...</span>
                                            </div>
                                        ) : scene.imageUrl ? (
                                            <Image src={scene.imageUrl} alt={`Scene ${index + 1}`} fill className="object-cover"/>
                                        ) : sceneImageLoading[index] ? (
                                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                <LoadingSpinner />
                                                <span>Generating Image...</span>
                                            </div>
                                        ) : (
                                            <div className="text-center p-4">
                                                <p className="font-semibold mb-2">Image not generated</p>
                                                <Button size="sm" onClick={() => handleGenerateStorytellerImage(index)}>
                                                    <Camera className="mr-2 h-4 w-4" />
                                                    Generate Image
                                                </Button>
                                            </div>
                                        )}
                                       </div>
                                       <CardContent className="p-6">
                                            <p className="text-lg leading-relaxed mb-4 min-h-[7rem] whitespace-pre-line">{scene.narrative}</p>
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => handleDownload(scene.imageUrl, `scene_${index+1}_image.png`)} disabled={!scene.imageUrl}><FileImage className="h-4 w-4 mr-2"/>Image</Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleCopyText(scene.narrative)}><Copy className="h-4 w-4 mr-2"/>Text</Button>
                                            </div>
                                       </CardContent>
                                   </Card>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <div className="flex items-center justify-center mt-4 gap-4">
                            <CarouselPrevious className="static translate-y-0" />
                             <div className="text-sm text-muted-foreground">
                                Panel {currentSlide + 1} of {scenes.length || (storyMode === 'storyteller' ? panelCount : '??')}
                            </div>
                            <CarouselNext className="static translate-y-0" />
                        </div>
                      </Carousel>
                    )}
                </>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="xl:col-span-2">
                         <div className="h-full min-h-[70vh] flex flex-col justify-between bg-card/50 border-2 border-dashed border-border/50 rounded-xl p-6">
                            {renderAdventurerContent()}
                        </div>
                    </div>
                    <div className="xl:col-span-1">
                       <div className="sticky top-8 flex flex-col gap-4">
                            <HealthDisplay character={adventureState ? adventureState.character : previewCharacter} />
                            
                            {isAdventurerImageGenEnabled && (adventureState?.character.characterImageUrl ? (
                                 <div className="aspect-square w-full rounded-lg overflow-hidden bg-card/80 border-border/50">
                                     <Image src={adventureState.character.characterImageUrl} alt={adventureState.character.name} width={256} height={256} className="w-full h-full object-cover" />
                                 </div>
                            ) : adventureState?.character.characterVisualDescription || isLoading || isGeneratingOpening ? (
                                <div className="aspect-square w-full rounded-lg bg-card/80 border-border/50 flex items-center justify-center">
                                    <LoadingSpinner className="h-10 w-10 text-primary" />
                                </div>
                            ) : null)}


                            {adventureState ? (
                                <CharacterSheet character={adventureState.character} />
                            ) : (
                                <Card className="bg-card/80 border-border/50">
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-lg">Assign Skills</CardTitle>
                                        <CardDescription className="text-xs">You have {pointsRemaining} points left to assign. Each skill can have a maximum of 10 points.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 space-y-3">
                                        {skillsList.map(skillInfo => (
                                            <div key={skillInfo.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <skillInfo.icon className="h-4 w-4 text-muted-foreground" />
                                                    <Label className="text-xs">{skillInfo.name}</Label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleSkillChange(skillInfo.id, -1)} disabled={skills[skillInfo.id] <= 0}>
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center font-bold text-base">{skills[skillInfo.id]}</span>
                                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleSkillChange(skillInfo.id, 1)} disabled={pointsRemaining <= 0 || skills[skillInfo.id] >= 10}>
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            )}
                            <InventorySheet inventory={adventureState?.inventory || null} />
                        </div>
                    </div>
                </div>
            )}
          </div>
          <div className="lg:col-span-1">
            {storyMode === 'storyteller' && (
                <div className="sticky top-8">
                    <h2 className="text-2xl flex items-center gap-2 mb-4 text-primary"><HistoryIcon className="h-6 w-6" /> Story History</h2>
                    <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2">
                        {storyHistory.length === 0 && <p className="text-muted-foreground text-sm">Your previously generated stories will appear here.</p>}
                        {storyHistory.map(item => (
                            <button key={item.id} onClick={() => handleHistorySelect(item)} className={cn(
                                "w-full text-left p-0 border-2 border-transparent rounded-lg overflow-hidden transition-all",
                                activeHistoryId === item.id ? 'border-primary' : 'hover:border-primary/50'
                            )}>
                                <Card className="bg-card/80 hover:bg-card/90 transition-colors">
                                    <CardContent className="p-3">
                                        <div className="flex gap-4 items-center">
                                            <Image src={item.thumbnail} alt={item.prompt} width={64} height={64} className="rounded-md object-cover w-16 h-16 flex-shrink-0 bg-secondary" />
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium truncate text-foreground">{item.prompt}</p>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {item.settings.style.replace(/_/g, ' ')} &bull; {item.settings.genre}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{item.settings.panelCount} panels</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </button>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Create a new story?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will delete your currently displayed story. If you want to keep it, make sure to download the .zip file first.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  if (storyMode === 'storyteller') {
                    startStoryGeneration();
                  } else {
                     handleStartAdventure();
                  }
                }}>Create New</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl p-0 border-0 bg-card">
          {selectedImageUrl && (
            <>
              <DialogHeader className="p-4 pb-0">
                <DialogTitle>Image Viewer</DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <Image
                  src={selectedImageUrl}
                  alt="Selected adventure scene"
                  width={1920}
                  height={1080}
                  className="w-full h-auto object-contain rounded-md"
                />
              </div>
              <DialogFooter className="p-4 pt-0 sm:justify-between">
                <Button variant="secondary" onClick={() => setIsViewerOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => handleDownload(selectedImageUrl, `adventure_scene_${new Date().getTime()}.png`)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Image
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adventure Log</DialogTitle>
            <DialogDescriptionComponent>
              Review your past choices and generate images for scenes you skipped.
            </DialogDescriptionComponent>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {adventureState?.sceneHistory && adventureState.sceneHistory.map((scene, index) => (
                <div key={index}>
                  <p className="text-sm font-bold text-primary">Scene {index + 1}</p>
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{scene.narrative}</p>
                  <div className="mt-2 flex items-center gap-4">
                    {scene.imageUrl ? (
                      <Image src={scene.imageUrl} alt={`Scene ${index + 1}`} width={128} height={72} className="rounded-md object-cover aspect-video bg-secondary" />
                    ) : (
                      <div className="w-32 aspect-video bg-secondary rounded-md flex items-center justify-center">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-grow">
                      {scene.imageUrl ? (
                        <Button variant="secondary" size="sm" onClick={() => handleDownload(scene.imageUrl, `scene_${index + 1}.png`)}>
                          <Download className="mr-2 h-4 w-4" /> Download
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleGenerateLogImage(index)} disabled={logImageLoading[index]}>
                          {logImageLoading[index] ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                          {logImageLoading[index] ? 'Generating...' : 'Generate Image'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
              {(!adventureState?.sceneHistory || adventureState.sceneHistory.length === 0) && (
                <p className="text-muted-foreground text-center py-8">Your adventure has just begun. Past scenes will appear here.</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
