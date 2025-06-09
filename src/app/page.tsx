
"use client";

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import type { Task, SubTask } from '@/lib/types';
import { Header } from '@/components/Header';
import { TaskForm } from '@/components/TaskForm';
import { TaskList } from '@/components/TaskList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogDesc, // Renamed to avoid conflict
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, Loader2, Sparkles, Wand2, UserCheck, AlertTriangle } from 'lucide-react';
import { suggestTaskOrganization } from '@/ai/flows/suggest-task-organization';
import { generateLearningPathway, type GenerateLearningPathwayOutput } from '@/ai/flows/generate-learning-pathway';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [organizationSuggestion, setOrganizationSuggestion] = useState<string | null>(null);
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  
  const [learningGoal, setLearningGoal] = useState('');
  const [isLoadingPathway, setIsLoadingPathway] = useState(false);
  const [generatedPathway, setGeneratedPathway] = useState<GenerateLearningPathwayOutput | null>(null);
  const [isPathwayDialogOpen, setIsPathwayDialogOpen] = useState(false);

  const { toast } = useToast();

  const generateId = () => crypto.randomUUID(); // Still used for subtask IDs within parent doc

  // Fetch tasks from Firestore
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        setTasks([]);
        setIsLoadingTasks(false);
        return;
      }
      setIsLoadingTasks(true);
      try {
        const tasksCol = collection(db, 'users', user.uid, 'tasks');
        const q = query(tasksCol, orderBy('createdAt', 'desc'));
        const taskSnapshot = await getDocs(q);
        const userTasks = taskSnapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data();
          // Convert Firestore Timestamps to ISO strings if necessary,
          // for now assuming createdAt is stored as ISO string based on add logic
          return {
            id: docSnapshot.id,
            description: data.description,
            completed: data.completed,
            storyPoints: data.storyPoints,
            createdAt: data.createdAt, // This should be ISO string
            subtasks: data.subtasks || [],
          } as Task;
        });
        setTasks(userTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        toast({ title: "Error", description: "Could not fetch tasks.", variant: "destructive" });
      } finally {
        setIsLoadingTasks(false);
      }
    };

    if (user) {
      fetchTasks();
    } else {
      setTasks([]); // Clear tasks if user logs out
      setIsLoadingTasks(false); // Ensure loading is false if no user
    }
  }, [user, toast]);


  const addTask = async (description: string) => {
    if (!user) {
      toast({ title: "Not Logged In", description: "You must be logged in to add tasks.", variant: "destructive" });
      return;
    }
    const newTaskData = {
      description,
      completed: false,
      storyPoints: 0,
      createdAt: new Date().toISOString(),
      subtasks: [] as SubTask[],
      userId: user.uid, // Store userId for potential rules/queries
    };
    try {
      const tasksCol = collection(db, 'users', user.uid, 'tasks');
      const docRef = await addDoc(tasksCol, newTaskData);
      const newTaskWithId: Task = { ...newTaskData, id: docRef.id, isNew: true };
      setTasks(prevTasks => [newTaskWithId, ...prevTasks]);
      setTimeout(() => {
        setTasks(currentTasks => currentTasks.map(t => t.id === newTaskWithId.id ? {...t, isNew: false} : t));
      }, 600);
      toast({ title: "Task Added", description: "Your new task has been saved." });
    } catch (error) {
      console.error("Error adding task:", error);
      toast({ title: "Error", description: "Could not add task to database.", variant: "destructive" });
    }
  };

  const toggleComplete = async (id: string) => {
    if (!user) return;
    const taskToUpdate = tasks.find(t => t.id === id);
    if (!taskToUpdate) return;
    
    const taskRef = doc(db, 'users', user.uid, 'tasks', id);
    try {
      await updateDoc(taskRef, { completed: !taskToUpdate.completed });
      setTasks(
        tasks.map((task) =>
          task.id === id ? { ...task, completed: !task.completed } : task
        )
      );
    } catch (error) {
      console.error("Error updating task completion:", error);
      toast({ title: "Error", description: "Could not update task status.", variant: "destructive" });
    }
  };

  const updateStoryPoints = async (id: string, points: number) => {
    if (!user) return;
    const taskRef = doc(db, 'users', user.uid, 'tasks', id);
    try {
      await updateDoc(taskRef, { storyPoints: points });
      setTasks(
        tasks.map((task) =>
          task.id === id ? { ...task, storyPoints: points } : task
        )
      );
    } catch (error) {
      console.error("Error updating story points:", error);
      toast({ title: "Error", description: "Could not update story points.", variant: "destructive" });
    }
  };
  
  const deleteTask = async (id: string) => {
    if (!user) return;
    const taskRef = doc(db, 'users', user.uid, 'tasks', id);
    try {
      await deleteDoc(taskRef);
      setTasks(tasks.filter(task => task.id !== id));
      toast({
        title: "Task Deleted",
        description: "The task has been successfully removed from the database.",
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Error", description: "Could not delete task.", variant: "destructive" });
    }
  };

  const deleteAllCompletedTasks = async () => {
    if (!user) return;
    setIsLoadingTasks(true); 
    try {
      const batchOp = writeBatch(db);
      const tasksCol = collection(db, 'users', user.uid, 'tasks');
      const q = query(tasksCol, where('completed', '==', true));
      const completedTasksSnapshot = await getDocs(q);

      if (completedTasksSnapshot.empty) {
        toast({ title: "No completed tasks to delete." });
        setIsLoadingTasks(false);
        return;
      }

      completedTasksSnapshot.docs.forEach(docSnapshot => {
        batchOp.delete(docSnapshot.ref);
      });
      await batchOp.commit();
      setTasks(prevTasks => prevTasks.filter(task => !task.completed));
      toast({
        title: "All Completed Tasks Deleted",
        description: "Completed tasks have been removed from the database.",
      });
    } catch (error) {
      console.error("Error deleting all completed tasks:", error);
      toast({ title: "Error", description: "Could not delete completed tasks.", variant: "destructive" });
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const addSubTask = async (parentId: string, description: string) => {
    if (!user) return;
    const parentTaskRef = doc(db, 'users', user.uid, 'tasks', parentId);
    const parentTask = tasks.find(t => t.id === parentId);
    if (!parentTask) return;

    const newSubTask: SubTask = {
      id: generateId(),
      description,
      completed: false,
      parentId,
      createdAt: new Date().toISOString(),
    };
    const updatedSubtasks = [...(parentTask.subtasks || []), newSubTask];
    try {
      await updateDoc(parentTaskRef, { subtasks: updatedSubtasks });
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === parentId 
            ? { ...task, subtasks: updatedSubtasks } 
            : task
        )
      );
    } catch (error) {
      console.error("Error adding subtask:", error);
      toast({ title: "Error", description: "Could not add subtask.", variant: "destructive" });
    }
  };

  const toggleSubTaskComplete = async (parentId: string, subTaskId: string) => {
    if (!user) return;
    const parentTaskRef = doc(db, 'users', user.uid, 'tasks', parentId);
    const parentTask = tasks.find(t => t.id === parentId);
    if (!parentTask || !parentTask.subtasks) return;

    const updatedSubtasks = parentTask.subtasks.map(subtask =>
      subtask.id === subTaskId
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    );
    try {
      await updateDoc(parentTaskRef, { subtasks: updatedSubtasks });
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === parentId
            ? { ...task, subtasks: updatedSubtasks }
            : task
        )
      );
    } catch (error) {
      console.error("Error updating subtask:", error);
      toast({ title: "Error", description: "Could not update subtask status.", variant: "destructive" });
    }
  };

  const deleteSubTask = async (parentId: string, subTaskId: string) => {
    if (!user) return;
    const parentTaskRef = doc(db, 'users', user.uid, 'tasks', parentId);
    const parentTask = tasks.find(t => t.id === parentId);
    if (!parentTask || !parentTask.subtasks) return;

    const updatedSubtasks = parentTask.subtasks.filter(subtask => subtask.id !== subTaskId);
    try {
      await updateDoc(parentTaskRef, { subtasks: updatedSubtasks });
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === parentId
            ? { ...task, subtasks: updatedSubtasks }
            : task
        )
      );
      toast({ title: "Subtask Deleted", description: "The subtask has been successfully removed." });
    } catch (error) {
      console.error("Error deleting subtask:", error);
      toast({ title: "Error", description: "Could not delete subtask.", variant: "destructive" });
    }
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

  const handleAddPathwayToTasks = async () => {
    if (!generatedPathway || !user) return;
    
    const newTasksForOptimisticUpdate: Task[] = [];
    const batchOp = writeBatch(db);
    const tasksCol = collection(db, 'users', user.uid, 'tasks');

    generatedPathway.steps.forEach(step => {
      const newTaskDocRef = doc(tasksCol); // Generate a new doc ref for ID
      const newMainTaskData = {
        description: step.taskDescription,
        completed: false,
        storyPoints: 0,
        createdAt: new Date().toISOString(),
        userId: user.uid,
        subtasks: (step.subtasks || []).map(subStepDesc => ({
          id: generateId(),
          description: subStepDesc,
          completed: false,
          parentId: newTaskDocRef.id, // Assign parent ID from the new doc ref
          createdAt: new Date().toISOString(),
        })),
      };
      batchOp.set(newTaskDocRef, newMainTaskData);
      newTasksForOptimisticUpdate.push({ ...newMainTaskData, id: newTaskDocRef.id, isNew: true });
    });

    try {
      await batchOp.commit();
      setTasks(prevTasks => [...newTasksForOptimisticUpdate, ...prevTasks]);
      setTimeout(() => {
          setTasks(currentTasks => currentTasks.map(t => 
            newTasksForOptimisticUpdate.find(nt => nt.id === t.id) ? {...t, isNew: false} : t
          ));
      }, 600);

      setIsPathwayDialogOpen(false);
      setGeneratedPathway(null);
      setLearningGoal(''); 
      toast({
        title: "Learning Pathway Added",
        description: "The generated tasks have been added to your list in the database.",
      });
    } catch (error) {
      console.error("Error adding pathway to tasks in Firestore:", error);
      toast({ title: "Error", description: "Could not add pathway tasks to database.", variant: "destructive" });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading Learn Buddy...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 bg-background">
        <div className="w-full max-w-2xl lg:max-w-3xl">
          <Header />
          <main className="mt-8">
            <Card className="shadow-lg border-primary">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2 text-2xl text-primary">
                  <UserCheck className="h-7 w-7" />
                  Welcome to Learn Buddy!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg text-foreground">
                  Please log in or sign up to manage your learning tasks and generate personalized pathways.
                </p>
                <div className="flex gap-4">
                  <Button asChild size="lg" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/login">Log In</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="flex-1">
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="mt-8 shadow-md bg-accent/10 border-accent">
              <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2 text-xl text-accent-foreground">
                      <AlertTriangle className="h-5 w-5 text-accent" />
                      Important Note
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-accent-foreground/90">
                      If this is your first time using authentication, you'll need to set up Firebase in your project and update the environment variables in the <code>.env</code> file with your Firebase project credentials. Check the console for more details if you encounter issues.
                  </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  // User is logged in, render the main app
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
            <Button onClick={handleSuggestOrganization} disabled={isLoadingSuggestion || tasks.length === 0} variant="outline" className="border-accent text-accent hover:bg-accent/10 hover:text-accent">
              {isLoadingSuggestion ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lightbulb className="mr-2 h-4 w-4" />
              )}
              Get Organization Suggestion
            </Button>
          </div>

          {isLoadingTasks ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-lg text-muted-foreground">Loading your tasks...</p>
            </div>
          ) : (
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
          )}
        </main>
      </div>

      <Dialog open={isSuggestionDialogOpen} onOpenChange={setIsSuggestionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Task Organization Suggestion
            </DialogTitle>
            <DialogDesc className="mt-2 text-sm">
              Here's an AI-generated suggestion for organizing your tasks:
            </DialogDesc>
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
            <DialogDesc className="mt-2 text-sm">
              Here's a suggested learning plan. You can add these tasks to your list.
            </DialogDesc>
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
