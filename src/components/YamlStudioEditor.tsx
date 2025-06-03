import React, { useState, useEffect, useRef } from 'react';
import { MonacoYamlEditor } from '@/components/MonacoYamlEditor';
import { YamlImport } from '@/components/YamlImport';
import YamlPreview from '@/components/YamlPreview';
import { validateYaml, ValidationResult, skipValidation } from '@/utils/yamlValidator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, FileWarning, FileCheck, Save, Terminal, Code, Eye, Upload, Maximize2, Minimize2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { load } from 'js-yaml';
import { Button } from '@/components/ui/button';

export const YamlStudioEditor: React.FC = () => {
  const [yamlContent, setYamlContent] = useState<string>('');
  // Use an explicit type for parsedSpec to avoid TypeScript "any" warnings
  const [parsedSpec, setParsedSpec] = useState<Record<string, unknown> | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [activeTab, setActiveTab] = useState<string>('advanced-editor');
  const [showTerminal, setShowTerminal] = useState<boolean>(false);
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [terminalCommand, setTerminalCommand] = useState<string>('');
  const [terminalExpanded, setTerminalExpanded] = useState<boolean>(false);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  
  // Initial YAML content for new files
  const initialYaml = `openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
  description: API Description
paths:
  /example:
    get:
      summary: Example endpoint
      responses:
        '200':
          description: OK
`;
  // Load saved YAML content from local storage on initial load
  useEffect(() => {
    const savedYaml = localStorage.getItem('yamlstudio_content');
    if (savedYaml) {
      setYamlContent(savedYaml);
    }
  }, []);

  // Update the parsed spec when YAML content changes
  useEffect(() => {
    if (!yamlContent) {
      setParsedSpec(null);
      return;
    }
    
    // Validate the YAML content
    const result = validateYaml(yamlContent);
    setValidationResult(result);
    
    // Try to parse even if there are errors - we want to show as much as possible
    try {
      const parsed = load(yamlContent);
      setParsedSpec(parsed);
    } catch (error) {
      // If parsing completely fails, we can't show a preview
      console.error('Failed to parse YAML:', error);
      setParsedSpec(null);
    }  }, [yamlContent]);
  
  // Handle YAML content changes
  const handleYamlChange = (newContent: string) => {
    setYamlContent(newContent);
    // Save to local storage
    localStorage.setItem('yamlstudio_content', newContent);
  };
  // Handle YAML import
  const handleYamlImport = (content: string, isValid: boolean) => {
    // Skip validation entirely and accept the content as is
    setYamlContent(content);
    
    // Save to local storage
    localStorage.setItem('yamlstudio_content', content);
    
    // Always go to advanced editor after import
    setActiveTab('advanced-editor');
    
    // Use the skipValidation function to bypass validation completely
    setValidationResult(skipValidation(content));
    
    // Try to parse even if there are potential errors
    try {
      const parsed = load(content) as Record<string, unknown>;
      setParsedSpec(parsed);
    } catch (error) {
      // If parsing fails, we won't show a preview, but we'll still keep the content
      console.log('Note: YAML could not be parsed for preview');
      setParsedSpec(null);
    }
  };
  
  // Status component to show validation state
  const ValidationStatus = () => {
    if (!validationResult) return null;
    
    const { errors, warnings } = validationResult;
    
    if (errors.length > 0) {
      return (
        <Alert variant="destructive" className="mb-4 border-red-600 bg-red-50 shadow-md">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-800 font-bold text-lg">YAML Errors Detected</AlertTitle>
          <AlertDescription className="text-red-700">
            <div className="flex flex-col gap-2">
              <p>Found {errors.length} error{errors.length !== 1 ? 's' : ''} in your YAML.</p>
              <div className="flex gap-2 items-center mt-1">
                <Button 
                  onClick={() => setActiveTab('advanced-editor')} 
                  variant="outline" 
                  className="bg-white hover:bg-red-100 border-red-300 text-red-800"
                >
                  Open Advanced YAML Editor
                </Button>
                <span className="text-sm">to fix these issues and see detailed error information.</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    
    if (warnings.length > 0) {
      return (
        <Alert variant="warning" className="mb-4 border-yellow-500 bg-yellow-50 text-yellow-800 shadow-md">
          <FileWarning className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-800 font-bold text-lg">YAML Warnings</AlertTitle>
          <AlertDescription className="text-yellow-700">
            <div className="flex flex-col gap-2">
              <p>Found {warnings.length} warning{warnings.length !== 1 ? 's' : ''} in your YAML.</p>
              <div className="flex gap-2 items-center mt-1">
                <Button 
                  onClick={() => setActiveTab('advanced-editor')} 
                  variant="outline" 
                  className="bg-white hover:bg-yellow-100 border-yellow-300 text-yellow-800"
                >
                  Open Advanced YAML Editor
                </Button>
                <span className="text-sm">to review and fix these warnings.</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Alert className="mb-4 border-green-500 bg-green-50 text-green-800 shadow-md">
        <FileCheck className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-800 font-bold text-lg">Valid YAML</AlertTitle>
        <AlertDescription className="text-green-700">
          Your YAML is valid. No issues detected.
        </AlertDescription>
      </Alert>
    );
  };  // Function to save YAML content to a file
  const handleSaveYaml = () => {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yamlstudio_export.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to handle terminal commands
  const handleTerminalCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalCommand.trim()) return;

    // Add the command to the terminal output
    const newOutput = `${terminalOutput}\n$ ${terminalCommand}\n`;
    setTerminalOutput(newOutput);

    // Process the comm
    // 
    // 
    // and - for this demo, we'll just simulate some simple commands
    const cmd = terminalCommand.trim().toLowerCase();
    let response = '';

    if (cmd === 'clear') {
      // Clear the terminal
      setTerminalOutput('');
    } else if (cmd === 'help') {
      response = `Available commands:
- help: Show this help message
- clear: Clear the terminal
- validate: Validate the current YAML
- ls: List files
- cat: Show file content
`;
    } else if (cmd === 'validate') {
      if (yamlContent) {
        const result = validateYaml(yamlContent);
        if (result.isValid) {
          response = 'YAML validation successful! No errors found.';
        } else {
          response = `YAML validation failed with ${result.errors.length} errors:\n`;
          result.errors.forEach((error, i) => {
            response += `${i + 1}. Line ${error.line}, Column ${error.column}: ${error.message}\n`;
          });
        }
      } else {
        response = 'No YAML content to validate.';
      }
    } else if (cmd === 'ls') {
      response = 'yamlstudio_export.yaml';
    } else if (cmd.startsWith('cat ')) {
      response = 'Displaying file content...\n' + yamlContent;
    } else {
      response = `Command not found: ${terminalCommand}. Type 'help' for available commands.`;
    }

    // Update terminal output with response
    if (response) {
      setTerminalOutput(prev => `${prev}${response}\n`);
    }

    // Clear the command input
    setTerminalCommand('');
  };
  // Focus the terminal input when the terminal is shown
  useEffect(() => {
    if (showTerminal && terminalInputRef.current) {
      setTimeout(() => {
        terminalInputRef.current?.focus();
      }, 100);
    }
  }, [showTerminal, terminalExpanded]);
  return (
    <div className="container mx-auto py-8 px-4">      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">YAML Studio</h1>
        <div className="flex items-center gap-3">
          {yamlContent && (
            <Button onClick={handleSaveYaml} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save YAML
            </Button>
          )}
          <Button 
            onClick={() => {
              setShowTerminal(!showTerminal);
              // Focus the terminal input after a short delay
              if (!showTerminal) {
                setTimeout(() => {
                  terminalInputRef.current?.focus();
                }, 100);
              }
            }} 
            variant={showTerminal ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Terminal className="h-4 w-4" />
            {showTerminal ? "Hide Terminal" : "Show Terminal"}
          </Button>
        </div>
      </div>
      
      {/* Display validation status */}
      {yamlContent && validationResult && <ValidationStatus />}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="advanced-editor" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Advanced YAML Editor
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Basic Editor
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import YAML
          </TabsTrigger>
          {parsedSpec && (
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          )}
        </TabsList>        <TabsContent value="advanced-editor">
          {!yamlContent ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <p className="text-lg text-center mb-4">
                No YAML content to edit. Please start a new file or import one first.
              </p>
              <button
                onClick={() => {
                  setYamlContent(initialYaml);
                  localStorage.setItem('yamlstudio_content', initialYaml);
                  setActiveTab('advanced-editor');
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Start New File
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-300 rounded-md p-4 mb-4">
                <h3 className="text-blue-800 font-semibold text-lg mb-2">Advanced YAML Editor</h3>
                <p className="text-blue-700">
                  This editor shows detailed error information and allows you to fix syntax and validation issues.
                  Use this view when you need to troubleshoot problems with your YAML.
                </p>
              </div>
              
              <div className={`grid ${showTerminal ? (terminalExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[1fr_auto]') : 'grid-rows-[1fr]'} gap-4`}>
                {/* Editor container */}
                <div className={terminalExpanded ? 'hidden' : 'block'}>
                  <MonacoYamlEditor
                    content={yamlContent}
                    onChange={handleYamlChange}
                    showErrorPanel={true}
                  />
                </div>
                
                {/* Terminal panel */}
                {showTerminal && (
                  <div className={`border border-gray-300 rounded-lg overflow-hidden ${terminalExpanded ? 'h-[80vh]' : 'h-[300px]'}`}>
                    <div className="bg-gray-800 text-white p-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        <span>Terminal</span>
                      </div>                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setTerminalExpanded(!terminalExpanded);
                          setTimeout(() => {
                            terminalInputRef.current?.focus();
                          }, 100);
                        }}
                        className="h-6 w-6 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
                      >
                        {terminalExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="bg-black p-2 text-green-400 font-mono text-sm h-[calc(100%-40px)] flex flex-col">
                      <div className="flex-1 overflow-auto whitespace-pre-wrap">
                        {terminalOutput || "YAML Studio Terminal. Type 'help' for available commands."}
                      </div>
                      <form onSubmit={handleTerminalCommand} className="flex items-center mt-2 border-t border-gray-700 pt-2">
                        <span className="text-yellow-400 mr-2">$</span>                        <input
                          ref={terminalInputRef}
                          id="terminalInput"
                          type="text"
                          value={terminalCommand}
                          onChange={(e) => setTerminalCommand(e.target.value)}
                          className="flex-1 bg-transparent border-none outline-none text-green-400"
                          placeholder="Type a command..."
                          autoComplete="off"
                        />
                      </form>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="editor">
          {!yamlContent ? (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
              <p className="text-lg text-center mb-4">
                No YAML content yet. You can start a new file or import an existing one.
              </p>
              <button
                onClick={() => {
                  setYamlContent(initialYaml);
                  localStorage.setItem('yamlstudio_content', initialYaml);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Start New File
              </button>
            </div>
          ) : (
            <MonacoYamlEditor
              content={yamlContent}
              onChange={handleYamlChange}
              showErrorPanel={false}
            />
          )}
        </TabsContent>
          <TabsContent value="import">
          <YamlImport onImport={handleYamlImport} />
        </TabsContent>
        
        {parsedSpec && (
          <TabsContent value="preview">
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-300 rounded-md p-4 mb-4">
                <h3 className="text-green-800 font-semibold text-lg mb-2">YAML Preview</h3>
                <p className="text-green-700">
                  This view shows a rendered preview of your YAML document. 
                  It helps you visualize the structure and content of your YAML.
                </p>
              </div>
              <YamlPreview spec={parsedSpec} />
            </div>
          </TabsContent>
        )}      </Tabs>
    </div>
  );
};
