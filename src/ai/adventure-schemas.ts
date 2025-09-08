
import {z} from 'genkit';

// / \*\* CORE ADVENTURE STATE SCHEMAS \*\*\* /

export const CharacterSkillsSchema = z.object({
  strength: z
    .number()
    .min(0).max(10)
    .describe(
      'A measure of physical power. Affects melee combat and physical feats. Range 0-10.'
    ),
  agility: z
    .number()
    .min(0).max(10)
    .describe(
      'A measure of nimbleness, reflexes, and stealth. Affects ranged combat and acrobatic feats. Range 0-10.'
    ),
  intelligence: z
    .number()
    .min(0).max(10)
    .describe(
      'A measure of problem-solving, knowledge, and magic. Affects puzzles and spellcasting. Range 0-10.'
    ),
  charisma: z
    .number()
    .min(0).max(10)
    .describe(
      'A measure of social skill and influence. Affects dialogue and persuasion. Range 0-10.'
    ),
  luck: z
    .number()
    .min(0).max(10)
    .describe(
      "A measure of pure fortune and chance. Affects critical hits and random events. Range 0-10.'"
    ),
});

export const CharacterSchema = z.object({
  name: z.string().describe("The character's name."),
  description: z
    .string()
    .describe('A brief, evocative description of the character.'),
  characterVisualDescription: z.string().describe("A detailed, reusable description of the character's physical appearance, clothing, and gear for visual consistency in generated images."),
  skills: CharacterSkillsSchema,
  health: z.number().describe("The character's current health points."),
  maxHealth: z.number().describe("The character's maximum health points."),
  characterImageUrl: z.string().url().optional().describe("The URL for the character's portrait image.")
});

export const InventoryItemSchema = z.object({
  name: z.string().describe('The name of the item.'),
  description: z.string().describe('A description of the item and its effects.'),
  quantity: z.number().describe('How many of this item the character has.'),
});

export const SkillCheckSchema = z.object({
  skill: z
    .enum(['strength', 'agility', 'intelligence', 'charisma', 'luck'])
    .describe('The skill being tested.'),
  dc: z
    .number()
    .describe(
      'The Difficulty Class of the check. A higher number is harder. Sensible range for a 2d6+skill system is 8-18.'
    ),
});

export const ChoiceSchema = z.object({
  text: z.string().describe("The text describing the user's choice."),
  skillCheck: SkillCheckSchema.optional().describe(
    'An optional skill check associated with this choice.'
  ),
});

export const SceneSchema = z.object({
  narrative: z.string().describe('The prose narrative for the current scene.'),
  imagePrompt: z
    .string()
    .describe(
      'A detailed image prompt for this scene, EXCLUDING the character description.'
    ),
  imageUrl: z
    .string()
    .optional()
    .describe('The URL of the generated image for this scene.'),
  choices: z
    .array(ChoiceSchema)
    .describe('An array of 2-3 choices for the user. Should be empty for a terminal scene.'),
  isTerminal: z.boolean().optional().describe('Signifies this is a terminal scene (victory or game over). No more choices will be presented.'),
  isGeneratingImage: z.boolean().optional().describe('A client-side flag to indicate image generation is in progress for this scene.')
});

export const AdventureStateSchema = z.object({
  character: CharacterSchema,
  inventory: z.array(InventoryItemSchema),
  currentScene: SceneSchema,
  sceneHistory: z
    .array(SceneSchema)
    .describe('A log of past scenes in the adventure.'),
});

// / \*\* ACTION-RELATED SCHEMAS \*\*\* /

export const SceneOutputSchema = z.object({
  narrative: z
    .string()
    .describe(
      'The narrative text for this single scene, written as pure, descriptive prose like in a novel. It must not contain any speaker tags or script formatting.'
    ),
  imagePrompt: z
    .string()
    .describe(
      'A highly detailed and vivid image prompt for an AI image generator (like Imagen 4) that visually represents this scene. Ensure consistent character and environment descriptions across scenes.'
    ),
});

export const GenerateStorySceneInputSchema = z.object({
  prompt: z.string(),
  genre: z.string(),
  style: z.string(),
  panelNumber: z.number(),
  totalPanels: z.number(),
  previousSceneNarrative: z.string().optional(),
  apiKey: z.string(),
});

export const StartAdventureInputSchema = z.object({
  prompt: z.string(),
  setting: z.string(),
  apiKey: z.string(),
  skills: CharacterSkillsSchema,
});

export const ProgressAdventureInputSchema = z.object({
  adventureState: AdventureStateSchema,
  choice: ChoiceSchema,
  visualStyle: z.string(),
  apiKey: z.string(),
});

export const GenerateAdventureSceneImageInputSchema = z.object({
  characterVisualDescription: z.string(),
  imagePrompt: z.string(),
  visualStylePrompt: z.string(),
  apiKey: z.string(),
  model: z.string(),
});

export const AdventureOpeningSchema = z.object({
  inventory: z.array(InventoryItemSchema),
  currentScene: SceneSchema,
});

export const GeneratedCharacterSchema = z.object({
    name: z.string(),
    description: z.string(),
    skills: CharacterSkillsSchema,
});

export const AdventureSetupSchema = z.object({
    character: GeneratedCharacterSchema,
    setting: z.string(),
    adventureLength: z.string(),
    visualStyle: z.string(),
});


// / \*\* TYPES \*\*\* /

export type Character = z.infer<typeof CharacterSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Choice = z.infer<typeof ChoiceSchema>;
export type SkillCheck = z.infer<typeof SkillCheckSchema>;
export type AdventureState = z.infer<typeof AdventureStateSchema>;

// Action-related types
export type SceneOutput = z.infer<typeof SceneOutputSchema>;
export type GenerateStorySceneInput = z.infer<typeof GenerateStorySceneInputSchema>;
export type StartAdventureInput = z.infer<typeof StartAdventureInputSchema>;
export type ProgressAdventureInput = z.infer<typeof ProgressAdventureInputSchema>;
export type GenerateAdventureSceneImageInput = z.infer<typeof GenerateAdventureSceneImageInputSchema>;
export type AdventureOpening = z.infer<typeof AdventureOpeningSchema>;
export type GeneratedCharacter = z.infer<typeof GeneratedCharacterSchema>;
export type AdventureSetup = z.infer<typeof AdventureSetupSchema>;
