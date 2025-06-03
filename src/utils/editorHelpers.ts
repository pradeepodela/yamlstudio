import * as monaco from 'monaco-editor';
import { ValidationError, ValidationResult } from './yamlValidator';

// Convert validation errors to Monaco editor markers
export function validationErrorsToMarkers(
  validationResult: ValidationResult,
  model: monaco.editor.ITextModel
): monaco.editor.IMarkerData[] {
  const markers: monaco.editor.IMarkerData[] = [];

  // Add error markers
  validationResult.errors.forEach(error => {
    markers.push(createMarker(error, monaco.MarkerSeverity.Error, model));
  });

  // Add warning markers
  validationResult.warnings.forEach(warning => {
    markers.push(createMarker(warning, monaco.MarkerSeverity.Warning, model));
  });

  // Add info markers
  validationResult.infos.forEach(info => {
    if (info.line > 0) { // Only add info markers that have position information
      markers.push(createMarker(info, monaco.MarkerSeverity.Info, model));
    }
  });

  return markers;
}

// Create a Monaco marker from a validation error
function createMarker(
  error: ValidationError,
  severity: monaco.MarkerSeverity,
  model: monaco.editor.ITextModel
): monaco.editor.IMarkerData {
  // Default to first line if no line information
  const line = Math.max(0, error.line);
  
  // Get the line content to determine the range
  const lineContent = model.getLineContent(line + 1) || '';
  
  // Default column or use error column
  const column = Math.min(Math.max(0, error.column), lineContent.length);
  
  // Create a range for the marker
  // If we have a range from the error use it, otherwise mark the whole line or a specific point
  let startLineNumber = line + 1;
  let startColumn = column + 1;
  let endLineNumber = line + 1;
  let endColumn = lineContent.length + 1;
  
  // Try to intelligently determine the range based on the error type and message
  if (error.range) {
    // Use the provided range if available
    startLineNumber = error.range.start.line + 1;
    startColumn = error.range.start.column + 1;
    endLineNumber = error.range.end.line + 1;
    endColumn = error.range.end.column + 1;
  } else {
    // Attempt to determine a more precise range based on error type and content
    const errorMsg = error.message.toLowerCase();
    
    if (errorMsg.includes('duplicate key')) {
      // For duplicate key errors, try to find the key in the line
      const keyMatch = errorMsg.match(/duplicate key ['"]([^'"]+)['"]/i);
      if (keyMatch) {
        const key = keyMatch[1];
        const keyIndex = lineContent.indexOf(key);
        if (keyIndex >= 0) {
          startColumn = keyIndex + 1;
          endColumn = keyIndex + key.length + 1;
        }
      }
    } else if (errorMsg.includes('unexpected token')) {
      // For unexpected token errors, try to identify the token
      const tokenMatch = errorMsg.match(/unexpected token ['"]?([^'"]+)['"]?/i);
      if (tokenMatch) {
        const token = tokenMatch[1];
        const tokenIndex = lineContent.indexOf(token);
        if (tokenIndex >= 0) {
          startColumn = tokenIndex + 1;
          endColumn = tokenIndex + token.length + 1;
        }
      }
    } else if (errorMsg.includes('missing')) {
      // For missing field errors, highlight the parent object
      const fieldMatch = errorMsg.match(/missing (?:required )?(?:field|property) ['"]([^'"]+)['"]/i);
      if (fieldMatch) {
        // Try to find the parent object's line and highlight it
        const parent = fieldMatch[1];
        // Keep the default full line highlight
      }
    } else if (errorMsg.includes('should be a')) {
      // For type errors, try to find the value in the line
      const valuePattern = /:\s*(.+)$/;
      const valueMatch = lineContent.match(valuePattern);
      if (valueMatch) {
        const value = valueMatch[1].trim();
        const valueIndex = lineContent.lastIndexOf(value);
        if (valueIndex >= 0) {
          startColumn = valueIndex + 1;
          endColumn = valueIndex + value.length + 1;
        }
      }
    }  }
  
  return {
    severity,
    message: error.message,
    startLineNumber,
    startColumn,
    endLineNumber,
    endColumn,
    // Add source information for better filtering
    source: error.type === 'syntax' ? 'YAML Syntax' : 
            error.type === 'schema' ? 'OpenAPI Schema' : 'YAML Format',
    // Include more detailed information for hover
    code: error.code || '',
    tags: [],
    // Add related information for display in hover
    relatedInformation: error.details ? [
      {
        resource: model.uri,
        message: error.details,
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn
      }
    ] : []
  };
}

// Update the Monaco editor with validation markers
export function updateEditorMarkers(
  validationResult: ValidationResult,
  model: monaco.editor.ITextModel
): void {
  const markers = validationErrorsToMarkers(validationResult, model);
  monaco.editor.setModelMarkers(model, 'yaml-validator', markers);
}

// Get the current editor marker at a specific position
export function getMarkerAtPosition(
  position: monaco.Position,
  model: monaco.editor.ITextModel
): monaco.editor.IMarkerData | undefined {
  const markers = monaco.editor.getModelMarkers({ resource: model.uri });
  
  return markers.find(marker => 
    marker.startLineNumber <= position.lineNumber && 
    marker.endLineNumber >= position.lineNumber &&
    marker.startColumn <= position.column &&
    marker.endColumn >= position.column
  );
}

// Jump to a specific error in the editor
export function jumpToError(
  error: ValidationError,
  editor: monaco.editor.IStandaloneCodeEditor
): void {
  const position = {
    lineNumber: error.line + 1,
    column: error.column + 1
  };

  // Reveal the position in the editor
  editor.revealPositionInCenter(position);
  
  // Set cursor at the error position
  editor.setPosition(position);
  
  // Focus the editor
  editor.focus();
}
