
'use server';
/**
 * @fileOverview A flow for generating audio from text, with support for multiple speakers.
 * This file is currently not in use and is kept for future reference.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const GenerateAudioInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech. Can include speaker tags like "Speaker1:".'),
  voiceIds: z.array(z.string()).describe('An array of selected voice model IDs.'),
  apiKey: z.string().describe('The Google AI API key.'),
});
export type GenerateAudioInput = z.infer<typeof GenerateAudioInputSchema>;

const GenerateAudioOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a data URI.'),
});
export type GenerateAudioOutput = z.infer<typeof GenerateAudioOutputSchema>;

export async function generateAudio(
  input: GenerateAudioInput
): Promise<GenerateAudioOutput> {
  // This flow is currently disabled.
  throw new Error("Audio generation is temporarily disabled.");
}
