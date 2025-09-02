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
      className="relative w-16 h-8 p-0 rounded-full bg-muted hover:bg-muted/80 transition-all duration-300 overflow-hidden border border-border"
      aria-label={`Alternar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
    >
      {/* Background slider */}
      <div 
        className={`absolute inset-1 w-6 h-6 rounded-full bg-primary transition-all duration-300 ease-in-out transform shadow-lg ${
          theme === 'dark' 
            ? 'translate-x-8' 
            : 'translate-x-0'
        }`}
      />
      
      {/* Icons */}
      <div className="relative flex items-center justify-between w-full px-2 z-10">
        <Sun 
          className={`h-4 w-4 transition-all duration-300 ${
            theme === 'light' 
              ? 'text-primary-foreground scale-110 drop-shadow-sm' 
              : 'text-muted-foreground scale-90 opacity-60'
          }`}
        />
        <Moon 
          className={`h-4 w-4 transition-all duration-300 ${
            theme === 'dark' 
              ? 'text-primary-foreground scale-110 drop-shadow-sm' 
              : 'text-muted-foreground scale-90 opacity-60'
          }`}
        />
      </div>
    </Button>
  );
};