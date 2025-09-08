'use server';
/**
 * @fileOverview An AI flow to describe a sketch for image generation.
 *
 * - describeImage - A function that interprets a sketch and returns a text description.
 * - DescribeImageInput - The input type for the describeImage function.
 * - DescribeImageOutput - The return type for the describeImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DescribeImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A sketch image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  apiKey: z.string().describe('The Google AI API key.'),
});
export type DescribeImageInput = z.infer<typeof DescribeImageInputSchema>;

const DescribeImageOutputSchema = z.object({
  description: z.string().describe('A textual description of the sketch.'),
});
export type DescribeImageOutput = z.infer<typeof DescribeImageOutputSchema>;

// Helper function to parse data URI
function parseDataURI(dataURI: string) {
    const match = dataURI.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error('Invalid data URI format');
    }
    return { mimeType: match[1], base64Data: match[2] };
}

export async function describeImage(
  input: DescribeImageInput
): Promise<DescribeImageOutput> {
  return describeImageFlow(input);
}

const describeImageFlow = ai.defineFlow(
  {
    name: 'describeImageFlow',
    inputSchema: DescribeImageInputSchema,
    outputSchema: DescribeImageOutputSchema,
  },
  async (input) => {
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
    
    const { mimeType, base64Data } = parseDataURI(input.imageDataUri);

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

    const result = await response.json();

    if (!response.ok) {
        console.error("Describe Image API Error Body:", result);
        const errorDetails = result?.error?.message || `HTTP error! status: ${response.status}`;
        throw new Error(`The AI failed to describe the image. ${errorDetails}`);
    }

    const candidate = result.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text;

    if (content) {
        try {
            const jsonResponse = JSON.parse(content);
            if (jsonResponse.description) {
                return { description: jsonResponse.description };
            }
        } catch (e) {
             throw new Error('The AI returned an invalid response format.');
        }
    }

    throw new Error('The AI failed to describe the image or returned an unexpected format.');
  }
);
