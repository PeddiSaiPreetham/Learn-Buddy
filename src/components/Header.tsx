import { ListChecks } from 'lucide-react';

export function Header() {
  return (
    <header className="py-8 text-center">
      <div className="inline-flex items-center gap-3">
        <ListChecks className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-headline font-bold text-foreground sm:text-5xl">
          Learn Buddy
        </h1>
      </div>
      <p className="mt-2 text-lg text-muted-foreground">
        Organize your work with smart suggestions and effort estimation.
      </p>
    </header>
  );
}
