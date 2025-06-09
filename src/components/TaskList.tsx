"use client";

import type { Task } from '@/lib/types';
import { TaskItem } from './TaskItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onUpdateStoryPoints: (id: string, points: number) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskList({ tasks, onToggleComplete, onUpdateStoryPoints, onDeleteTask }: TaskListProps) {
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
              />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No pending tasks. Well done!</p>
          )}
        </CardContent>
      </Card>

      {completedTasks.length > 0 && (
         <Card className="shadow-lg opacity-80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-2xl text-muted-foreground">
              <FileText className="h-6 w-6 text-muted-foreground" />
              Completed Tasks ({completedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onUpdateStoryPoints={onUpdateStoryPoints}
                onDeleteTask={onDeleteTask}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
