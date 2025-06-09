"use client";

import { useState, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { Header } from '@/components/Header';
import { TaskForm } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, Loader2 } from 'lucide-react';
import { suggestTaskOrganization } from '@/ai/flows/suggest-task-organization';
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [organizationSuggestion, setOrganizationSuggestion] = useState<string | null>(null);
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const { toast } = useToast();

  // Load tasks from local storage on initial render
  useEffect(() => {
    const storedTasks = localStorage.getItem('pythonicTasks');
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  }, []);

  // Save tasks to local storage whenever tasks change
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
      isNew: true, // Mark as new for animation
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
    // Remove isNew flag after animation
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

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-background">
      <div className="w-full max-w-2xl lg:max-w-3xl">
        <Header />
        <main className="mt-8">
          <TaskForm onAddTask={addTask} />
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
    </div>
  );
}
