
'use server';

import JSZip from 'jszip';
import { ZodError } from 'zod';
import {
  AdventureStateSchema,
  ChoiceSchema,
  CharacterSkillsSchema,
  CharacterSchema,
  SceneSchema,
  InventoryItemSchema,
  SceneOutputSchema,
  GenerateStorySceneInputSchema,
  StartAdventureInputSchema,
  ProgressAdventureInputSchema,
  GenerateAdventureSceneImageInputSchema,
  AdventureOpeningSchema,
  GeneratedCharacterSchema,
  AdventureSetupSchema,
  type AdventureState,
  type Choice,
  type Character,
  type SceneOutput,
  type GenerateStorySceneInput,
  type StartAdventureInput,
  type ProgressAdventureInput,
  type GenerateAdventureSceneImageInput,
  type AdventureOpening,
  type GeneratedCharacter,
  type AdventureSetup,
} from '@/ai/adventure-schemas';


// This server action replicates the logic from the user's provided working HTML file.
export interface GenerateImageInput {
  prompt: string;
  apiKey: string;
  numImages: number;
  aspectRatio: string;
  model: string;
  inputImage?: string; // For img2img
}

export interface GeneratedImage {
  url: string;
}

const parseDataUri = (dataUri: string) => {
    const match = dataUri.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error('Invalid data URI format');
    }
    return { mimeType: match[1], base64Data: match[2] };
}

export async function generateImageAction(input: GenerateImageInput) {
  const { prompt, apiKey, numImages, aspectRatio, model, inputImage } = input;

  if (!apiKey) {
    return { success: false, error: 'API key is missing.' };
  }
  
  // Handle Gemini 2.0 Flash for multimodal generation
  if (model === 'gemini-2.0-flash-preview-image-generation') {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;
      
      const parts = [];
      
      if (inputImage) {
          const { mimeType, base64Data } = parseDataUri(inputImage);
          parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      }

      if (prompt) {
        parts.push({ text: prompt });
      }
      
      if (parts.length === 0) {
          return { success: false, error: 'Prompt or image is required for generation.' };
      }

      const payload = {
          contents: [{ parts }],
          generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
          },
      };

      try {
          const response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
          });

          if (!response.ok) {
              const result = await response.json();
              const errorDetails = result?.error?.message || `HTTP error! status: ${response.status}`;
              throw new Error(`Gemini generation failed. ${errorDetails}`);
          }

          const result = await response.json();
          const candidate = result.candidates?.[0];
          const mediaPart = candidate?.content?.parts?.find((p: any) => p.media);
          
          if (mediaPart?.media?.url) {
              return { success: true, images: [{ url: mediaPart.media.url }] };
          } else {
              // --- Enhanced Error Reporting ---
              if (candidate?.finishReason === 'SAFETY') {
                  const safetyRatings = candidate.safetyRatings;
                  const blockedCategories = safetyRatings?.filter((r: any) => r.blocked).map((r: any) => r.category).join(', ') || 'unspecified reasons';
                  return { success: false, error: `Image generation was blocked for safety reasons: ${blockedCategories}.`};
              }

              const textPart = candidate?.content?.parts?.find((p: any) => 'text' in p);
              if (textPart) {
                  const responseText = textPart.text.trim();
                  if (responseText) {
                      return { success: false, error: `The AI did not return an image. It responded with: "${responseText}"` };
                  } else {
                      return { success: false, error: `The AI responded with empty text instead of an image. Please try rephrasing your prompt.` };
                  }
              }
              
              // Fallback for truly unexpected responses
              const simplifiedResponse = JSON.stringify(result, (key, value) => (key === 'bytesBase64Encoded' || key === 'base64Data') ? '...<omitted>...' : value, 2);
              return { success: false, error: `The AI returned an empty or unexpected response. Raw response: ${simplifiedResponse}` };
          }
      } catch (error) {
          console.error('Gemini generation action error:', error);
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred with Gemini.';
          return { success: false, error: errorMessage };
      }
  }

  // Handle Imagen 3 & 4
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;
  
  const parameters: {
      sampleCount: number;
      aspectRatio: string;
  } = {
      sampleCount: numImages,
      aspectRatio: aspectRatio,
  };

  const payload = {
      instances: [{ prompt }],
      parameters: parameters,
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
        let errorText;
        try {
            errorText = await response.text();
            const result = JSON.parse(errorText);
            const errorDetails = result?.error?.message || `HTTP error! status: ${response.status}`;
            let userMessage = `Image generation failed. ${errorDetails}`;
            if (errorDetails.toLowerCase().includes('safety policy')) {
                userMessage = 'Your prompt was blocked for safety reasons. Please try a different prompt.';
            }
             if (errorDetails.toLowerCase().includes('api key not valid')) {
                userMessage = 'Authentication failed. Please check your API key.';
            }
            throw new Error(userMessage);
        } catch(e) {
            // If parsing fails, or we threw an error above, use the captured text or the new error message
            if (e instanceof Error) {
                throw e;
            }
            throw new Error(`Image generation failed: ${errorText || `HTTP ${response.status}`}`);
        }
    }

    const result = await response.json();

    if (result.predictions && result.predictions.length > 0) {
      const images: GeneratedImage[] = result.predictions.map((prediction: any) => ({
        url: `data:image/png;base64,${prediction.bytesBase64Encoded}`,
      }));
      return { success: true, images: images };
    } else {
      // Look for specific error information in the response even on 200 OK
      if (result.error) {
           return { success: false, error: result.error.message || 'Image generation failed with an unspecified error.'}
      }
      return {
        success: false,
        error: 'Image generation failed. The API returned no predictions.',
      };
    }
  } catch (error) {
    console.error('Image generation action error:', error);
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}

export interface OptimizePromptInput {
  prompt: string;
  style?: string;
  cameraAngle?: string;
  apiKey: string;
}

export interface OptimizePromptOutput {
  optimizedPrompt: string;
}

