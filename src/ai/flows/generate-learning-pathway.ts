
'use server';
/**
 * @fileOverview Generates a structured learning pathway for a given topic.
 *
 * - generateLearningPathway - A function that creates a learning plan with tasks and subtasks.
 * - GenerateLearningPathwayInput - The input type for the generateLearningPathway function.
 * - GenerateLearningPathwayOutput - The return type for the generateLearningPathway function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLearningPathwayInputSchema = z.object({
  learningGoal: z
    .string()
    .describe('The topic or skill the user wants to learn (e.g., "learn Next.js", "understand quantum physics").'),
});
export type GenerateLearningPathwayInput = z.infer<typeof GenerateLearningPathwayInputSchema>;

const LearningStepSchema = z.object({
  taskDescription: z
    .string()
    .describe('A specific, actionable learning task or step in the pathway.'),
  subtasks: z
    .array(z.string())
    .optional()
    .describe('An optional list of smaller, actionable sub-steps or sub-topics for this main task.'),
});

const GenerateLearningPathwayOutputSchema = z.object({
  pathwayTitle: z
    .string()
    .describe("A concise and descriptive title for the generated learning pathway (e.g., 'Mastering Next.js Fundamentals')."),
  steps: z
    .array(LearningStepSchema)
    .describe('An ordered array of learning steps. Each step includes a main task description and an optional list of subtask descriptions.'),
});
export type GenerateLearningPathwayOutput = z.infer<typeof GenerateLearningPathwayOutputSchema>;

export async function generateLearningPathway(input: GenerateLearningPathwayInput): Promise<GenerateLearningPathwayOutput> {
  return generateLearningPathwayFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateLearningPathwayPrompt',
  input: {schema: GenerateLearningPathwayInputSchema},
  output: {schema: GenerateLearningPathwayOutputSchema},
  prompt: `You are an expert curriculum designer and learning strategist.
The user wants to learn about: {{{learningGoal}}}.

Please generate a structured learning pathway to help them achieve this goal.
The pathway should consist of a series of actionable tasks.
For complex tasks, break them down into smaller, manageable subtasks.
Ensure the output strictly adheres to the provided output schema, including a 'pathwayTitle' and an array of 'steps', where each step has a 'taskDescription' and an optional 'subtasks' array of strings.

User's Learning Goal: {{{learningGoal}}}
`,
});

const generateLearningPathwayFlow = ai.defineFlow(
  {
    name: 'generateLearningPathwayFlow',
    inputSchema: GenerateLearningPathwayInputSchema,
    outputSchema: GenerateLearningPathwayOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate learning pathway. The AI model did not return a valid output.');
    }
    return output;
  }
);
