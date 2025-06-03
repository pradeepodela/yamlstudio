import * as monaco from 'monaco-editor';
import { dump, load } from 'js-yaml';

// YAML formatting function
async function formatYaml(text: string): Promise<string> {
  try {
    const parsed = load(text);
    return dump(parsed, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
  } catch (error) {
    console.error('Error formatting YAML:', error);
    return text;
  }
}

// Define YAML specific diagnostic types
monaco.languages.registerHoverProvider('yaml', {
  provideHover: (model, position) => {
    // Get markers at the current position
    const markers = monaco.editor.getModelMarkers({ resource: model.uri })
      .filter(marker => 
        marker.startLineNumber <= position.lineNumber && 
        marker.endLineNumber >= position.lineNumber &&
        marker.startColumn <= position.column &&
        marker.endColumn >= position.column
      );
    
    if (markers.length === 0) return null;
    
    // Create hover content from markers
    const contents = markers.map(marker => {
      const severityClass = 
        marker.severity === monaco.MarkerSeverity.Error ? 'error' :
        marker.severity === monaco.MarkerSeverity.Warning ? 'warning' : 'info';
      
      const severityIcon = 
        marker.severity === monaco.MarkerSeverity.Error ? '🔴 ' :
        marker.severity === monaco.MarkerSeverity.Warning ? '⚠️ ' : 'ℹ️ ';
      
      let content = `${severityIcon} **${severityClass.toUpperCase()}**: ${marker.message}`;
      
      // Add timestamp to error message to help identify when it was generated
      content += `\n\n**Error detected at**: ${new Date().toLocaleTimeString()}`;
      
      // Add location information with enhanced explanation
      content += `\n\n**Location**: Line ${marker.startLineNumber}`;
      if (marker.startColumn && marker.endColumn) {
        content += `, Column ${marker.startColumn}-${marker.endColumn} (characters from left)`;
      }
      
      // Enhanced context visualization with line numbers
      const contextLines = [];
      // Get a few lines before and after for context
      const startLine = Math.max(1, marker.startLineNumber - 2);
      const endLine = Math.min(model.getLineCount(), marker.startLineNumber + 2);
      
      for (let i = startLine; i <= endLine; i++) {
        const lineContent = model.getLineContent(i);
        const lineNumber = String(i).padStart(2, ' ');
        contextLines.push(`${lineNumber} | ${lineContent}`);
      }
      
      content += `\n\n\`\`\`yaml\n${contextLines.join('\n')}\n\`\`\``;
      
      // Create clear pointer to highlight the error position with column numbers
      if (marker.startLineNumber >= startLine && marker.startLineNumber <= endLine) {
        const lineIdx = marker.startLineNumber - startLine;
        const linePrefix = '   | '; // Matches the line number width + separator
        const pointerLine = ' '.repeat(marker.startColumn - 1 + linePrefix.length) + 
                           '^'.repeat(Math.max(1, marker.endColumn - marker.startColumn));
        
        // Add column numbers under the pointer for better clarity
        let columnMarkers = '';
        if (marker.endColumn - marker.startColumn > 3) {
          columnMarkers = ' '.repeat(marker.startColumn - 1 + linePrefix.length) + 
                         marker.startColumn + 
                         ' '.repeat(Math.max(0, marker.endColumn - marker.startColumn - String(marker.startColumn).length - 1)) + 
                         marker.endColumn;
        }
        
        content += `\n\`\`\`\n${pointerLine}\n${columnMarkers ? columnMarkers + '\n' : ''}\`\`\``;
      }
      
      // Add specific indentation error explanation
      if (marker.message.toLowerCase().includes('indentation')) {
        const lineContent = model.getLineContent(marker.startLineNumber);
        const currentIndent = lineContent.length - lineContent.trimStart().length;
        
        content += `\n\n**Indentation Details**:`;
        content += `\n- Current indentation: ${currentIndent} spaces`;
        
        // Try to extract expected indentation from error message
        const indentMatch = marker.message.match(/expected (\d+) spaces/i) || 
                           marker.message.match(/indent of (\d+)/i);
        if (indentMatch) {
          const expectedIndent = parseInt(indentMatch[1]);
          content += `\n- Expected indentation: ${expectedIndent} spaces`;
          content += `\n- Difference: ${expectedIndent > currentIndent ? 'Add' : 'Remove'} ${Math.abs(expectedIndent - currentIndent)} spaces`;
        }
      }
      
      // Add details and documentation if available
      if (marker.relatedInformation?.length) {
        content += `\n\n**Details:**\n${marker.relatedInformation[0].message}`;
      }
      
      // Add suggested fix hint if applicable
      if (marker.severity === monaco.MarkerSeverity.Error || 
          marker.severity === monaco.MarkerSeverity.Warning) {
        content += '\n\n**Tip**: Hover over the error and press Ctrl+. to see available quick fixes';
      }
      
      return { 
        value: content,
        isTrusted: true
      };
    });
    
    return {
      range: {
        startLineNumber: markers[0].startLineNumber,
        startColumn: markers[0].startColumn,
        endLineNumber: markers[0].endLineNumber,
        endColumn: markers[0].endColumn
      },
      contents
    };
  }
});

// Setup Monaco's YAML language features
monaco.languages.register({ id: 'yaml' });

// Add model change handler to revalidate and clear errors
monaco.editor.onDidCreateModel((model) => {
  if (model.getLanguageId() === 'yaml') {
    // Initial validation
    validateYamlContent(model);
    
    // Set up change listener
    model.onDidChangeContent((e) => {
      // Debounce validation to avoid excessive processing
      clearTimeout((model as any)._yamlValidationTimeout);
      (model as any)._yamlValidationTimeout = setTimeout(() => {
        validateYamlContent(model);
      }, 500);
    });
  }
});

// YAML validation function
function validateYamlContent(model: monaco.editor.ITextModel) {
  try {
    // Try to parse the YAML to see if it's valid
    const content = model.getValue();
    load(content);
    
    // If we get here, YAML is valid - clear all markers
    monaco.editor.setModelMarkers(model, 'yaml-validator', []);
  } catch (error: any) {
    // Process error to extract line/column information
    const errorMsg = error.message || String(error);
    
    // Create marker based on error information
    const markers: monaco.editor.IMarkerData[] = [];
    
    // Try to extract line and column from various error message formats
    let line = 1;
    let column = 1;
    
    // Match patterns like "line 5, column 10" or "at line 5, column 10"
    const standardMatch = errorMsg.match(/(?:at\s+)?line\s+(\d+),?\s+column\s+(\d+)/i);
    
    // Match patterns like "(5:10)" or "position 5:10"
    const positionMatch = errorMsg.match(/(?:position\s+)?(?:\()?(\d+):(\d+)(?:\))?/i);
    
    // Match line only like "line 5"
    const lineOnlyMatch = errorMsg.match(/line\s+(\d+)/i);
    
    if (standardMatch) {
      line = parseInt(standardMatch[1]);
      column = parseInt(standardMatch[2]);
    } else if (positionMatch) {
      line = parseInt(positionMatch[1]);
      column = parseInt(positionMatch[2]);
    } else if (lineOnlyMatch) {
      line = parseInt(lineOnlyMatch[1]);
      // Try to find the problem in this line by searching for indentation or common issues
      const lineContent = model.getLineContent(line);
      
      // Check if it's likely an indentation issue
      if (errorMsg.toLowerCase().includes('indent') || errorMsg.toLowerCase().includes('mapping')) {
        // For indentation issues, mark from the start of the line to the first non-whitespace
        const firstNonWhitespace = lineContent.search(/\S/);
        if (firstNonWhitespace !== -1) {
          column = firstNonWhitespace + 1;
        }
      } else {
        // For other issues, try to find problematic characters
        const problematicCharIndex = lineContent.search(/[:"'{}[\]\\]/);
        if (problematicCharIndex !== -1) {
          column = problematicCharIndex + 1;
        }
      }
    }
    
    // Ensure line and column are within valid range
    line = Math.max(1, Math.min(line, model.getLineCount()));
    const maxColumn = model.getLineMaxColumn(line);
    column = Math.max(1, Math.min(column, maxColumn));
    
    // Create a more specific range if possible
    const lineContent = model.getLineContent(line);
    let endColumn = column + 1;
    
    // Try to determine the relevant token length
    if (column < maxColumn) {
      // If it's a key issue, select to the colon
      const colonIndex = lineContent.indexOf(':', column - 1);
      if (colonIndex !== -1 && colonIndex < column + 20) {
        endColumn = colonIndex + 2;
      } 
      // If it's a string issue, select to the end of the string
      else if (lineContent[column-1] === '"' || lineContent[column-1] === "'") {
        const stringEnd = lineContent.indexOf(lineContent[column-1], column);
        if (stringEnd !== -1) {
          endColumn = stringEnd + 2;
        } else {
          endColumn = maxColumn;
        }
      }
      // If it's an indentation issue, select to the first non-whitespace
      else if (errorMsg.toLowerCase().includes('indent')) {
        const firstNonWhitespace = lineContent.search(/\S/);
        if (firstNonWhitespace !== -1) {
          column = 1; // Start from beginning of line
          endColumn = firstNonWhitespace + 2;
        }
      } 
      // Otherwise, select the word at the position
      else {
        const wordMatch = lineContent.substr(column - 1).match(/^\w+/);
        if (wordMatch) {
          endColumn = column + wordMatch[0].length;
        }
      }
    }
    
    markers.push({
      severity: monaco.MarkerSeverity.Error,
      message: errorMsg,
      startLineNumber: line,
      endLineNumber: line,
      startColumn: column,
      endColumn: endColumn,
      source: 'YAML Validator'
    });
    
    monaco.editor.setModelMarkers(model, 'yaml-validator', markers);
  }
}

// Add YAML formatting provider
monaco.languages.registerDocumentFormattingEditProvider('yaml', {
  async provideDocumentFormattingEdits(model) {
    const text = model.getValue();
    try {
      const formatted = await formatYaml(text);
      return [{
        range: model.getFullModelRange(),
        text: formatted,
      }];
    } catch (error) {
      console.error('YAML formatting error:', error);
      return [];
    }
  }
});

// Add code action provider for quick fixes
monaco.languages.registerCodeActionProvider('yaml', {
  provideCodeActions: (model, range, context) => {
    const actions: monaco.languages.CodeAction[] = [];
    
    // Process marker-based code actions
    context.markers.forEach(marker => {      // Handle different types of errors
      const errorMessage = marker.message.toLowerCase();
      let quickFix: monaco.languages.CodeAction | null = null;
      
      // Common YAML error patterns and their fixes
      if (errorMessage.includes('unexpected end of file') || errorMessage.includes('expected closing bracket')) {
        // Handle missing closing bracket
        quickFix = {
          title: 'Add missing closing bracket',
          kind: 'quickfix',
          diagnostics: [marker],
          isPreferred: true,
          edit: {
            edits: [{
              resource: model.uri,
              textEdit: {
                range: {
                  startLineNumber: marker.startLineNumber,
                  startColumn: model.getLineMaxColumn(marker.startLineNumber),
                  endLineNumber: marker.startLineNumber,
                  endColumn: model.getLineMaxColumn(marker.startLineNumber)
                },
                text: ' }' // Add closing bracket
              }
            }]
          }
        };
      } else if (errorMessage.includes('incorrect indentation')) {
        // Handle indentation errors
        const indentMatch = errorMessage.match(/expected (\d+) spaces/i);
        if (indentMatch) {
          const expectedSpaces = parseInt(indentMatch[1]);
          const lineContent = model.getLineContent(marker.startLineNumber);
          const currentIndent = lineContent.length - lineContent.trimStart().length;
          const indentDiff = expectedSpaces - currentIndent;
          
          if (indentDiff !== 0) {
            const spaces = indentDiff > 0 ? ' '.repeat(Math.abs(indentDiff)) : '';
            const newLine = indentDiff > 0 
              ? spaces + lineContent
              : lineContent.substring(Math.abs(indentDiff));
              
            quickFix = {
              title: `Fix indentation (${expectedSpaces} spaces)`,
              kind: 'quickfix',
              diagnostics: [marker],
              isPreferred: true,
              edit: {
                edits: [{
                  resource: model.uri,
                  textEdit: {
                    range: {
                      startLineNumber: marker.startLineNumber,
                      startColumn: 1,
                      endLineNumber: marker.startLineNumber,
                      endColumn: lineContent.length + 1
                    },
                    text: newLine
                  }
                }]
              }
            };
          }
        }
      } else if (errorMessage.includes('duplicate key')) {
        // Extract the duplicate key name
        const keyMatch = errorMessage.match(/duplicate key '([^']+)'/i);
        if (keyMatch) {
          const duplicateKey = keyMatch[1];
          // Suggest renaming the duplicate key
          quickFix = {
            title: `Rename duplicate key '${duplicateKey}'`,
            kind: 'quickfix',
            diagnostics: [marker],
            isPreferred: true,
            edit: {
              edits: [{
                resource: model.uri,
                textEdit: {
                  range: {
                    startLineNumber: marker.startLineNumber,
                    startColumn: marker.startColumn,
                    endLineNumber: marker.startLineNumber,
                    endColumn: marker.startColumn + duplicateKey.length
                  },
                  text: `${duplicateKey}_renamed`
                }
              }]
            }
          };
        }
      } else if (errorMessage.includes('missing required field')) {
        // Extract required field name
        const fieldMatch = errorMessage.match(/missing required field '([^']+)'/i);
        if (fieldMatch) {
          const fieldName = fieldMatch[1];
          const parentMatch = errorMessage.match(/in '([^']+)'/i);
          const parent = parentMatch ? parentMatch[1] : '';
          
          // Get indentation from the current line
          const lineContent = model.getLineContent(marker.startLineNumber);
          const currentIndent = lineContent.length - lineContent.trimStart().length;
          const childIndent = ' '.repeat(currentIndent + 2); // 2 additional spaces for child indentation
          
          quickFix = {
            title: `Add required field '${fieldName}'`,
            kind: 'quickfix',
            diagnostics: [marker],
            isPreferred: true,
            edit: {
              edits: [{
                resource: model.uri,
                textEdit: {
                  range: {
                    startLineNumber: marker.startLineNumber,
                    startColumn: model.getLineMaxColumn(marker.startLineNumber),
                    endLineNumber: marker.startLineNumber,
                    endColumn: model.getLineMaxColumn(marker.startLineNumber)
                  },
                  text: `\n${childIndent}${fieldName}: ` // Add field with proper indentation
                }
              }]
            }
          };
        }
      } else if (errorMessage.includes('type mismatch') || errorMessage.includes('should be a number')) {
        // Handle type conversion errors
        if (marker.startLineNumber && marker.startColumn && marker.endColumn) {
          const lineContent = model.getLineContent(marker.startLineNumber);
          const valueText = lineContent.substring(marker.startColumn - 1, marker.endColumn - 1);
          
          // Extract the quoted value
          const quotedMatch = valueText.match(/["']([^"']*)["']/);
          if (quotedMatch) {
            const value = quotedMatch[1];
            // Remove quotes if it should be a number
            quickFix = {
              title: 'Convert to number',
              kind: 'quickfix',
              diagnostics: [marker],
              isPreferred: true,
              edit: {
                edits: [{
                  resource: model.uri,
                  textEdit: {
                    range: {
                      startLineNumber: marker.startLineNumber,
                      startColumn: marker.startColumn,
                      endLineNumber: marker.startLineNumber,
                      endColumn: marker.endColumn
                    },
                    text: value // Remove quotes
                  }
                }]
              }
            };          }
        }
      }
      
      if (quickFix) {
        // Add callback to validate and clear errors after applying the fix
        const originalRun = quickFix.command?.run;
        quickFix.command = {
          id: 'yaml.applyFix',
          title: quickFix.title,
          run: (...args) => {
            if (originalRun) {
              originalRun(...args);
            }
            // Re-validate after a short delay to allow the edit to be applied
            setTimeout(() => {
              validateYamlContent(model);
            }, 100);
          }
        };
        actions.push(quickFix);
      }
    });
    
    return {
      actions,
      dispose: () => {}
    };
  }
});

