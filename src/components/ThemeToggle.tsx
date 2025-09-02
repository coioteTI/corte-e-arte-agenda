import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="relative w-16 h-8 p-0 rounded-full bg-muted border-2 border-border hover:bg-muted/80 transition-all duration-300 overflow-hidden"
    >
      {/* Background slider */}
      <div 
        className={`absolute inset-1 w-6 h-6 rounded-full transition-all duration-300 ease-in-out transform ${
          theme === 'dark' 
            ? 'translate-x-8 bg-primary shadow-lg' 
            : 'translate-x-0 bg-secondary shadow-sm'
        }`}
      />
      
      {/* Icons */}
      <div className="relative flex items-center justify-between w-full px-2 z-10">
        <Sun 
          className={`h-4 w-4 transition-all duration-300 ${
            theme === 'light' 
              ? 'text-primary scale-110' 
              : 'text-muted-foreground scale-90'
          }`}
        />
        <Moon 
          className={`h-4 w-4 transition-all duration-300 ${
            theme === 'dark' 
              ? 'text-primary-foreground scale-110' 
              : 'text-muted-foreground scale-90'
          }`}
        />
      </div>
    </Button>
  );
};