export async function optimizePromptAction(input: OptimizePromptInput): Promise<{success: boolean, optimizedPrompt?: string, error?: string}> {
    const { prompt, style, cameraAngle, apiKey } = input;
    if (!apiKey) {
        return { success: false, error: 'API key is missing.' };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let systemPrompt = `You are an expert prompt engineer for text-to-image AI models. 
Your task is to take a user's prompt and rewrite it to be more vivid, descriptive, and detailed, maximizing the potential for a stunning and high-quality image.
Focus on enhancing the original prompt by adding details about the scene, lighting, composition, and artistic style.
Do not add any preamble or conversational text, just return the optimized prompt. The response must be a JSON object with a single key "optimizedPrompt".`;

    let userPrompt = `Original prompt: ${prompt}`;
    if (style) {
        userPrompt += `\nIt is crucial that you incorporate and build upon the user's selected artistic style: "${style}".`;
    }
    if (cameraAngle) {
        userPrompt += `\nIt is crucial that you incorporate and build upon the user's selected camera angle: "${cameraAngle}".`;
    }

    const payload = {
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: [{
            parts: [{ text: userPrompt }]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                optimizedPrompt: {
                  type: "STRING"
                }
              },
              required: ["optimizedPrompt"]
            }
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Body:', errorText);
            try {
                const result = JSON.parse(errorText);
                const errorDetails = result?.error?.message || `HTTP error! status: ${response.status}`;
                throw new Error(errorDetails);
            } catch(e) {
                throw new Error(errorText);
            }
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        const content = candidate?.content?.parts?.[0]?.text;

        if (content) {
            try {
                const jsonResponse = JSON.parse(content);
                if (jsonResponse.optimizedPrompt) {
                     return { success: true, optimizedPrompt: jsonResponse.optimizedPrompt };
                }
            } catch (e) {
                // The response was not valid JSON
                 throw new Error("API returned an invalid response format.");
            }
        }
       
        throw new Error("API returned an unexpected response format.");

    } catch (error) {
        console.error('Prompt optimization error:', error);
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        } 
        
        if (errorMessage.toLowerCase().includes('safety policy')) {
            errorMessage = 'Your request was blocked by the safety filter. Please modify your prompt.';
        }

        return { success: false, error: errorMessage };
    }
}

// New action for describing sketch
export interface DescribeImageActionInput {
  imageDataUri: string;
  apiKey: string;
}