// Configure YAML language defaults
monaco.languages.setMonarchTokensProvider('yaml', {
  defaultToken: '',
  tokenPostfix: '.yaml',

  // Escapes
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  // The main tokenizer
  tokenizer: {
    root: [
      // Keys
      [/^(\s*)([\w\-_\.\/]+)(:)(\s*)(.+)?/, ['white', 'variable', 'delimiter', 'white', 'string']],
      // Arrays
      [/^(\s*)(-\s)(.+)?/, ['white', 'delimiter', 'string']],
      // Comments
      [/#.*$/, 'comment'],
      // Multi-line strings with indicators
      [/^(\s*)([\w\-_\.\/]+)(:)(\s*)(>|[|])(\s*)$/, ['white', 'variable', 'delimiter', 'white', 'string', 'white']],
      // Special keywords { open: '\'', close: '\'' }
      [/\b(true|false|null|undefined|NaN|Infinity)\b/, 'keyword'],  ],



























































});    { open: '"', close: '"' },    { open: '(', close: ')' },    { open: '[', close: ']' },    { open: '{', close: '}' },  surroundingPairs: [  ],    { open: '\'', close: '\'' }    { open: '"', close: '"' },    { open: '(', close: ')' },    { open: '[', close: ']' },    { open: '{', close: '}' },  autoClosingPairs: [  ],    ['(', ')']    ['[', ']'],    ['{', '}'],  brackets: [  },    lineComment: '#'  comments: {monaco.languages.setLanguageConfiguration('yaml', {// Configure YAML language feature defaults});  }    ]      }}]        '@default': 'string'        '$#==$S2': { token: 'string', next: '@pop' },      [/["']/, { cases: {      [/\\./, 'string.escape.invalid'],      [/@escapes/, 'string.escape'],      [/[^\\"']+/, 'string'],    string: [    ],      [/(![\w\d\/]+)/, 'tag'],      [/(!![\w\d\/]+)/, 'tag'],      // Tags      [/(\*[\w\d]+)/, 'tag'],      [/(&[\w\d]+)/, 'tag'],      // Anchors and aliases      [/^\.\.\.$/, 'delimiter.yaml'],      [/^---$/, 'delimiter.yaml'],      // Document separators      [/\b(https?:\/\/[\w\d\.\-\/]+)\b/, 'string.link'],      // URL-like patterns       [/\b0b[01]+\b/, 'number.binary'],      [/\b0o[0-7]+\b/, 'number.octal'],      [/\b0x[\da-fA-F]+\b/, 'number.hex'],      [/\b\d+\b/, 'number'],      [/\b\d+\.[\w\d_]*\b/, 'number.float'],      // Numbers      [/'/, 'string', '@string.\''],      [/"/, 'string', '@string."'],      [/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-terminated string      [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-terminated string      // Strings  folding: {
    markers: {
      start: new RegExp('^\\s*#\\s*region\\b'),
      end: new RegExp('^\\s*#\\s*endregion\\b')
    }
  },
  // Indentation rules
  indentationRules: {
    increaseIndentPattern: /^.*:\s*$/,
    decreaseIndentPattern: /^\s*-\s*$/
  }
});
