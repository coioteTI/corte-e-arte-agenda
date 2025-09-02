import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

export const ThemeDemo = () => {
  const { theme } = useTheme();
  
  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Tema Atual: {theme === 'light' ? 'Sol ☀️' : 'Lua 🌙'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Cores Principais</h3>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary rounded-full"></div>
                <span className="text-muted-foreground">Primary (Dourado)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-secondary rounded-full"></div>
                <span className="text-muted-foreground">Secondary</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Botões de Teste</h3>
              <div className="flex flex-col space-y-2">
                <Button className="w-full">Botão Primário</Button>
                <Button variant="secondary" className="w-full">Botão Secundário</Button>
                <Button variant="outline" className="w-full">Botão Outline</Button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-muted-foreground text-sm">
              Este é um exemplo de texto secundário com fundo muted para demonstrar o contraste do tema {theme}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};