export async function describeImageAction(input: DescribeImageActionInput): Promise<{success: boolean; description?: string; error?: string}> {
    if (!input.apiKey) {
        return { success: false, error: 'API key is missing.' };
    }
    if (!input.imageDataUri) {
        return { success: false, error: 'Sketch data is missing.' };
    }
    
    try {
        const systemPrompt = `You are a highly imaginative creative partner. Your job is to look at a user's simple sketch or written words and transform it into a vivid, interesting, and descriptive prompt for an image generation AI. Do not be literal. See the user's intent, not just their lines. Embellish the concept with creative details.

**Your Core Rules:**
1.  **Interpret, Don't Just Describe:** A stick figure is a person. A simple circle is a sun. A crude box is a house. Your job is to see the real-world object the user was trying to draw and describe that. Add creative details (e.g., "a cozy house" instead of "a house").
2.  **Recognize Text as a Subject:** If the user has written a word (e.g., "Dog" or "Castle in the clouds"), use that as the main subject for a creative prompt. DO NOT describe it as "The text 'Dog'". Your prompt should be about a dog.
3.  **Understand Composition:** Describe the relationship between objects. If a sun is in the corner above a house, describe it as "A cozy house under a bright, shining sun."
4.  **No Technical Jargon:** Absolutely do not mention the medium ("sketch," "doodle," "line art," "stick figure") or the colors ("white lines," "black background"). You are describing a real, vibrant scene.
5.  **Be Concise but Evocative:** Your final prompt should be a single, descriptive sentence.

**Examples:**
- **Input:** A simple stick figure drawing with what looks like headphones.
- **Good Output:** A person listening to music on oversized headphones, head bobbing to the beat.
- **Bad Output:** A stick figure with headphones.

- **Input:** The word "Dragon" written out.
- **Good Output:** A magnificent, shimmering dragon with iridescent scales flying through a stormy sky.
- **Bad Output:** The text 'Dragon'.

- **Input:** A simple drawing of a car next to a tree.
- **Good Output:** A sleek, futuristic car parked under the shade of a weeping willow tree.`;
        
        const { mimeType, base64Data } = parseDataUri(input.imageDataUri);

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${input.apiKey}`;
        
        const payload = {
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: [{
                parts: [{
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                },
                {
                    text: "Now, interpret the sketch provided in the image data."
                }]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  description: {
                    type: "STRING"
                  }
                },
                required: ["description"]
              }
            }
        };
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const result = await response.json();
            console.error("Describe Image API Error Body:", result);
            const errorDetails = result?.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(`The AI failed to describe the image. ${errorDetails}`);
        }
        
        const result = await response.json();
        const candidate = result.candidates?.[0];
        const content = candidate?.content?.parts?.[0]?.text;

        if (content) {
            try {
                const jsonResponse = JSON.parse(content);
                if (jsonResponse.description) {
                    return { success: true, description: jsonResponse.description };
                }
            } catch (e) {
                 throw new Error('The AI returned an invalid response format.');
            }
        }

        throw new Error('The AI failed to describe the image or returned an unexpected format.');
    } catch (error) {
        console.error('Describe image action error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while analyzing the sketch.';
        return { success: false, error: errorMessage };
    }
}


export interface GenerateKidsImageActionInput {
  setting: string;
  subjects: string[];
  props: string[];
  style: string;
  apiKey: string;
}

export async function generateKidsImageAction(input: GenerateKidsImageActionInput): Promise<{success: boolean; image?: GeneratedImage; error?: string}> {
    if (!input.apiKey) {
        return { success: false, error: 'API key is missing. Please set it in the main app first.' };
    }
    
    try {
        let styleInstruction = '';
        switch (input.style) {
            case 'cartoon':
                styleInstruction = 'A bright, colorful, and friendly cartoon illustration in the style of a modern award-winning animated TV show. The scene should be vibrant, with clean lines, expressive characters, and a cheerful atmosphere. Avoid dark or scary elements.';
                break;
            case 'claymation':
                styleInstruction = 'A cute and colorful claymation (plasticine) style scene. The image should look like it\'s made of modeling clay, with a soft, tactile feel, visible fingerprints, and charming imperfections. The characters should be playful and the lighting soft and warm, as if on a miniature set.';
                break;
            case 'watercolor':
                styleInstruction = 'A soft and gentle watercolor painting illustration. The colors should be light, blended, and have a dreamy, whimsical feel with visible paper texture. Use a pastel color palette and soft ink outlines.';
                break;
            case 'pixel_art':
                styleInstruction = 'A chunky, friendly 8-bit retro pixel art scene. The image should be colorful and look like a classic 1980s video game, with clear blocky pixels, a limited but vibrant color palette, and no anti-aliasing.';
                break;
            case 'crayon':
                styleInstruction = 'A charming and slightly messy children\'s crayon drawing on textured paper. The image should have waxy textures, variable line thickness, and vibrant but slightly uneven coloring, as if drawn by a child.';
                break;
            case 'sticker':
                styleInstruction = 'A glossy, die-cut sticker style illustration. The image should have vibrant colors, a simple and cute design, and be surrounded by a thick white border to make it pop. The background should be clean and simple.';
                break;
            case 'felt':
                styleInstruction = 'A soft and fuzzy felt craft illustration. The image should look like it\'s made from cut-out pieces of colored felt, layered on top of each other, with visible stitching details and a charming, handmade quality.';
                break;
            case 'coloring':
            default:
                styleInstruction = 'A simple, friendly, and fun coloring book page for a child. The drawing must have thick, clean, black outlines and no shading, colors, or complex details, making it easy to color in.';
                break;
        }

        const promptParts = [
          styleInstruction,
          `The scene is a ${input.setting}.`,
        ];

        if (input.subjects && input.subjects.length > 0) {
          promptParts.push(
            'It should contain the following cute characters or items:'
          );
          input.subjects.forEach((s) => promptParts.push(`- A ${s}`));
        }

        if (input.props && input.props.length > 0) {
          promptParts.push('It should also include these simple props:');
          input.props.forEach((p) => promptParts.push(`- A ${p}`));
        }

        if (
          (!input.subjects || input.subjects.length === 0) &&
          (!input.props || input.props.length === 0)
        ) {
          promptParts.push('The setting should be very cheerful and simple.');
        }

        const fullPrompt = promptParts.join('\n');

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${input.apiKey}`;
        
        const payload = {
            instances: [{ prompt: fullPrompt }],
            parameters: { 
                sampleCount: 1,
                aspectRatio: '4:3',
            },
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
            let errorText;
            try {
                errorText = await response.text();
                const result = JSON.parse(errorText);
                const errorDetails = result?.error?.message || `HTTP error! status: ${response.status}`;
                let userMessage = `Image generation failed. ${errorDetails}`;
                if (errorDetails.toLowerCase().includes('safety policy')) {
                    userMessage = 'Your prompt was blocked for safety reasons. Please try a different combination.';
                }
                throw new Error(userMessage);
            } catch (e) {
                if (e instanceof Error) {
                  throw e;
                }
                throw new Error(errorText);
            }
        }

        const result = await response.json();

        if (result.predictions && result.predictions.length > 0) {
            const imageBase64 = result.predictions[0].bytesBase64Encoded;
            return { success: true, image: { url: `data:image/png;base64,${imageBase64}` } };
        }
        
        throw new Error(
          'Image generation failed to produce an image. The model may have returned an empty response.'
        );
    } catch (error) {
        console.error('Kids image generation action error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during image generation.';
        return { success: false, error: errorMessage };
    }
}

// Story Mode Actions

// Manually created JSON Schema for SceneOutputSchema
const SceneOutputJSONSchema = {
    type: "OBJECT",
    properties: {
        narrative: {
            type: "STRING",
            description: "The narrative text for this single scene, written as pure, descriptive prose like in a novel. It must not contain any speaker tags or script formatting."
        },
        imagePrompt: {
            type: "STRING",
            description: "A highly detailed and vivid image prompt for an AI image generator (like Imagen) that visually represents this scene. Ensure consistent character and environment descriptions across scenes."
        }
    },
    required: ["narrative", "imagePrompt"]
};

function getPerPanelWordCount(totalPanels: number): number {
    if (totalPanels <= 6) return 160;
    if (totalPanels <= 12) return 160;
    if (totalPanels <= 18) return 140;
    if (totalPanels <= 24) return 125;
    if (totalPanels <= 30) return 115;
    if (totalPanels <= 36) return 110;
    return 150; // Default
}

// This action generates ONLY ONE scene of the story at a time.
export async function generateStorySceneAction(input: GenerateStorySceneInput): Promise<{ success: boolean; scene?: SceneOutput; error?: string }> {
  try {
    const { prompt, genre, style, panelNumber, totalPanels, previousSceneNarrative, apiKey } = GenerateStorySceneInputSchema.parse(input);
    
    if (!apiKey) {
      throw new Error('API key is missing.');
    }
    
    const perPanelWordCount = getPerPanelWordCount(totalPanels);

    const systemPrompt = `You are an expert storyteller and a master prompt engineer for the Imagen text-to-image AI. Your task is to continue a story, writing just ONE single scene at a time. You must maintain perfect consistency with the previous parts of the story.

**Your Job:**
1.  **Write the NEXT Scene ONLY**: Based on the user's idea and the story so far, write the narrative for the *next* single scene.
2.  **Narrative Style**: Write in a traditional, descriptive novel style. **ABSOLUTELY NO SPEAKER TAGS** or script formatting (e.g., "NARRATOR:"). Adapt your tone to the provided **Genre**.
3.  **Word Count**: The scene you write should be approximately **${perPanelWordCount} words** long.
4.  **Image Prompt**: Create a vivid image prompt that reflects this new scene. **CRITICAL: The image prompt MUST NOT contain any artistic style keywords.** It should only describe the content of the scene. The user's chosen artistic style will be added later.

Your final output MUST be a valid JSON object with 'narrative' and 'imagePrompt' keys for this single scene.`;

    const userMessage = `Initial Idea: "${prompt}"
Genre: ${genre}
Artistic Style to eventually be applied (do not include in your prompt): ${style}
Total Panels in Story: ${totalPanels}
Current Panel to Generate: Panel #${panelNumber}

---
Previous Scene's Narrative (for context):
${previousSceneNarrative || "(This is the first panel. Start the story.)"}
---

Now, generate the JSON for Panel #${panelNumber}.`;
    
    const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const textPayload = { systemInstruction: { parts: [{ text: systemPrompt }] }, contents: [{ parts: [{ text: userMessage }] }], generationConfig: { responseMimeType: "application/json", responseSchema: SceneOutputJSONSchema } };
    
    const textResponse = await fetch(textApiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(textPayload) });
    
    if (!textResponse.ok) { 
        const errorText = await textResponse.text();
        console.error("Story Scene Generation API Error:", errorText);
        try {
            const textResult = JSON.parse(errorText);
            const errorDetails = textResult?.error?.message || `HTTP error! status: ${textResponse.status}`;
            throw new Error(errorDetails);
        } catch(e) {
            throw new Error(errorText);
        }
    }
    
    const textResult = await textResponse.json();
    const textContent = textResult.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) { throw new Error('The AI failed to generate story content for this scene.'); }
    
    let sceneData: SceneOutput;
    try {
      sceneData = JSON.parse(textContent);
      SceneOutputSchema.parse(sceneData); // Validate the parsed data against the schema
    } catch (e) {
      console.error("Failed to parse or validate story scene data:", e);
      throw new Error('The AI returned scene data in an invalid format.');
    }

    return { success: true, scene: sceneData };

  } catch (error) {
    console.error("Error in generateStorySceneAction:", error);
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    if (errorMessage.toLowerCase().includes('safety policy')) {
        errorMessage = 'This scene could not be generated because the content was blocked by the safety filter.';
    }

    return { success: false, error: errorMessage };
  }
}

