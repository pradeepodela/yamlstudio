import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface YamlImportProps {
  onImport: (content: string, isValid: boolean) => void;
}

export const YamlImport: React.FC<YamlImportProps> = ({ onImport }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };  // Process the uploaded YAML content
  const processYamlContent = (content: string, filename: string) => {
    // No validation at all - just pass the content directly
    setFilename(filename);
    
    // Pass the content to the parent component - always set isValid to true
    // to indicate we want to skip validation completely
    onImport(content, true);
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      readFile(file);
    }
  };

  // Handle file selection via button
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      readFile(file);
    }
  };

  // Read the selected file
  const readFile = (file: File) => {
    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      alert('Please select a YAML file (.yaml or .yml)');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processYamlContent(content, file.name);
    };
    reader.readAsText(file);
  };

  // Trigger file input click
  const handleButtonClick = () => {
    fileInputRef.current?.click();  };
    // Reset the file input
  const handleReset = () => {
    setFilename(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
    // Remove the ValidationStatus component since we don't validate
  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".yaml,.yml"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />
      
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        } transition-colors duration-200`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <Upload className="h-10 w-10 text-muted-foreground/70" />
          <div>
            <p className="text-lg font-medium">Drag and drop your YAML file here</p>
            <p className="text-sm text-muted-foreground">
              or
            </p>
          </div>
          <Button onClick={handleButtonClick} variant="secondary">
            Select File
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Supports .yaml and .yml files
          </p>
        </div>
      </div>
      
      {/* Display file information */}
      {filename && (
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">
              Imported: <span className="font-mono">{filename}</span>
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleReset}>
                    Reset
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Reset and import a different file
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  );
};
