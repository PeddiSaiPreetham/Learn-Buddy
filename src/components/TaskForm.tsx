"use client";

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle } from 'lucide-react';

interface TaskFormProps {
  onAddTask: (description: string) => void;
}

export function TaskForm({ onAddTask }: TaskFormProps) {
  const [description, setDescription] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (description.trim()) {
      onAddTask(description.trim());
      setDescription('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6 items-center">
      <Input
        type="text"
        placeholder="Add a new task..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="flex-grow text-base"
        aria-label="New task description"
      />
      <Button type="submit" variant="default" size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
        <PlusCircle className="mr-2 h-5 w-5" />
        Add Task
      </Button>
    </form>
  );
}
