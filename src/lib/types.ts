
export interface SubTask {
  id: string;
  description: string;
  completed: boolean;
  parentId: string; // To link back to the parent task
  createdAt: string; // ISO string date
}

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  storyPoints: number;
  createdAt: string; // ISO string date
  isNew?: boolean; // Optional: for animation purposes
  subtasks?: SubTask[];
  dueDate?: string; // Optional: for future reminder feature
}