export interface PackageStoryInput {
    scenes: {
        narrative: string;
        image?: string; // data URI
    }[];
    title: string;
}

export async function packageStoryAction(input: PackageStoryInput): Promise<{ success: boolean; zipData?: string; error?: string }> {
    try {
        const zip = new JSZip();
        let fullNarrative = `${input.title}\n\n`;

        for (let i = 0; i < input.scenes.length; i++) {
            const scene = input.scenes[i];
            const panelNumber = (i + 1).toString().padStart(2, '0');

            // Add image
            if (scene.image) {
                const imageParts = scene.image.split(',');
                if (imageParts.length === 2) {
                    zip.file(`panel_${panelNumber}_image.png`, imageParts[1], { base64: true });
                }
            }

            // Add to full narrative text
            fullNarrative += `## Panel ${i + 1}\n\n${scene.narrative}\n\n`;
        }

        zip.file('story.md', fullNarrative);
        
        const zipData = await zip.generateAsync({ type: 'base64' });
        return { success: true, zipData };

    } catch (error) {
        console.error('Error packaging story:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while packaging the story.';
        return { success: false, error: errorMessage };
    }
}

export interface OptimizeStoryPromptInput {
  prompt: string;
  genre: string;
  style: string;
  panelCount: string | number;
  apiKey: string;
}

export async function optimizeStoryPromptAction(input: OptimizeStoryPromptInput): Promise<{success: boolean, optimizedPrompt?: string, error?: string}> {
    const { prompt, genre, style, panelCount, apiKey } = input;
    if (!apiKey) {
        return { success: false, error: 'API key is missing.' };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a creative assistant. Your task is to take a user's story idea and rewrite it to be more evocative and imaginative.
Incorporate the user's chosen genre.
You MUST return ONLY a valid JSON object matching this schema: { "optimizedPrompt": "string" }.`;

    let userPrompt = `Original story idea: "${prompt}"
Genre: ${genre}
Story Length: ${panelCount} panels.

Please optimize the original idea.`;

    const payload = {
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: [{
            parts: [{ text: userPrompt }]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                optimizedPrompt: {
                  type: "STRING"
                }
              },
              required: ["optimizedPrompt"]
            }
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Body:', errorText);
            try {
                const result = JSON.parse(errorText);
                const errorDetails = result?.error?.message || `HTTP error! status: ${response.status}`;
                throw new Error(errorDetails);
            } catch (e) {
                 throw new Error(errorText);
            }
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        const content = candidate?.content?.parts?.[0]?.text;

        if (content) {
            try {
                 const jsonResponse = JSON.parse(content);
                if (jsonResponse.optimizedPrompt) {
                     return { success: true, optimizedPrompt: jsonResponse.optimizedPrompt };
                }
            } catch (e) {
                throw new Error("API returned an invalid response format.");
            }
        }
       
        throw new Error("API returned an unexpected response format.");

    } catch (error) {
        console.error('Story prompt optimization error:', error);
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        if (errorMessage.toLowerCase().includes('safety policy')) {
            errorMessage = 'Your request was blocked by the safety filter. Please modify your prompt.';
        }
        return { success: false, error: errorMessage };
    }
}

export interface SurpriseMeInput {
  genre: string;
  style: string;
  panelCount: string | number;
  apiKey: string;
}

export async function surpriseMeAction(input: SurpriseMeInput): Promise<{success: boolean, surprisePrompt?: string, error?: string}> {
    const { genre, style, panelCount, apiKey } = input;
    if (!apiKey) {
        return { success: false, error: 'API key is missing.' };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `You are a creative muse. Your task is to generate a short, intriguing, and imaginative story concept.
The concept should be a single, compelling sentence.
Do not add any preamble, conversational text, or quotation marks. You are an API. You MUST return ONLY a valid JSON object matching this schema: { "surprisePrompt": "string" }. Do not include any other text, conversation, or markdown formatting.`;

    let userPrompt = `Generate a story concept based on these random parameters:
- Genre: ${genre}
- Artistic Style: ${style}
- Intended Story Length: ${panelCount} panels.

The concept should be a great starting point for a visual story of this length.`;

    const payload = {
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        contents: [{
            parts: [{ text: userPrompt }]
        }],
        generationConfig: {
            responseMimeType: "application/json",
             responseSchema: {
              type: "OBJECT",
              properties: {
                surprisePrompt: {
                  type: "STRING"
                }
              },
              required: ["surprisePrompt"]
            }
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Surprise Me API Error Body:', errorText);
            try {
                const result = JSON.parse(errorText);
                const errorDetails = result?.error?.message || `HTTP error! status: ${response.status}`;
                throw new Error(errorDetails);
            } catch (e) {
                throw new Error('The AI failed to generate a surprise idea.');
            }
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        const content = candidate?.content?.parts?.[0]?.text;

        if (content) {
            try {
                const jsonResponse = JSON.parse(content);
                if (jsonResponse.surprisePrompt) {
                     return { success: true, surprisePrompt: jsonResponse.surprisePrompt };
                }
            } catch(e) {
                throw new Error("Surprise Me API returned an unexpected response format.");
            }
        }
       
        throw new Error("Surprise Me API returned an unexpected response format.");

    } catch (error) {
        console.error('Surprise Me action error:', error);
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        if (errorMessage.toLowerCase().includes('safety policy')) {
            errorMessage = 'Your request was blocked by the safety filter. Please modify your prompt.';
        }
        return { success: false, error: errorMessage };
    }
}

// Adventurer Mode Actions

// --- Manually defined JSON Schemas to replace zod-to-json-schema ---
const CharacterSkillsJSONSchema = {
    type: "OBJECT",
    properties: {
        strength: { type: "NUMBER", description: "A measure of physical power. Affects melee combat and physical feats. Range 0-10." },
        agility: { type: "NUMBER", description: "A measure of nimbleness, reflexes, and stealth. Affects ranged combat and acrobatic feats. Range 0-10." },
        intelligence: { type: "NUMBER", description: "A measure of problem-solving, knowledge, and magic. Affects puzzles and spellcasting. Range 0-10." },
        charisma: { type: "NUMBER", description: "A measure of social skill and influence. Affects dialogue and persuasion. Range 0-10." },
        luck: { type: "NUMBER", description: "A measure of pure fortune and chance. Affects critical hits and random events. Range 0-10.'" }
    },
    required: ["strength", "agility", "intelligence", "charisma", "luck"]
};

const CharacterJSONSchema = {
    type: "OBJECT",
    properties: {
        name: { type: "STRING", description: "The character's name." },
        description: { type: "STRING", description: "A brief, evocative description of the character." },
        characterVisualDescription: { type: "STRING", description: "A detailed, reusable description of the character's physical appearance, clothing, and gear for visual consistency in generated images." },
        skills: CharacterSkillsJSONSchema,
        health: { type: "NUMBER", description: "The character's current health points." },
        maxHealth: { type: "NUMBER", description: "The character's maximum health points." },
    },
    required: ["name", "description", "characterVisualDescription", "skills", "health", "maxHealth"]
};

const InventoryItemJSONSchema = {
    type: "OBJECT",
    properties: {
        name: { type: "STRING", description: "The name of the item." },
        description: { type: "STRING", description: "A description of the item and its effects." },
        quantity: { type: "NUMBER", description: "How many of this item the character has." },
    },
    required: ["name", "description", "quantity"]
};

const SkillCheckJSONSchema = {
    type: "OBJECT",
    properties: {
        skill: { type: "STRING", enum: ['strength', 'agility', 'intelligence', 'charisma', 'luck'], description: "The skill being tested." },
        dc: { type: "NUMBER", description: "The Difficulty Class of the check. A higher number is harder. Sensible range for a 2d6+skill system is 8-18." },
    },
    required: ["skill", "dc"]
};

const ChoiceJSONSchema = {
    type: "OBJECT",
    properties: {
        text: { type: "STRING", description: "The text describing the user's choice." },
        skillCheck: { ...SkillCheckJSONSchema, description: "An optional skill check associated with this choice." },
    },
    required: ["text"]
};

const AdventureSceneJSONSchema = {
    type: "OBJECT",
    properties: {
        narrative: { type: "STRING", description: "The prose narrative for the current scene." },
        imagePrompt: { type: "STRING", description: "A detailed image prompt for this scene, EXCLUDING the character description." },
        choices: {
            type: "ARRAY",
            description: "An array of 2-3 choices for the user. Should be empty for a terminal scene.",
            items: ChoiceJSONSchema
        },
        isTerminal: { type: "BOOLEAN", description: "Signifies this is a terminal scene (victory or game over). No more choices will be presented." }
    },
    required: ["narrative", "imagePrompt", "choices"]
};

const areSkillsDefault = (skills: { strength: number, agility: number, intelligence: number, charisma: number, luck: number }) => {
  return (
    skills.strength === 3 &&
    skills.agility === 3 &&
    skills.intelligence === 3 &&
    skills.charisma === 3 &&
    skills.luck === 3
  );
};

export async function startAdventureAction(
  input: StartAdventureInput
): Promise<{ success: boolean; character?: Character; error?: string }> {
  try {
    const validatedInput = StartAdventureInputSchema.parse(input);
    const { apiKey, prompt, setting, skills } = validatedInput;

    if (!apiKey) {
      throw new Error('API key is missing.');
    }
    
    const useDefaultSkills = areSkillsDefault(skills);

    const skillInstruction = useDefaultSkills
      ? `You MUST generate the character's skills. You have exactly 15 points to distribute among Strength, Agility, Intelligence, Charisma, and Luck. No single skill can be higher than 10 or lower than 0. The distribution must be thematically appropriate for the character you create.`
      : `CRITICAL: The user has pre-defined the character's skills. The 'skills' object in your JSON response MUST BE an EXACT copy of the following, do NOT change any values: ${JSON.stringify(skills)}`;
    
    const healthInstruction = `Calculate starting health based on Strength. A Strength of 1-2 gives 5 HP. A Strength of 3-4 gives 10 HP. A Strength of 5-6 gives 15 HP. A Strength of 7-10 gives the maximum of 20 HP. Set both 'health' and 'maxHealth' to this calculated value.`;

    const systemPrompt = `You are an expert AI Character Smith for a 'choose your own adventure' game. Your task is to generate the character based on the user's input.

**Your Core Rules:**
1.  **Create a Character:** Based on the user's prompt and the setting, create a compelling character.
    *   **CRITICAL: You MUST generate a unique and creative name.** Be inventive. Do NOT use common fantasy names like "Elara", "Kael", "Lyra", "Ronan", "Seraphina", "Draven", or "Alistair". Do not use names you have generated recently.
    *   Assign a name and write a brief, evocative description.
    *   ${skillInstruction}
    *   ${healthInstruction}
    *   You MUST also create a detailed, reusable visual description of the character's physical appearance, clothing, and gear in a new field called 'characterVisualDescription'. This will be used to keep the character looking the same in all images.
2.  **Adhere to the Schema:** Your final output MUST be a single, valid JSON object that strictly follows the Character schema provided. Do not add any text before or after the JSON object.

**User's Request:**
*   **Initial Idea:** ${prompt || 'Generate a random character concept from scratch.'}
*   **Setting:** ${setting}

Generate the complete JSON for the character.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const apiSchema = JSON.parse(JSON.stringify(CharacterJSONSchema));
    delete apiSchema.properties.characterImageUrl;
        
    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: "Please proceed." }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: apiSchema,
          temperature: 1.2,
        }
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        let result;
        try { result = JSON.parse(errorText); } catch (e) { /* ignore */ }
        const errorDetails = result?.error?.message || `HTTP error! status: ${response.status}`;
        throw new Error(`The AI failed to generate the character. ${errorDetails}`);
    }

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
        throw new Error('The AI returned an empty response.');
    }

    let character: Character;
    try {
        const jsonResponse = JSON.parse(textContent);
        character = CharacterSchema.omit({characterImageUrl: true}).parse(jsonResponse);
    } catch (e) {
      console.error("Failed to parse or validate character:", e, "Received content:", textContent);
      let errorMessage = "The AI returned character data in an invalid format.";
      if (e instanceof ZodError) {
        const issues = e.issues.map(issue => `- Invalid value for '${issue.path.join('.')}': ${issue.message}`).join('\\n');
        errorMessage = `The AI's response had structural errors and could not be used.\n\nDetails:\n${issues}`;
      } else if (e instanceof SyntaxError) {
        errorMessage = `The AI returned malformed JSON, which could not be read.`;
      } else if (e instanceof Error) {
        errorMessage = e.message;
      }
      throw new Error(errorMessage);
    }
    
    return { success: true, character: character };
  } catch (error) {
    console.error('Error starting adventure:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An unknown error occurred while starting the adventure.';
    return { success: false, error: errorMessage };
  }
}


