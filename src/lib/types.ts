export interface Task {
  id: string;
  description: string;
  completed: boolean;
  storyPoints: number;
  createdAt: string; // ISO string date
  isNew?: boolean; // Optional: for animation purposes
}
