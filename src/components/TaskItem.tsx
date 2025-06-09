"use client";

import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Trash2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { estimateTaskEffort } from '@/ai/flows/estimate-task-effort';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onUpdateStoryPoints: (id: string, points: number) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskItem({ task, onToggleComplete, onUpdateStoryPoints, onDeleteTask }: TaskItemProps) {
  const [localStoryPoints, setLocalStoryPoints] = useState<string>(task.storyPoints.toString());
  const [isEstimating, setIsEstimating] = useState(false);
  const { toast } = useToast();
  const [isNewTask, setIsNewTask] = useState(task.isNew);

  useEffect(() => {
    if (task.isNew) {
      const timer = setTimeout(() => {
        setIsNewTask(false);
      }, 500); // Duration of animation + a buffer
      return () => clearTimeout(timer);
    }
  }, [task.isNew]);

  useEffect(() => {
    setLocalStoryPoints(task.storyPoints.toString());
  }, [task.storyPoints]);

  const handleStoryPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalStoryPoints(e.target.value);
  };

  const handleStoryPointsBlur = () => {
    const points = parseInt(localStoryPoints, 10);
    if (!isNaN(points) && points >= 0) {
      onUpdateStoryPoints(task.id, points);
    } else {
      // Reset to original if input is invalid
      setLocalStoryPoints(task.storyPoints.toString());
    }
  };
  
  const handleEstimateEffort = async () => {
    setIsEstimating(true);
    try {
      const result = await estimateTaskEffort({ taskDescription: task.description });
      onUpdateStoryPoints(task.id, result.storyPoints);
      setLocalStoryPoints(result.storyPoints.toString());
      toast({
        title: "Effort Estimated",
        description: `AI suggested ${result.storyPoints} story points. Justification: ${result.justification}`,
      });
    } catch (error) {
      console.error("Failed to estimate effort:", error);
      toast({
        title: "Error",
        description: "Failed to estimate effort. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEstimating(false);
    }
  };

  return (
    <Card className={cn(
      "mb-3 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg",
      task.completed ? "bg-muted/50" : "bg-card",
      isNewTask ? "animate-fadeIn" : ""
    )}>
      <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
        <Checkbox
          id={`task-${task.id}`}
          checked={task.completed}
          onCheckedChange={() => onToggleComplete(task.id)}
          className="h-6 w-6 rounded"
          aria-label={`Mark task ${task.description} as ${task.completed ? 'incomplete' : 'complete'}`}
        />
        <label
          htmlFor={`task-${task.id}`}
          className={cn(
            "flex-grow text-base cursor-pointer",
            task.completed ? "line-through text-muted-foreground" : "text-foreground"
          )}
        >
          {task.description}
        </label>
        <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
          <Input
            type="number"
            min="0"
            value={localStoryPoints}
            onChange={handleStoryPointsChange}
            onBlur={handleStoryPointsBlur}
            className="w-20 h-9 text-sm text-center"
            aria-label="Story points"
            disabled={isEstimating}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleEstimateEffort}
            disabled={isEstimating}
            className="h-9 w-9"
            aria-label="Estimate effort using AI"
          >
            {isEstimating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4 text-accent" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDeleteTask(task.id)}
            className="h-9 w-9 text-destructive hover:bg-destructive/10"
            aria-label="Delete task"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