const AdventureOpeningJSONSchema = {
    type: "OBJECT",
    properties: {
        inventory: {
            type: "ARRAY",
            items: InventoryItemJSONSchema,
        },
        currentScene: AdventureSceneJSONSchema,
    },
    required: ["inventory", "currentScene"]
}

export async function generateAdventureOpeningAction(input: {
    character: Character;
    setting: string;
    adventureLength: string;
    apiKey: string;
}): Promise<{ success: boolean; opening?: AdventureOpening; error?: string }> {
    const { character, setting, adventureLength, apiKey } = input;
    if (!apiKey) {
      return { success: false, error: "API key is missing." };
    }
     // Create a sanitized version of the character state for the prompt to avoid token limit errors from the image URL.
    const characterForPrompt = { ...character };
    delete (characterForPrompt as any).characterImageUrl;

    const systemPrompt = `You are an expert AI Dungeon Master for a 'choose your own adventure' game. A character has been created. Your task is to generate their starting inventory and the opening scene.

**Your Core Rules:**
1.  **Create Starting Inventory:** Give the character 1-2 thematically appropriate starting items for the setting. The inventory can also be empty if it makes sense.
2.  **Write the First Scene:**
    *   Write a compelling opening narrative that introduces the character and their situation.
    *   **CRITICAL RULE FOR \`imagePrompt\`**: The \`imagePrompt\` field MUST be a pure, factual description of the scene's content (character's actions, environment, objects). It MUST NOT contain any artistic style keywords (e.g., "illustration", "painting", "photograph", "cinematic"). The visual style is handled separately and MUST NOT be included in your generated \`imagePrompt\`.
3.  **Provide Choices:**
    *   Offer 2-3 distinct choices for the user to make.
    *   At least one choice should involve a skill check. Define the skill to be tested (e.g., 'agility') and a Difficulty Class (DC) between 8 and 18.
4.  **Adhere to the Schema:** Your final output MUST be a single, valid JSON object that strictly follows the provided schema.

**Character to use:** ${JSON.stringify(characterForPrompt)}
**Setting:** ${setting}
**Adventure Length:** ${adventureLength}

Generate the JSON for the inventory and the first scene.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: "Please proceed." }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: AdventureOpeningJSONSchema,
          temperature: 1.0,
        }
    };

    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorText = await response.text();
            const errorDetails = JSON.parse(errorText)?.error?.message || `HTTP error! status: ${response.status}`;
            throw new Error(`The AI failed to generate the opening scene. ${errorDetails}`);
        }
        const result = await response.json();
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) throw new Error('AI returned an empty response for the opening scene.');
        
        const opening = AdventureOpeningSchema.parse(JSON.parse(content));
        return { success: true, opening };

    } catch(error) {
        console.error("Error generating adventure opening:", error);
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof ZodError) {
          const issues = error.issues.map(issue => `- Invalid value for '${issue.path.join('.')}': ${issue.message}`).join('\\n');
          errorMessage = `The AI's response had structural errors and could not be used.\n\nDetails:\n${issues}`;
        } else if (error instanceof SyntaxError) {
          errorMessage = `The AI returned malformed JSON, which could not be read.`;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}


