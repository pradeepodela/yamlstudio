import Validator from 'yaml-validator';
import * as yaml from 'js-yaml';
import { debounce } from 'lodash';

export type ErrorSeverity = 'error' | 'warning' | 'info';
export type ErrorType = 'syntax' | 'schema' | 'format';

export interface Position {
  line: number;
  column: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: ErrorSeverity;
  type: ErrorType;
  suggestion?: string;
  range?: Range;
  code?: string;
  source?: string;
  details?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
  lineNumber?: number;
  column?: number;
  details?: string;
  severity?: ErrorSeverity;
  path?: string[];
  suggestion?: string;
}

// Schema types supported by the validator
export type SchemaType = 'openapi' | 'kubernetes' | 'docker-compose' | 'custom';

// Track validation results separately
const warnings: ValidationError[] = [];
const errors: ValidationError[] = [];
const infos: ValidationError[] = [];

// Create validator instance with OpenAPI schema
const validator = new Validator({
  log: false,
  structure: true,
  onWarning: (warning: string) => {
    warnings.push({
      line: 0,
      column: 0,
      message: warning,
      severity: 'warning',
      type: 'schema'
    });
  },
  schema: {
    openapi: { type: 'string', required: false },
    swagger: { type: 'string', required: false },
    info: {
      type: 'object',
      required: true,
      schema: {
        title: { type: 'string', required: true },
        version: { type: 'string', required: true },
        description: { type: 'string', required: false }
      }
    },
    servers: {
      type: 'array',
      required: false,
      schema: {
        url: { type: 'string', required: true },
        description: { type: 'string', required: false }
      }
    },
    paths: { 
      type: 'object',
      required: true,
      schema: {
        '*': { // Wildcard for any path
          type: 'object',
          schema: {
            get: { type: 'object', required: false },
            post: { type: 'object', required: false },
            put: { type: 'object', required: false },
            delete: { type: 'object', required: false },
            patch: { type: 'object', required: false }
          }
        }
      }
    },
    components: {
      type: 'object',
      required: false,
      schema: {
        schemas: { type: 'object', required: false },
        securitySchemes: { type: 'object', required: false }
      }
    },
    security: { type: 'array', required: false }
  }
});

// Interface for yaml-load error type
interface YamlError extends Error {
  mark?: {
    line: number;
    column: number;
  };
}

// Debounced validation function to avoid performance issues
export const debouncedValidate = debounce((yamlContent: string) => validateYaml(yamlContent), 300);

export const validateYaml = (yamlContent: string): ValidationResult => {
  // Clear previous validation results
  errors.length = 0;
  warnings.length = 0;
  infos.length = 0;

  if (!yamlContent.trim()) {
    const error: ValidationError = {
      line: 0,
      column: 0,
      message: 'YAML content cannot be empty',
      severity: 'error',
      type: 'syntax',
      suggestion: 'Add some YAML content to get started'
    };
    errors.push(error);
    return {
      isValid: false,
      error: error.message,
      errors,
      warnings,
      infos,
      severity: 'error',
      suggestion: error.suggestion
    };
  }

  try {
    // First try to parse with js-yaml to get detailed syntax errors
    try {
      yaml.load(yamlContent);
    } catch (error: unknown) {
      const yamlError = error as YamlError;
      const validationError: ValidationError = {
        line: yamlError.mark?.line || 0,
        column: yamlError.mark?.column || 0,
        message: 'YAML Syntax Error',
        severity: 'error',
        type: 'syntax',
        details: yamlError.message,
        suggestion: getSyntaxErrorSuggestion(yamlError.message)
      };
      errors.push(validationError);
      return {
        isValid: false,
        errors,
        warnings,
        infos,
        error: validationError.message,
        details: yamlError.message,
        lineNumber: validationError.line,
        column: validationError.column,
        severity: 'error',
        suggestion: validationError.suggestion
      };
    }

    // Then validate against our schema
    validator.validate([yamlContent]);

    // If we have warnings but no errors
    if (warnings.length > 0 && errors.length === 0) {
      return {
        isValid: true,
        errors,
        warnings,
        infos,
        severity: 'warning',
        suggestion: 'Your YAML is valid but could be improved'
      };
    }

    // Add info level validation for successful validation
    infos.push({
      line: 0,
      column: 0,
      message: 'YAML is valid',
      severity: 'info',
      type: 'format'
    });

    return { 
      isValid: true,
      errors,
      warnings,
      infos,
      severity: 'info'
    };

  } catch (error: unknown) {
    const validationError: ValidationError = {
      line: 0,
      column: 0,
      message: 'OpenAPI Schema Validation Error',
      severity: 'error',
      type: 'schema',
      details: error instanceof Error ? error.message : String(error)
    };

    if (error instanceof Error) {
      const details = error.message;
      
      // Try to extract line and column information
      const match = details.match(/line (\d+), column (\d+)/);
      if (match) {
        validationError.line = parseInt(match[1], 10);
        validationError.column = parseInt(match[2], 10);
      }

      // Try to extract path information
      const pathMatch = details.match(/at path "([^"]+)"/);
      if (pathMatch) {
        validationError.source = pathMatch[1];
      }

      // Add suggestion
      validationError.suggestion = getSchemaErrorSuggestion(details);
    }

    errors.push(validationError);
    return {
      isValid: false,
      errors,
      warnings,
      infos,
      error: validationError.message,
      lineNumber: validationError.line,
      column: validationError.column,
      details: validationError.details,
      severity: 'error',
      path: validationError.source?.split('.'),
      suggestion: validationError.suggestion
    };
  }
};

// Helper function to provide suggestions for syntax errors
function getSyntaxErrorSuggestion(error: string): string {
  if (error.includes('end of the stream')) {
    return 'Check for missing closing brackets or quotes';
  }
  if (error.includes('duplicate key')) {
    return 'Remove or rename the duplicate property';
  }
  if (error.includes('bad indentation')) {
    return 'Fix indentation - use 2 spaces per level';
  }
  if (error.includes('tab characters')) {
    return 'Replace tabs with spaces for indentation';
  }
  if (error.includes('flow map')) {
    return 'Check your YAML structure - make sure objects are properly formatted';
  }
  if (error.includes('trailing comma')) {
    return 'Remove trailing comma - YAML does not support trailing commas';
  }
  return 'Check your YAML syntax against the OpenAPI specification';
}

// Helper function to provide suggestions for schema errors
function getSchemaErrorSuggestion(error: string): string {
  if (error.includes('required property')) {
    return 'Add the missing required property';
  }
  if (error.includes('invalid type')) {
    return 'Correct the property type according to the OpenAPI schema';
  }
  if (error.includes('paths')) {
    return 'Every API needs at least one path - add an endpoint';
  }
  if (error.includes('info')) {
    return 'Add API information including title and version';
  }
  if (error.includes('additionalProperty')) {
    return 'Remove unknown property - it is not defined in the schema';
  }
  if (error.includes('enum')) {
    return 'Use one of the allowed values for this field';
  }
  return 'Validate your schema against the OpenAPI specification';
}
