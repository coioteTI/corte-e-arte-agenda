import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigationItems = [];
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  return <header className="bg-background shadow-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Corte & Arte" className="h-8 md:h-10 w-auto" />
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-semibold text-foreground">
                Corte & Arte
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground">
                ​Gestão completa para seu negócio   
              </p>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex space-x-6">
              {navigationItems.map(item => <a key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
                  {item.label}
                </a>)}
            </nav>
            
            {/* Theme Toggle */}
            <ThemeToggle />
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]" hideCloseButton>
              <div className="flex flex-col space-y-4 mt-6">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center space-x-3">
                    <img src={logo} alt="Corte & Arte" className="h-8 w-auto" />
                    <div>
                      <h2 className="font-semibold text-foreground">Corte & Arte</h2>
                      <p className="text-sm text-muted-foreground">Menu</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={closeMobileMenu} className="p-1">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                <nav className="flex flex-col space-y-3">
                  {navigationItems.map(item => <a key={item.href} href={item.href} className="text-foreground hover:text-primary transition-colors py-2 px-3 rounded-md hover:bg-muted" onClick={closeMobileMenu}>
                      {item.label}
                    </a>)}
                </nav>
                
                {/* Mobile Theme Toggle */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm font-medium text-foreground">Tema</span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>;
};