export async function progressAdventureAction(
  input: ProgressAdventureInput
): Promise<{ success: boolean; state?: AdventureState; error?: string }> {
  try {
    const { adventureState, choice, visualStyle, apiKey } = ProgressAdventureInputSchema.parse(input);

     if (!apiKey) {
      throw new Error('API key is missing.');
    }
    
    // Create a sanitized version of the character state for the prompt to avoid token limit errors from the image URL.
    const characterForPrompt = { ...adventureState.character };
    delete (characterForPrompt as any).characterImageUrl;
    
    // Create a context summary of the last few scenes to prevent token limits
    const storySoFar = [...adventureState.sceneHistory.map(s => s.narrative), adventureState.currentScene.narrative]
      .slice(-3) // Get the last 3 entries for context
      .map((entry, index, arr) => `PREVIOUS SCENE ${arr.length - index}:\n${entry}`)
      .join('\n\n');

    // Create a schema for the AI's response that doesn't include the adventureLog or the character's visual description
    const AdventureStateForAIResponseSchema = {
      type: "OBJECT",
      properties: {
        character: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            description: { type: "STRING" },
            skills: CharacterSkillsJSONSchema,
            health: { type: "NUMBER" },
            maxHealth: { type: "NUMBER" },
          },
          required: ["name", "description", "skills", "health", "maxHealth"]
        },
        inventory: { type: "ARRAY", items: InventoryItemJSONSchema },
        currentScene: AdventureSceneJSONSchema
      },
      required: ["character", "inventory", "currentScene"]
    };

    const systemPrompt = `You are an expert AI Dungeon Master continuing a 'choose your own adventure' game. Your task is to process the player's last choice and generate the next complete scene state.

**Your Core Rules:**
1.  **Process the Choice**:
    *   The player has made the following choice: "${choice.text}".
    *   If this is a custom action written by the player, interpret it creatively and determine the outcome.

2.  **Handle End States (CRITICAL)**:
    *   **Game Over**: If the character's health is at or below 0, you MUST generate a final "game over" scene. The narrative must describe their defeat. You MUST set \`isTerminal: true\` and provide an empty \`choices\` array.
    *   **Victory/Conclusion**: If the story reaches a natural conclusion, you MUST generate a final, satisfying scene. You MUST set \`isTerminal: true\` and provide an empty \`choices\` array.
    *   **Image Prompt for End State**: If the scene is terminal (victory or defeat), the \`imagePrompt\` you generate MUST be a powerful, thematic image summarizing the outcome. For example, for a defeat: 'A lone sword lies abandoned on a desolate battlefield at sunset'. For a victory: 'The hero stands triumphant on a mountaintop, overlooking the kingdom they saved'.

3.  **Skill Checks, Combat, and Inventory**:
    *   **Skill Checks & Dice Logic (MANDATORY)**: All skill checks are resolved using a **2d6 system**. You MUST narrate the outcome by simulating a **roll of two six-sided dice (2d6, total range 2-12)** and adding the character's relevant skill score. **The narration of the dice roll (e.g., "Rolling for Agility... you get a 9 on 2d6!") and its outcome MUST be part of the 'narrative' field.** If the total (roll + skill) is less than the DC, the check **fails**. The narrative MUST describe the negative consequences of this failure. If the total is equal to or greater than the DC, the check **succeeds**.
    *   **Combat & Damage Logic**: When combat occurs, you are the arbiter of damage.
        -   First, narrate the attack against the player.
        -   Then, determine the damage based on the narrative severity. Use the following tiers as a strict guideline: Minor (1-2 HP), Moderate (3-5 HP), Serious (6-8 HP), Lethal (9+ HP).
        -   You MUST update the character's 'health' value in the JSON response to reflect the damage taken.
        -   Immediately after dealing damage, you MUST check if the character's health is 0 or less and trigger the "Game Over" end state if it is.
    *   **Inventory**: If the player finds an item, you MUST add it to the \`inventory\` array. If they use an item, you MUST remove it or decrease its quantity. Sometimes, you should present a new choice that involves using an item from the inventory.

4.  **Update State & Consistency**: Based on the outcome, you MUST update the character's state (health, inventory). Character consistency (personality) is paramount. The \`characterVisualDescription\` will be handled by the application, so you do not need to include it in your response.

5.  **Write the Next Scene**: If the scene is not terminal, write a new narrative and provide 2-3 new choices. The new \`imagePrompt\` for the scene must follow the critical rule below.

6.  **Adhere to the Schema (MANDATORY)**: Your final output MUST be a single, valid JSON object that strictly follows the provided schema. Do not add any text or markdown formatting before or after the JSON. Pay close attention to data types: numbers must be numbers, strings must be strings, and arrays of objects must follow their structure.

7.  **CRITICAL RULE FOR \`imagePrompt\`**: The \`imagePrompt\` field MUST be a pure, factual description of the scene's content (characters' actions, environment, objects). It MUST NOT contain any artistic style keywords (e.g., "illustration", "painting", "photograph", "cinematic", "unreal engine").

**Game Context:**
*   **Current Character State**: ${JSON.stringify({ character: characterForPrompt, inventory: adventureState.inventory })}
*   **Story So Far**:
${storySoFar}

Generate the complete JSON for the next scene.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          parts: [{ text: 'Please proceed.' }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: AdventureStateForAIResponseSchema,
        temperature: 1.0,
      },
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let result;
      try {
        result = JSON.parse(errorText);
      } catch (e) {
        /* ignore */
      }
      const errorDetails =
        result?.error?.message || `HTTP error! status: ${response.status}`;
      throw new Error(`The AI failed to progress the adventure. ${errorDetails}`);
    }

    const result = await response.json();
    const textContent = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      // If the response was a 200 but the content is empty, it could be a safety block
      const fullResponse = JSON.stringify(result, null, 2);
      if (fullResponse.includes('block_reason')) {
        throw new Error('The response was blocked by a safety filter. Please try a different action.');
      }
      throw new Error('The AI returned an empty response.');
    }

    let nextAdventureState: AdventureState;
    try {
      const aiResponseState = JSON.parse(textContent);

      // Re-integrate the preserved visual description and image URL.
      const newCharacterState = {
        ...adventureState.character, // Start with the old character state to preserve URL
        ...aiResponseState.character, // Overwrite with new stats from AI
      };
      
      nextAdventureState = {
        ...aiResponseState,
        character: newCharacterState,
        sceneHistory: [...adventureState.sceneHistory, adventureState.currentScene],
      };
      
      // Final validation with the full schema
      AdventureStateSchema.parse(nextAdventureState);

    } catch (e) {
      console.error(
        'Failed to parse or validate next adventure state:',
        e,
        'Received content:',
        textContent
      );
      let errorMessage = "The AI returned an invalid response. This can happen with complex story events. Please try making a different choice.";
      if (e instanceof ZodError) {
        const issues = e.issues.map(issue => `- Invalid value for '${issue.path.join('.')}': ${issue.message}`).join('\\n');
        errorMessage = `The AI's response had structural errors and could not be used. Please try a different choice.\n\nDetails:\n${issues}`;
      } else if (e instanceof SyntaxError) {
        errorMessage = `The AI returned malformed JSON, which could not be read. Please try a different choice.`;
      } else if (e instanceof Error) {
        errorMessage = e.message;
      }
      throw new Error(errorMessage);
    }

    return { success: true, state: nextAdventureState };
  } catch (error) {
    console.error('Error progressing adventure:', error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'An unknown error occurred while progressing the adventure.';
    return { success: false, error: errorMessage };
  }
}

