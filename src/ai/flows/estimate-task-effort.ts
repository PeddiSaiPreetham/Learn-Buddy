// estimate-task-effort.ts
'use server';

/**
 * @fileOverview Estimates the effort required for a task using story points.
 *
 * - estimateTaskEffort - A function that estimates the effort for a task.
 * - EstimateTaskEffortInput - The input type for the estimateTaskEffort function.
 * - EstimateTaskEffortOutput - The return type for the estimateTaskEffort function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateTaskEffortInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The detailed description of the task for which effort needs to be estimated.'),
});
export type EstimateTaskEffortInput = z.infer<typeof EstimateTaskEffortInputSchema>;

const EstimateTaskEffortOutputSchema = z.object({
  storyPoints: z
    .number()
    .describe('The estimated effort in story points for the given task. Must be a positive number.'),
  justification: z
    .string()
    .describe('Explanation of why the story points were assigned to the task.'),
});
export type EstimateTaskEffortOutput = z.infer<typeof EstimateTaskEffortOutputSchema>;

export async function estimateTaskEffort(input: EstimateTaskEffortInput): Promise<EstimateTaskEffortOutput> {
  return estimateTaskEffortFlow(input);
}

const estimateTaskEffortPrompt = ai.definePrompt({
  name: 'estimateTaskEffortPrompt',
  input: {schema: EstimateTaskEffortInputSchema},
  output: {schema: EstimateTaskEffortOutputSchema},
  prompt: `You are a seasoned project manager skilled at estimating task efforts using story points.

  Based on the task description provided, determine the appropriate number of story points.
  Also, explain the reason for assigning the story points to the task.

  Task Description: {{{taskDescription}}}
  `,
});

const estimateTaskEffortFlow = ai.defineFlow(
  {
    name: 'estimateTaskEffortFlow',
    inputSchema: EstimateTaskEffortInputSchema,
    outputSchema: EstimateTaskEffortOutputSchema,
  },
  async input => {
    const {output} = await estimateTaskEffortPrompt(input);
    return output!;
  }
);
