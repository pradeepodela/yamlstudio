import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { ValidationResult, ValidationError, validateYaml, debouncedValidate, skipValidation } from '@/utils/yamlValidator';
import { updateEditorMarkers, jumpToError } from '@/utils/editorHelpers';
import { ErrorPanel } from './ErrorPanel';

interface MonacoYamlEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  showErrorPanel?: boolean;
  onEditorReady?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export const MonacoYamlEditor: React.FC<MonacoYamlEditorProps> = ({
  content,
  onChange,
  className = '',
  showErrorPanel = true,
  onEditorReady
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousContentRef = useRef<string>(content);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
    warnings: [],
    infos: []
  });

  // Function to validate YAML and update markers
  const validateAndUpdateMarkers = (content: string) => {
    const result = validateYaml(content);
    setValidationResult(result);
    
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        updateEditorMarkers(result, model);
      }
    }
    
    return result;
  };

  // Initialize the editor only once
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Monaco Editor with optimized settings for cursor visibility
    editorRef.current = monaco.editor.create(containerRef.current, {
      value: content,
      language: 'yaml',
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      folding: true,
      lineDecorationsWidth: 5,
      suggestOnTriggerCharacters: true,
      formatOnPaste: true,
      formatOnType: true,      hover: { enabled: true, delay: 300 },
      quickSuggestions: { other: true, comments: false, strings: true },
      // Enhanced cursor visibility settings      cursorBlinking: 'solid',  // Use solid for maximum visibility
      cursorStyle: 'line-thin', // Use line-thin for better visibility on small screens
      cursorWidth: 3,           // Slightly wider cursor for better visibility
      renderWhitespace: 'none',
      fixedOverflowWidgets: true,  // Ensures widgets don't interfere with cursor
      mouseWheelZoom: false,       // Improves scrolling behavior
      roundedSelection: false,     // Sharper selection corners for better visibility
    });

    // Set up a model change handler that won't interfere with cursor
    editorRef.current.onDidChangeModelContent(() => {
      if (editorRef.current) {
        // Get the content directly from the model to avoid cursor issues
        const model = editorRef.current.getModel();
        if (model) {
          const newContent = model.getValue();
          
          // Only notify parent if content actually changed
          if (newContent !== previousContentRef.current) {
            previousContentRef.current = newContent;
            onChange(newContent);
            
            // Use debounced validation to avoid performance issues
            debouncedValidate(newContent).then(result => {
              if (editorRef.current) {
                setValidationResult(result);
                const currentModel = editorRef.current.getModel();
                if (currentModel) {
                  updateEditorMarkers(result, currentModel);
                }
              }
            });
          }
        }
      }
    });    // Initial validation
    validateAndUpdateMarkers(content);
    
    // Notify parent component that editor is ready
    if (onEditorReady && editorRef.current) {
      onEditorReady(editorRef.current);
    }
    
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
    // We intentionally omit content and onChange from deps to prevent editor re-initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanly handle external content updates
  useEffect(() => {
    // Skip if no editor or content is the same as what we already have
    if (!editorRef.current || content === previousContentRef.current) return;

    // Store cursor state
    const editor = editorRef.current;
    const hasTextFocus = editor.hasTextFocus();
    const position = editor.getPosition();
    const selection = editor.getSelection();
    
    // Update the model
    const model = editor.getModel();
    if (model) {
      // Track the update to prevent an infinite loop
      previousContentRef.current = content;
      
      // Update the model content
      model.setValue(content);
      
      // Validate content
      validateAndUpdateMarkers(content);
      
      // Restore cursor position and selection
      if (hasTextFocus && position) {
        // Ensure position is valid
        const lineCount = model.getLineCount();
        const safeLineNumber = Math.min(position.lineNumber, lineCount);
        const lineContent = model.getLineContent(safeLineNumber);
        const safeColumn = Math.min(position.column, lineContent.length + 1);
      // Two-stage restoration process for better cursor visibility
        // First immediate position restoration
        editor.setPosition({
          lineNumber: safeLineNumber,
          column: safeColumn
        });
        
        if (selection) {
          editor.setSelection(selection);
        }
            
        // Then with a delay to ensure UI update completes
        setTimeout(() => {
          if (editor) {
            // Set focus first
            editor.focus();
            
            // Reapply position and reveal it
            editor.setPosition({
              lineNumber: safeLineNumber,
              column: safeColumn
            });
              // Force the cursor to be revealed with explicit revealPositionInCenter
            editor.revealPositionInCenter({
              lineNumber: safeLineNumber,
              column: safeColumn
            });
            
            // Force the editor to render now
            editor.render(true);
          }
        }, 50); // Slightly longer delay for more reliable cursor restoration
      }
    }
  }, [content]);

  // Handler for clicking on an error in the error panel
  const handleErrorClick = (error: ValidationError) => {
    if (editorRef.current && error.line >= 0) {
      jumpToError(error, editorRef.current);
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <div 
        ref={containerRef} 
        className="min-h-[500px] border rounded-lg overflow-hidden"
      />
        {/* Error panel is hidden by default, only shown if explicitly requested */}
      {showErrorPanel && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
        <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h3 className="text-lg font-semibold mb-2">
            {validationResult.errors.length > 0 
              ? `YAML Errors (${validationResult.errors.length})` 
              : `YAML Warnings (${validationResult.warnings.length})`}
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Click on any error or warning to jump to its location in the editor.
          </p>
          <ErrorPanel 
            errors={validationResult.errors}
            warnings={validationResult.warnings}
            infos={validationResult.infos}
            onErrorClick={handleErrorClick}
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
};