const GeneratedCharacterJSONSchema = {
    type: "OBJECT",
    properties: {
        name: { type: "STRING" },
        description: { type: "STRING" },
        skills: CharacterSkillsJSONSchema,
    },
    required: ["name", "description", "skills"]
};

export async function generateCharacterIdeaAction(
    input: { prompt?: string, apiKey: string }
): Promise<{ success: boolean; character?: GeneratedCharacter; error?: string }> {
    const { prompt, apiKey } = input;
    if (!apiKey) return { success: false, error: 'API key is missing.' };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const systemPrompt = `You are an AI Character Smith for a 'choose your own adventure' game. Your task is to generate a character concept including a name, a short, evocative description, and their starting skills.

**Your Core Rules:**
1.  **Character Concept**: If the user provides an idea, use it as the foundation. If not, invent a compelling character from scratch. **CRITICAL: You must generate a unique and creative name and concept.** Do NOT use common fantasy names like "Elara", "Kael", "Lyra", "Ronan", "Seraphina", "Draven", or "Alistair". Do not use names you have generated recently.
2.  **Assign Skills**: You have exactly 15 points to distribute among Strength, Agility, Intelligence, Charisma, and Luck. No single skill can be higher than 10 or lower than 0. The distribution must be thematically appropriate for the character.
3.  **JSON Output**: Your response MUST be a single, valid JSON object that strictly follows this schema: { "name": "string", "description": "string", "skills": { "strength": number, "agility": number, "intelligence": number, "charisma": number, "luck": number } }.`;

    const userMessage = prompt ? `Use this idea as inspiration: "${prompt}"` : "Generate a random character concept.";
    
    const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: GeneratedCharacterJSONSchema,
            temperature: 1.2
        }
    };

    try {
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const errorText = await response.text();
            const errorDetails = JSON.parse(errorText)?.error?.message || errorText;
            throw new Error(errorDetails);
        }
        const result = await response.json();
        const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) throw new Error('AI returned an empty response.');

        const character = GeneratedCharacterSchema.parse(JSON.parse(content));
        return { success: true, character };

    } catch (error) {
        console.error('Generate Character Idea Action Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: errorMessage };
    }
}


