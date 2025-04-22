import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Upload, FolderOpen, Settings, HelpCircle, LogOut, Search } from "lucide-react";

interface SidebarProps {
  className?: string;
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  className, 
  activeSection,
  onNavigate,
  onLogout
}) => {
  const navItems = [
    { icon: Search, label: "Search", id: "search" },
    { icon: Upload, label: "Upload", id: "upload" },
    { icon: FolderOpen, label: "My Documents", id: "documents" },
  ];

  const bottomNavItems = [
    { icon: Settings, label: "Settings", id: "settings" },
    { icon: HelpCircle, label: "Help", id: "help" },
    { icon: LogOut, label: "Logout", id: "logout" }
  ];

  const handleItemClick = (id: string) => {
    if (id === 'logout') {
      onLogout();
    } else {
      onNavigate(id);
    }
  };

  return (
    <div className={cn(
      "flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground",
      className
    )}>
      <div className="py-4 px-4 bg-sidebar-accent/20">
        <h1 className="flex items-center text-xl font-bold">
          <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">
            Semantix
          </span>
          <span className="ml-1">Search</span>
        </h1>
      </div>
      
      <Separator className="bg-sidebar-border" />
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  activeSection === item.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
                onClick={() => handleItemClick(item.id)}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4">
        <Separator className="mb-4 bg-sidebar-border" />
        <ul className="space-y-2">
          {bottomNavItems.map((item) => (
            <li key={item.id}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  activeSection === item.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
                onClick={() => handleItemClick(item.id)}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.label}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
