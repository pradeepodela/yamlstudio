import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import { dump, load } from 'js-yaml';
import { ValidationError } from '@/utils/yamlValidator';

// Initialize Monaco loader
loader.config({ monaco });

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
      
      let content = `**${marker.source || 'YAML Validator'}**: ${marker.message}`;
      
      // Add details and documentation if available
      if (marker.relatedInformation?.length) {
        content += `\n\n**Details:**\n${marker.relatedInformation[0].message}`;
      }
      
      // Check if the message contains a suggestion (we append suggestions to the message in editorHelpers.ts)
      const suggestionMatch = marker.message.match(/Suggestion: (.*)/);
      if (suggestionMatch) {
        // Extract the message and suggestion
        const message = marker.message.replace(/\nSuggestion: .*/, '');
        const suggestion = suggestionMatch[1];
        
        content = `**${marker.source || 'YAML Validator'}**: ${message}  \n\n**Suggestion**: ${suggestion}`;
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
    context.markers.forEach(marker => {
      // Handle different types of errors
      const errorMessage = marker.message.toLowerCase();
      let quickFix: monaco.languages.CodeAction | null = null;
      
      // Extract suggestion from message if present
      const suggestionMatch = marker.message.match(/Suggestion: (.*)/);
      
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
            };
          }
        }
      } else if (suggestionMatch) {
        // Generic fix based on suggestion
        const suggestion = suggestionMatch[1];
        
        quickFix = {
          title: `Fix: ${suggestion}`,
          kind: 'quickfix',
          diagnostics: [marker],
          isPreferred: false,
          // This is a generic action that doesn't provide a concrete edit
          command: {
            id: 'yaml.showSuggestion',
            title: suggestion,
            arguments: [suggestion]
          }
        };
      }
      
      if (quickFix) {
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
      [/^(\s*)([\w\-_]+)(:)(\s*)(.+)?/, ['white', 'variable', 'delimiter', 'white', 'string']],
      // Arrays
      [/^(\s*)(-\s)(.+)/, ['white', 'delimiter', 'string']],
      // Comments
      [/#.*$/, 'comment'],
      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
      [/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-terminated string
      [/"/, 'string', '@string."'],
      [/'/, 'string', '@string.\''],
      // Numbers
      [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
      [/0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/\d+/, 'number'],
      // Booleans
      [/\b(true|false)\b/, 'keyword'],
      // Null
      [/\b(null)\b/, 'keyword'],
    ],
    string: [
      [/[^\\"']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/["']/, { cases: {
        '$#==$S2': { token: 'string', next: '@pop' },
        '@default': 'string'
      }}]
    ]
  }
});

// Configure YAML language feature defaults
monaco.languages.setLanguageConfiguration('yaml', {
  comments: {
    lineComment: '#'
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: '\'', close: '\'' }
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: '\'', close: '\'' }
  ],
  folding: {
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