const adventurerSettings = ['Fantasy', 'Sci-Fi', 'Horror', 'Cyberpunk', 'Medieval', 'Noir', 'Western', 'Post-Apocalyptic', 'Steampunk'];
const adventureLengths = ['skirmish', 'adventure', 'campaign', 'odyssey'];
const adventurerStyles = ['illustrated', 'cinematic'];

export async function buildRandomAdventureAction(
    input: { apiKey: string, setting: string }
): Promise<{ success: boolean; setup?: AdventureSetup; error?: string }> {
     const { apiKey, setting } = input;
    if (!apiKey) return { success: false, error: 'API key is missing.' };

    const storySeeds = [
        `about a forgotten tomb in a ${setting} world`,
        `involving a mysterious ${setting} artifact`,
        `about a city of thieves in a ${setting} setting`,
        `on a quest for revenge in a ${setting} landscape`,
        `in a ${setting} world where technology is forbidden`,
        `about a rebellion against a galactic ${setting} tyrant`,
        `involving a journey to a lost ${setting} land`,
        `about a detective solving a bizarre crime in a ${setting} city`
    ];

    const randomLength = adventureLengths[Math.floor(Math.random() * adventureLengths.length)];
    const randomStyle = adventurerStyles[Math.floor(Math.random() * adventurerStyles.length)];
    const randomSeed = storySeeds[Math.floor(Math.random() * storySeeds.length)];

    try {
        const characterPrompt = `A compelling and unique character concept for a ${setting} adventure ${randomSeed}.`;

        const characterResult = await generateCharacterIdeaAction({ 
            apiKey,
            prompt: characterPrompt,
        });
        if (!characterResult.success || !characterResult.character) {
            throw new Error(characterResult.error || 'Failed to generate character for the adventure.');
        }

        const setup: AdventureSetup = {
            character: characterResult.character,
            setting: setting,
            adventureLength: randomLength,
            visualStyle: randomStyle,
        };

        return { success: true, setup };

    } catch (error) {
        console.error('Build Random Adventure Action Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, error: errorMessage };
    }
}

export async function generateAdventureSceneImageAction(
  input: GenerateAdventureSceneImageInput
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const validatedInput = GenerateAdventureSceneImageInputSchema.parse(input);
    const { characterVisualDescription, imagePrompt, visualStylePrompt, apiKey, model } = validatedInput;

    const fullPrompt = `${characterVisualDescription}, ${imagePrompt}, ${visualStylePrompt}`;

    const result = await generateImageAction({
      prompt: fullPrompt,
      apiKey,
      numImages: 1,
      aspectRatio: '16:9',
      model: model,
    });

    if (result.success && result.images && result.images.length > 0) {
      return { success: true, imageUrl: result.images[0].url };
    } else {
      throw new Error(result.error || 'Failed to generate image for the scene.');
    }
  } catch (error) {
    console.error('Error in generateAdventureSceneImageAction:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: errorMessage };
  }
}

// New Chat Action
export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: ({ text: string } | { image: string })[];
}

export interface ChatImageActionInput {
    history: ChatHistoryItem[];
    apiKey: string;
}

export async function chatImageAction(
  input: ChatImageActionInput
): Promise<{ success: boolean; reply?: ChatHistoryItem; error?: string }> {
  const { history, apiKey } = input;
  if (!apiKey) {
    return { success: false, error: 'API key is missing.' };
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;
  
  const transformedHistory = history.map((message) => {
    const messageParts = message.parts.map(part => {
        if ('image' in part) {
            const { mimeType, base64Data } = parseDataUri(part.image);
            return { inline_data: { mime_type: mimeType, data: base64Data }};
        }
        return part;
    });
    
    return {
      role: message.role,
      parts: messageParts
    };
  });
  
  const payload = {
    contents: transformedHistory,
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const result = await response.json();
        const errorDetails = result?.error?.message || `HTTP error! status: ${response.status}`;
        throw new Error(`Chat failed. ${errorDetails}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];
    const responseParts = candidate?.content?.parts;

    if (!responseParts || responseParts.length === 0) {
        if (candidate?.finishReason === 'SAFETY') {
            const safetyRatings = candidate.safetyRatings;
            const blockedCategories = safetyRatings?.filter((r: any) => r.blocked).map((r: any) => r.category).join(', ') || 'unspecified reasons';
            return { success: false, error: `The chat response was blocked for safety reasons: ${blockedCategories}.`};
        }
        const simplifiedResponse = JSON.stringify(result, (key, value) => (key === 'bytesBase64Encoded' || key === 'base64Data') ? '...<omitted>...' : value, 2);
        return { success: false, error: `The AI returned an empty or unexpected response. Raw response: ${simplifiedResponse}` };
    }
    
    const reply: ChatHistoryItem = {
        role: 'model',
        parts: responseParts.map((part: any) => {
            if (part.media?.url) {
                return { image: part.media.url };
            }
            if (part.text || part.text === "") { // Also handle empty text parts
                return { text: part.text };
            }
            return null; // Ignore parts that are neither text nor media
        }).filter((p: any) => p !== null), // Filter out any empty parts
    };
    
    // Ensure there's at least one part to the reply
    if (reply.parts.length === 0) {
        return { success: false, error: "The AI's reply was empty." };
    }

    return { success: true, reply };

  } catch (error) {
    console.error('Chat action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during the chat.';
    return { success: false, error: errorMessage };
  }
}
