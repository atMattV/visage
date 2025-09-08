
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateKidsImageAction } from '@/lib/actions';
import Image from 'next/image';
import { ArrowLeft, Cat, Castle, Car, Dog, Home, Mountain, Plane, Rocket, Ship, Sparkles, Trees, Bird, Paintbrush, Rabbit, Fish, Turtle, PersonStanding, Bot, TrainFront, Bike, Bus, Star, Gift, Building2, Waves, Leaf, Squirrel, Snail, Camera, CakeSlice, ToyBrick, Palette, KeyRound, History, Download, School, X } from 'lucide-react';
import { VisageLogo, PawPrintIcon, ElephantIcon, GoogleLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getKidsHistory, pruneKidsHistory, saveKidsHistoryItem } from '@/lib/db';
import { useImageCounter } from '@/hooks/use-image-counter';
import { ImageCounterDisplay } from './image-counter-display';


export interface KidsHistoryItem {
  id: string;
  image: string;
  settings: {
    setting: string;
    subjects: string[];
    props: string[];
    style: string;
  };
}

const settings = [
  { id: 'forest', label: 'Forest', icon: Trees },
  { id: 'castle', label: 'Castle', icon: Castle },
  { id: 'city', label: 'City', icon: Building2 },
  { id: 'mountains', label: 'Mountains', icon: Mountain },
  { id: 'space', label: 'Space', icon: Rocket },
  { id: 'ocean', label: 'Ocean', icon: Ship },
  { id: 'farm', label: 'Farm', icon: Home },
  { id: 'beach', label: 'Beach', icon: Waves },
  { id: 'jungle', label: 'Jungle', icon: Leaf },
  { id: 'school', label: 'School', icon: School },
];

const styles = [
  { id: 'coloring', label: 'Coloring Page' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'claymation', label: 'Claymation' },
  { id: 'watercolor', label: 'Watercolor' },
  { id: 'pixel_art', label: 'Pixel Art' },
  { id: 'crayon', label: 'Crayon' },
  { id: 'sticker', label: 'Sticker' },
  { id: 'felt', label: 'Felt Craft' },
];

const subjects = [
  { id: 'dog', label: 'Dog', icon: Dog },
  { id: 'cat', label: 'Cat', icon: Cat },
  { id: 'elephant', label: 'Elephant', icon: ElephantIcon },
  { id: 'bird', label: 'Bird', icon: Bird },
  { id: 'lion', label: 'Lion', icon: PawPrintIcon },
  { id: 'rabbit', label: 'Rabbit', icon: Rabbit },
  { id: 'fish', label: 'Fish', icon: Fish },
  { id: 'turtle', label: 'Turtle', icon: Turtle },
  { id: 'person', label: 'Person', icon: PersonStanding },
  { id: 'robot', label: 'Robot', icon: Bot },
  { id: 'squirrel', label: 'Squirrel', icon: Squirrel },
  { id: 'snail', label: 'Snail', icon: Snail },
];

const props = [
  { id: 'car', label: 'Car', icon: Car },
  { id: 'airplane', label: 'Airplane', icon: Plane },
  { id: 'boat', label: 'Boat', icon: Ship },
  { id: 'rocket', label: 'Rocket', icon: Rocket },
  { id: 'train', label: 'Train', icon: TrainFront },
  { id: 'bike', label: 'Bike', icon: Bike },
  { id: 'bus', label: 'Bus', icon: Bus },
  { id: 'tree', label: 'Tree', icon: Trees },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'gift', label: 'Gift', icon: Gift },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'cake', label: 'Cake', icon: CakeSlice },
];

const MAX_SELECT = 3;

