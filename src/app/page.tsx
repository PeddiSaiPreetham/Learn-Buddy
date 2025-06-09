
"use client";

import { useState, useEffect, FormEvent } from 'react';
import type { Task, SubTask } from '@/lib/types';
import { Header } from '@/components/Header';
import { TaskForm } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { suggestTaskOrganization } from '@/ai/flows/suggest-task-organization';
import { generateLearningPathway, type GenerateLearningPathwayOutput } from '@/ai/flows/generate-learning-pathway';
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [organizationSuggestion, setOrganizationSuggestion] = useState<string | null>(null);
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  
  const [learningGoal, setLearningGoal] = useState('');
  const [isLoadingPathway, setIsLoadingPathway] = useState(false);
  const [generatedPathway, setGeneratedPathway] = useState<GenerateLearningPathwayOutput | null>(null);
  const [isPathwayDialogOpen, setIsPathwayDialogOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const storedTasks = localStorage.getItem('pythonicTasks');
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        const validatedTasks = parsedTasks.map((task: Task) => ({
          ...task,
          subtasks: task.subtasks || [],
        }));
        setTasks(validatedTasks);
      } catch (error) {
        console.error("Error parsing tasks from local storage:", error);
        setTasks([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pythonicTasks', JSON.stringify(tasks));
  }, [tasks]);

  const generateId = () => crypto.randomUUID();

  const addTask = (description: string) => {
    const newTask: Task = {
      id: generateId(),
      description,
      completed: false,
      storyPoints: 0,
      createdAt: new Date().toISOString(),
      isNew: true,
      subtasks: [],
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
    setTimeout(() => {
      setTasks(currentTasks => currentTasks.map(t => t.id === newTask.id ? {...t, isNew: false} : t));
    }, 600);
  };

  const toggleComplete = (id: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const updateStoryPoints = (id: string, points: number) => {
    setTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, storyPoints: points } : task
      )
    );
  };
  
  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
    toast({
      title: "Task Deleted",
      description: "The task has been successfully removed.",
    });
  };

  const deleteAllCompletedTasks = () => {
    setTasks(prevTasks => prevTasks.filter(task => !task.completed));
    toast({
      title: "All Completed Tasks Deleted",
      description: "All completed tasks have been successfully removed.",
    });
  };

  const addSubTask = (parentId: string, description: string) => {
    const newSubTask: SubTask = {
      id: generateId(),
      description,
      completed: false,
      parentId,
      createdAt: new Date().toISOString(),
    };
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === parentId 
          ? { ...task, subtasks: [...(task.subtasks || []), newSubTask] } 
          : task
      )
    );
  };

  const toggleSubTaskComplete = (parentId: string, subTaskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === parentId
          ? {
              ...task,
              subtasks: (task.subtasks || []).map(subtask =>
                subtask.id === subTaskId
                  ? { ...subtask, completed: !subtask.completed }
                  : subtask
              ),
            }
          : task
      )
    );
  };

  const deleteSubTask = (parentId: string, subTaskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === parentId
          ? {
              ...task,
              subtasks: (task.subtasks || []).filter(subtask => subtask.id !== subTaskId),
            }
          : task
      )
    );
    toast({
      title: "Subtask Deleted",
      description: "The subtask has been successfully removed.",
    });
  };

  const handleSuggestOrganization = async () => {
    if (tasks.length === 0) {
      toast({
        title: "No Tasks",
        description: "Add some tasks before asking for organization suggestions.",
        variant: "default",
      });
      return;
    }
    setIsLoadingSuggestion(true);
    setOrganizationSuggestion(null);
    try {
      const taskDescriptions = tasks.map(t => t.description);
      const result = await suggestTaskOrganization({ tasks: taskDescriptions });
      setOrganizationSuggestion(result.suggestion);
      setIsSuggestionDialogOpen(true);
    } catch (error) {
      console.error("Failed to suggest organization:", error);
       toast({
        title: "Error",
        description: "Failed to get organization suggestion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  const handleGeneratePathway = async (e: FormEvent) => {
    e.preventDefault();
    if (!learningGoal.trim()) {
      toast({
        title: "No Learning Goal",
        description: "Please enter what you want to learn.",
        variant: "default",
      });
      return;
    }
    setIsLoadingPathway(true);
    setGeneratedPathway(null);
    try {
      const result = await generateLearningPathway({ learningGoal });
      setGeneratedPathway(result);
      setIsPathwayDialogOpen(true);
    } catch (error) {
      console.error("Failed to generate learning pathway:", error);
      toast({
        title: "Error Generating Pathway",
        description: (error as Error)?.message || "Failed to generate learning pathway. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPathway(false);
    }
  };

  const handleAddPathwayToTasks = () => {
    if (!generatedPathway) return;

    const newTasksToAdd: Task[] = [];
    generatedPathway.steps.forEach(step => {
      const taskId = generateId();
      const newMainTask: Task = {
        id: taskId,
        description: step.taskDescription,
        completed: false,
        storyPoints: 0,
        createdAt: new Date().toISOString(),
        isNew: true,
        subtasks: (step.subtasks || []).map(subStepDesc => ({
          id: generateId(),
          description: subStepDesc,
          completed: false,
          parentId: taskId,
          createdAt: new Date().toISOString(),
        })),
      };
      newTasksToAdd.push(newMainTask);
    });

    setTasks(prevTasks => [...newTasksToAdd, ...prevTasks]);

    // Trigger animation for multiple tasks
    setTimeout(() => {
        setTasks(currentTasks => currentTasks.map(t => newTasksToAdd.find(nt => nt.id === t.id) ? {...t, isNew: false} : t));
    }, 600);

    setIsPathwayDialogOpen(false);
    setGeneratedPathway(null);
    setLearningGoal(''); // Clear input
    toast({
      title: "Learning Pathway Added",
      description: "The generated tasks have been added to your list.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-background">
      <div className="w-full max-w-2xl lg:max-w-3xl">
        <Header />
        <main className="mt-8">
          <TaskForm onAddTask={addTask} />

          <Card className="my-6 shadow-md">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-2 text-xl">
                <Wand2 className="h-5 w-5 text-primary" />
                Plan Your Learning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGeneratePathway} className="flex flex-col sm:flex-row gap-2 items-center">
                <Input
                  type="text"
                  placeholder="What do you want to learn? (e.g., Next.js, Python)"
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  className="flex-grow text-base"
                  aria-label="Learning goal input"
                  disabled={isLoadingPathway}
                />
                <Button type="submit" variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" disabled={isLoadingPathway}>
                  {isLoadingPathway ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-5 w-5" />
                  )}
                  Generate Pathway
                </Button>
              </form>
            </CardContent>
          </Card>
          
          <div className="my-6 flex justify-end">
            <Button onClick={handleSuggestOrganization} disabled={isLoadingSuggestion} variant="outline" className="border-accent text-accent hover:bg-accent/10 hover:text-accent">
              {isLoadingSuggestion ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="mr-2 h-4 w-4" />
              )}
              Get Organization Suggestion
            </Button>
          </div>

          <TaskList 
            tasks={tasks} 
            onToggleComplete={toggleComplete} 
            onUpdateStoryPoints={updateStoryPoints}
            onDeleteTask={deleteTask}
            onAddSubTask={addSubTask}
            onToggleSubTaskComplete={toggleSubTaskComplete}
            onDeleteSubTask={deleteSubTask}
            onDeleteAllCompletedTasks={deleteAllCompletedTasks}
          />
        </main>
      </div>

      <Dialog open={isSuggestionDialogOpen} onOpenChange={setIsSuggestionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Task Organization Suggestion
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm">
              Here's an AI-generated suggestion for organizing your tasks:
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] my-4">
            <p className="whitespace-pre-wrap p-1 text-sm">{organizationSuggestion}</p>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsSuggestionDialogOpen(false)} variant="default">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPathwayDialogOpen} onOpenChange={setIsPathwayDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Generated Learning Pathway: {generatedPathway?.pathwayTitle || "Your Plan"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm">
              Here's a suggested learning plan. You can add these tasks to your list.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] my-4 p-1">
            {generatedPathway?.steps.map((step, index) => (
              <div key={index} className="mb-4 p-3 rounded-md border bg-card/50">
                <h4 className="font-semibold text-foreground">{index + 1}. {step.taskDescription}</h4>
                {step.subtasks && step.subtasks.length > 0 && (
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 text-sm text-muted-foreground">
                    {step.subtasks.map((subtask, subIndex) => (
                      <li key={subIndex}>{subtask}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </ScrollArea>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={() => setIsPathwayDialogOpen(false)} variant="outline">
              Close
            </Button>
            <Button onClick={handleAddPathwayToTasks} variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Add to My Tasks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
