
"use client";

import type { Task, SubTask } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Brain, Trash2, Loader2, PlusCircle, CornerDownRight } from 'lucide-react';
import { useState, useEffect, type FormEvent } from 'react';
import { estimateTaskEffort } from '@/ai/flows/estimate-task-effort';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onUpdateStoryPoints: (id: string, points: number) => void;
  onDeleteTask: (id: string) => void;
  onAddSubTask: (parentId: string, description: string) => void;
  onToggleSubTaskComplete: (parentId: string, subTaskId: string) => void;
  onDeleteSubTask: (parentId: string, subTaskId: string) => void;
}

export function TaskItem({ 
  task, 
  onToggleComplete, 
  onUpdateStoryPoints, 
  onDeleteTask,
  onAddSubTask,
  onToggleSubTaskComplete,
  onDeleteSubTask,
}: TaskItemProps) {
  const [localStoryPoints, setLocalStoryPoints] = useState<string>(task.storyPoints.toString());
  const [isEstimating, setIsEstimating] = useState(false);
  const [newSubTaskDescription, setNewSubTaskDescription] = useState('');
  const { toast } = useToast();
  const [isNewTask, setIsNewTask] = useState(task.isNew);

  useEffect(() => {
    if (task.isNew) {
      const timer = setTimeout(() => {
        setIsNewTask(false);
      }, 500); 
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

  const handleAddSubTask = (e: FormEvent) => {
    e.preventDefault();
    if (newSubTaskDescription.trim()) {
      onAddSubTask(task.id, newSubTaskDescription.trim());
      setNewSubTaskDescription('');
    }
  };

  return (
    <Card className={cn(
      "mb-3 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg",
      task.completed ? "bg-muted/50" : "bg-card",
      isNewTask ? "animate-fadeIn" : ""
    )}>
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Checkbox
            id={`task-${task.id}`}
            checked={task.completed}
            onCheckedChange={() => onToggleComplete(task.id)}
            className="h-6 w-6 rounded mt-1 sm:mt-0"
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
          <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-auto sm:ml-0 flex-shrink-0">
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
        </div>
        
        { (task.subtasks && task.subtasks.length > 0) && (
          <>
            <Separator className="my-2" />
            <div className="pl-6 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center">
                <CornerDownRight className="h-4 w-4 mr-2" />
                Subtasks
              </h4>
              {task.subtasks.map(subtask => (
                <div key={subtask.id} className="flex items-center gap-2 group">
                  <Checkbox
                    id={`subtask-${subtask.id}`}
                    checked={subtask.completed}
                    onCheckedChange={() => onToggleSubTaskComplete(task.id, subtask.id)}
                    className="h-5 w-5 rounded"
                    aria-label={`Mark subtask ${subtask.description} as ${subtask.completed ? 'incomplete' : 'complete'}`}
                  />
                  <label
                    htmlFor={`subtask-${subtask.id}`}
                    className={cn(
                      "flex-grow text-sm",
                      subtask.completed ? "line-through text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {subtask.description}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteSubTask(task.id, subtask.id)}
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 opacity-50 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete subtask"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
        
        <form onSubmit={handleAddSubTask} className="flex gap-2 pl-6 items-center mt-2">
          <Input
            type="text"
            placeholder="Add a new subtask..."
            value={newSubTaskDescription}
            onChange={(e) => setNewSubTaskDescription(e.target.value)}
            className="flex-grow text-sm h-9"
            aria-label="New subtask description"
          />
          <Button type="submit" variant="outline" size="sm" className="h-9">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Subtask
          </Button>
        </form>

      </CardContent>
    </Card>
  );
}
