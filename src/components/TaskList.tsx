
"use client";

import type { Task } from '@/lib/types';
import { TaskItem } from './TaskItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onUpdateStoryPoints: (id: string, points: number) => void;
  onDeleteTask: (id: string) => void;
  onAddSubTask: (parentId: string, description: string) => void;
  onToggleSubTaskComplete: (parentId: string, subTaskId: string) => void;
  onDeleteSubTask: (parentId: string, subTaskId: string) => void;
  onDeleteAllCompletedTasks: () => void;
}

export function TaskList({ 
  tasks, 
  onToggleComplete, 
  onUpdateStoryPoints, 
  onDeleteTask,
  onAddSubTask,
  onToggleSubTaskComplete,
  onDeleteSubTask,
  onDeleteAllCompletedTasks,
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <FileText className="h-6 w-6 text-primary" />
            Your Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No tasks yet. Add a new task to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  const pendingTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-2xl">
            <FileText className="h-6 w-6 text-primary" />
            Pending Tasks ({pendingTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTasks.length > 0 ? (
            pendingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onUpdateStoryPoints={onUpdateStoryPoints}
                onDeleteTask={onDeleteTask}
                onAddSubTask={onAddSubTask}
                onToggleSubTaskComplete={onToggleSubTaskComplete}
                onDeleteSubTask={onDeleteSubTask}
              />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No pending tasks. Well done!</p>
          )}
        </CardContent>
      </Card>

      {completedTasks.length > 0 && (
         <Card className="shadow-lg opacity-80">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-headline text-2xl text-muted-foreground">
              <FileText className="h-6 w-6 text-muted-foreground" />
              Completed Tasks ({completedTasks.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteAllCompletedTasks}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/50"
              aria-label="Delete all completed tasks"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All
            </Button>
          </CardHeader>
          <CardContent>
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onUpdateStoryPoints={onUpdateStoryPoints}
                onDeleteTask={onDeleteTask}
                onAddSubTask={onAddSubTask}
                onToggleSubTaskComplete={onToggleSubTaskComplete}
                onDeleteSubTask={onDeleteSubTask}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