export default function KidsMode() {
  const [isMounted, setIsMounted] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [saveButtonText, setSaveButtonText] = useState('Save');
  const [setting, setSetting] = useState('forest');
  const [style, setStyle] = useState('coloring');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [history, setHistory] = useState<KidsHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { increment: incrementImageCount } = useImageCounter();


  useEffect(() => {
    setIsMounted(true);
    const storedApiKey = localStorage.getItem('googleAiApiKey');
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
    const loadHistory = async () => {
        try {
            const storedHistory = await getKidsHistory();
            setHistory(storedHistory);
        } catch (error) {
            console.error("Failed to load kids history", error);
            toast({
                variant: 'destructive',
                title: 'Could not load history'
            });
        }
    }
    loadHistory();
  }, [toast]);

  const handleSaveKey = () => {
    localStorage.setItem('googleAiApiKey', apiKey);
    setSaveButtonText('Saved!');
    setTimeout(() => setSaveButtonText('Save'), 2000);
  };

  const handleAddItem = (type: 'subject' | 'prop', id: string) => {
    const list = type === 'subject' ? selectedSubjects : selectedProps;
    const setList = type === 'subject' ? setSelectedSubjects : setSelectedProps;

    if (list.length >= MAX_SELECT) {
      toast({
        variant: 'destructive',
        title: `Too many ${type}s!`,
        description: `You can only add up to ${MAX_SELECT} items.`,
      });
      return;
    }
    setList(prev => [...prev, id]);
  };

  const handleRemoveItem = (type: 'subject' | 'prop', index: number) => {
    const setList = type === 'subject' ? setSelectedSubjects : setSelectedProps;
    setList(prev => prev.filter((_, i) => i !== index));
  };
  
  const subjectCounts = useMemo(() => {
    return selectedSubjects.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [selectedSubjects]);

  const propCounts = useMemo(() => {
    return selectedProps.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [selectedProps]);

  const handleGenerate = async () => {
    if (!apiKey) {
      toast({
        variant: 'destructive',
        title: 'API Key Missing',
        description: 'Please enter your Google AI API key to generate an image.',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedImage(null);
    setActiveHistoryId(null);

    try {
      const result = await generateKidsImageAction({
        setting,
        subjects: selectedSubjects,
        props: selectedProps,
        style,
        apiKey,
      });

      if (result.success && result.image) {
        setGeneratedImage(result.image.url);
        incrementImageCount('imagen-3.0-generate-002', 1);
        const newHistoryItem: KidsHistoryItem = {
            id: new Date().toISOString(),
            image: result.image.url,
            settings: {
                setting,
                subjects: selectedSubjects,
                props: selectedProps,
                style,
            }
        };

        await saveKidsHistoryItem(newHistoryItem);
        await pruneKidsHistory(10);
        const updatedHistory = await getKidsHistory();
        setHistory(updatedHistory);
        setActiveHistoryId(newHistoryItem.id);

      } else {
        throw new Error(result.error || 'Failed to generate image.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Oh no, something went wrong!',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleHistorySelect = (item: KidsHistoryItem) => {
    setActiveHistoryId(item.id);
    setGeneratedImage(item.image);
    setSetting(item.settings.setting);
    setSelectedSubjects(item.settings.subjects);
    setSelectedProps(item.settings.props);
    setStyle(item.settings.style);
    setIsLoading(false);
  };

  const handleDownload = (url: string | null) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    const filename = `visage-kids-creation-${new Date().getTime()}.png`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isGenerateDisabled = useMemo(() => {
      return !setting || isLoading;
  }, [setting, isLoading]);

  if (!isMounted) {
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center mb-6">
            <div className="justify-self-start">
                <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                    Back to Home
                </a>
            </div>

            <div className="flex items-center gap-3">
                <VisageLogo className="h-9 w-9 text-primary" />
                <h1 className="text-3xl sm:text-4xl text-primary">Kids Mode</h1>
            </div>
            
            <div />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4">
              <AccordionItem value="item-1" className="border-none">
                <Card>
                  <AccordionTrigger className="p-6">
                      <CardTitle>1. Choose a Place</CardTitle>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 pt-0">
                    <RadioGroup value={setting} onValueChange={setSetting} className="kids-mode-option-grid">
                      {settings.map((item) => (
                         <div key={item.id} className="flex items-center">
                            <RadioGroupItem value={item.id} id={item.id} className="sr-only" />
                            <Label htmlFor={item.id} className={cn(
                                'kids-mode-toggle-item flex w-full cursor-pointer items-center rounded-lg border-2 border-border bg-card p-4 transition-all hover:border-primary/50',
                                {'border-primary bg-primary/20 text-primary': setting === item.id}
                            )}>
                                <item.icon className="h-8 w-8" />
                                <span>{item.label}</span>
                            </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-none">
                <Card>
                  <AccordionTrigger className="p-6">
                      <CardTitle>2. Add Animals or People</CardTitle>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 pt-0">
                    <p className="text-sm text-muted-foreground mb-4 font-sans">Select up to {MAX_SELECT}.</p>
                    <div className="kids-mode-option-grid">
                      {subjects.map((item) => {
                        const count = subjectCounts[item.id] || 0;
                        const isDisabled = selectedSubjects.length >= MAX_SELECT && count === 0;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleAddItem('subject', item.id)}
                            disabled={isDisabled}
                            className={cn('kids-mode-option-btn', count > 0 && 'selected')}
                          >
                            <item.icon className="h-8 w-8" />
                            <span>{item.label}</span>
                            {count > 0 && <span className="selection-counter">{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {selectedSubjects.map((id, index) => (
                           <div key={index} className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-sm font-sans">
                             <span>{subjects.find(s => s.id === id)?.label}</span>
                             <button onClick={() => handleRemoveItem('subject', index)} className="rounded-full hover:bg-black/10 p-0.5">
                               <X className="h-3 w-3" />
                             </button>
                           </div>
                        ))}
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
              
              <AccordionItem value="item-3" className="border-none">
                <Card>
                  <AccordionTrigger className="p-6">
                      <CardTitle>3. Add Fun Things</CardTitle>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 pt-0">
                    <p className="text-sm text-muted-foreground mb-4 font-sans">Select up to {MAX_SELECT}.</p>
                    <div className="kids-mode-option-grid">
                       {props.map((item) => {
                        const count = propCounts[item.id] || 0;
                        const isDisabled = selectedProps.length >= MAX_SELECT && count === 0;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleAddItem('prop', item.id)}
                            disabled={isDisabled}
                            className={cn('kids-mode-option-btn', count > 0 && 'selected')}
                          >
                            <item.icon className="h-8 w-8" />
                            <span>{item.label}</span>
                            {count > 0 && <span className="selection-counter">{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {selectedProps.map((id, index) => (
                           <div key={index} className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-sm font-sans">
                             <span>{props.find(s => s.id === id)?.label}</span>
                             <button onClick={() => handleRemoveItem('prop', index)} className="rounded-full hover:bg-black/10 p-0.5">
                               <X className="h-3 w-3" />
                             </button>
                           </div>
                        ))}
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              <AccordionItem value="item-api-key" className="border-none">
                <Card>
                  <AccordionTrigger className="p-6">
                      <CardTitle className="flex items-center gap-2"><KeyRound className="h-6 w-6" /> API Key</CardTitle>
                  </AccordionTrigger>
                  <AccordionContent className="p-6 pt-0">
                    <div className="space-y-2 font-sans">
                        <Label htmlFor="api-key-input" className="flex items-center gap-2 text-muted-foreground font-normal">
                            <GoogleLogo className="h-5 w-5" />
                            <span>Google AI Key</span>
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input id="api-key-input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full" placeholder="Your Google AI API Key" />
                            <Button onClick={handleSaveKey} className="whitespace-nowrap font-normal">{saveButtonText}</Button>
                        </div>
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Your key is stored only in your browser and is needed to generate images.
                        </p>
                        <ImageCounterDisplay />
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
          </div>
          
          <div className="lg:col-span-2 flex flex-col items-center gap-6">
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Palette className="h-6 w-6" /> Choose a Style</CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={style} onValueChange={setStyle} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {styles.map((item) => (
                            <div key={item.id} className="flex items-center">
                            <RadioGroupItem value={item.id} id={`style-${item.id}`} className="sr-only" />
                            <Label 
                                htmlFor={`style-${item.id}`} 
                                className={cn(
                                'w-full cursor-pointer rounded-lg border-2 p-3 text-center font-normal transition-all hover:border-primary/50 whitespace-nowrap',
                                style === item.id ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-card'
                                )}
                            >
                                {item.label}
                            </Label>
                        </div>
                        ))}
                    </RadioGroup>
                </CardContent>
            </Card>

            <div className="w-full aspect-[4/3] bg-secondary rounded-xl border-2 border-dashed border-border flex items-center justify-center p-4">
              {isLoading && (
                 <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <svg className="animate-spin h-12 w-12 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="text-lg">Drawing your picture...</p>
                 </div>
              )}
              {!isLoading && generatedImage && (
                <button onClick={() => setIsViewerOpen(true)} className="relative w-full h-full group focus:outline-none">
                    <Image src={generatedImage} alt="Generated for kids" width={1024} height={768} className="object-contain w-full h-full rounded-lg transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 flex items-center justify-center rounded-lg">
                        <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">View</p>
                    </div>
                </button>
              )}
               {!isLoading && !generatedImage && (
                 <div className="text-center text-muted-foreground">
                    <p className="text-xl font-medium">Your drawing will appear here!</p>
                    <p className="mt-2">Choose some options and click the "Create!" button.</p>
                 </div>
              )}
            </div>
            <div className="flex items-center gap-4">
                <Button onClick={handleGenerate} disabled={isGenerateDisabled} className="kids-mode-generate-btn">
                    {isLoading ? 'Creating...' : (
                        <>
                            <Sparkles className="mr-4 h-8 w-8" />
                            Create!
                        </>
                    )}
                </Button>
            </div>
          </div>
          
          <div className="lg:col-span-1 flex flex-col">
            <div className="sticky top-6">
                <h2 className="text-2xl flex items-center gap-2 mb-2 text-primary"><History className="h-6 w-6" /> Your Creations</h2>
                <p className="text-xs text-muted-foreground mb-4 font-sans">Your last 10 drawings are saved in your browser.</p>
                 <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                    {history.length === 0 && <p className="text-muted-foreground text-sm">Your drawings will appear here!</p>}
                    {history.map(item => (
                        <button key={item.id} onClick={() => handleHistorySelect(item)} className={cn(
                            "w-full text-left p-0 border-2 border-transparent rounded-lg overflow-hidden transition-all",
                            activeHistoryId === item.id ? 'border-primary' : 'hover:border-primary/50'
                        )}>
                            <Card className="bg-card/50 hover:bg-card/90">
                                <CardContent className="p-2">
                                    <div className="flex gap-3 items-center">
                                        <Image src={item.image} alt="history item" width={64} height={64} className="rounded-md object-cover w-16 h-16 flex-shrink-0 bg-secondary" />
                                         <div className="overflow-hidden">
                                            <p className="text-sm font-normal truncate text-foreground capitalize">{item.settings.setting}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{item.settings.style.replace('_', ' ')}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {[...item.settings.subjects, ...item.settings.props].join(', ') || 'Just a setting'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </button>
                    ))}
                </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-3xl p-0 border-0 bg-card">
            {generatedImage && (
                <>
                    <DialogHeader className="p-4 pb-0">
                        <DialogTitle>Your Creation</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        <Image src={generatedImage} alt="Selected generated image" width={1024} height={768} className="w-full h-auto object-contain rounded-md" />
                    </div>
                    <DialogFooter className="p-4 pt-0 sm:justify-between">
                        <Button variant="secondary" onClick={() => setIsViewerOpen(false)}>Close</Button>
                        <Button onClick={() => handleDownload(generatedImage)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                        </Button>
                    </DialogFooter>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
