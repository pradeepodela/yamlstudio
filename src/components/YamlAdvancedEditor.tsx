import React, { useState, useEffect, useRef } from 'react';
import { MonacoYamlEditor } from './MonacoYamlEditor';
import { ErrorPanel } from './ErrorPanel';
import { validateYaml, ValidationError } from '@/utils/yamlValidator';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { FileWarning, Bug, FileEdit } from 'lucide-react';
import jsYaml from 'js-yaml';
import './YamlAdvancedEditor.css';
import { jumpToError } from '@/utils/editorHelpers';
import * as monaco from 'monaco-editor';

interface YamlAdvancedEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  className?: string;
}

const YamlAdvancedEditor: React.FC<YamlAdvancedEditorProps> = ({ 
  content, 
  onContentChange,
  className = ''
}) => {  // Using a ref instead of state prevents unnecessary re-renders
  const editorContentRef = useRef(content);  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ValidationError[]>([]);
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
    
  // Update editor content only when external content changes and differs from current
  useEffect(() => {
    if (content !== editorContentRef.current) {
      editorContentRef.current = content;
    }
  }, [content]);
      // Handler for editor content changes
  const handleEditorChange = (value: string) => {
    // Update our ref to track the current content
    editorContentRef.current = value;
    
    // Use a small delay for parent notification to give priority to editor updates
    // This helps maintain the cursor position during editing
    requestAnimationFrame(() => {
      onContentChange(value);
    });
    
    // Run validation as a non-blocking operation in a separate tick
    setTimeout(() => {
      validateContent(value);
    }, 0);
  };
    // Separate function for validation to keep the main change handler clean
  const validateContent = (value: string) => {
    // Skip validation for empty content
    if (!value || !value.trim()) {
      setErrors([]);
      setWarnings([]);
      return;
    }
    
    // Perform our standard YAML validation
    const result = validateYaml(value);
    setErrors(result.errors);
    setWarnings(result.warnings);
    
    // Additional js-yaml validation as a fallback
    try {
      jsYaml.load(value);
    } catch (error) {      // Only add this error if our validator didn't catch it
      if (result.errors.length === 0) {
        const err = error as Error & { mark?: { line?: number, column?: number } };
        const newError: ValidationError = {
          line: err.mark?.line !== undefined ? err.mark.line : 0,
          column: err.mark?.column !== undefined ? err.mark.column : 0,
          message: err.message || 'Syntax error',
          severity: 'error',
          type: 'syntax'
        };
        setErrors([newError]);
      }
    }
  };

  // Handle clicking on an error to navigate to its location in the editor
  const handleErrorClick = (error: ValidationError) => {
    if (editorInstance && error.line >= 0) {
      jumpToError(error, editorInstance);
    }
  };
  return (
    <div className={cn("yaml-advanced-editor-container flex flex-col space-y-2", className)}>      <div className="yaml-editor-content w-full">
        <MonacoYamlEditor
          content={content}
          onChange={handleEditorChange}
          className="h-[500px]"
          showErrorPanel={false}
          onEditorReady={(editor) => setEditorInstance(editor)}
        />
      </div>
        
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="yaml-editor-error-panel mt-2 border rounded-lg p-2 bg-background/50">
          <div className="flex items-center gap-2 mb-1">
            {errors.length > 0 && (
              <Badge variant="destructive" className="font-normal gap-1">
                <Bug size={14} />
                {errors.length} Error{errors.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {warnings.length > 0 && (
              <Badge variant="outline" className="font-normal gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
                <FileWarning size={14} />
                {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>          <ErrorPanel 
            errors={errors}
            warnings={warnings}
            infos={[]}
            className="max-h-[200px] overflow-auto"
            onErrorClick={handleErrorClick}
          />
        </div>
      )}
        
      <div className="text-xs text-muted-foreground mt-2">
        <p>This advanced editor provides real-time syntax checking and validation for your YAML files.</p>
        {errors.length > 0 && (
          <p className="mt-1 text-red-700">Fix the errors highlighted above to ensure your YAML is valid.</p>
        )}
      </div>
    </div>
  );
};

export default YamlAdvancedEditor;
