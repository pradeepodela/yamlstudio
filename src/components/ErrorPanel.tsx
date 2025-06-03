import React from 'react';
import { ValidationError } from '@/utils/yamlValidator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  XCircle, 
  ChevronRight, 
  ChevronDown 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ErrorPanelProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
  onErrorClick?: (error: ValidationError) => void;
  className?: string;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({
  errors,
  warnings,
  infos,
  onErrorClick,
  className = ''
}) => {
  const [expandedGroups, setExpandedGroups] = React.useState<Record<string, boolean>>({
    errors: true,
    warnings: true,
    infos: false
  });

  const totalIssues = errors.length + warnings.length + infos.length;

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />;
      default:
        return <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />;
    }
  };

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-background", className)}>
      <div className="p-2 bg-muted/50 border-b flex items-center justify-between">
        <h3 className="text-sm font-medium">Problems ({totalIssues})</h3>
      </div>

      <ScrollArea className="h-[200px]">
        <div className="p-2">
          {/* Errors Group */}
          {errors.length > 0 && (
            <Collapsible 
              open={expandedGroups.errors} 
              onOpenChange={() => toggleGroup('errors')}
              className="mb-2"
            >
              <CollapsibleTrigger className="flex items-center w-full text-left p-1 hover:bg-muted/30 rounded">
                {expandedGroups.errors ? 
                  <ChevronDown className="h-4 w-4 mr-1" /> : 
                  <ChevronRight className="h-4 w-4 mr-1" />}
                <span className="text-sm font-medium">Errors ({errors.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {errors.map((error, index) => (
                  <div 
                    key={`error-${index}`}
                    className="flex items-start p-2 text-xs hover:bg-muted/30 rounded cursor-pointer ml-4"
                    onClick={() => onErrorClick && onErrorClick(error)}
                  >
                    {getSeverityIcon('error')}
                    <div>
                      <div className="font-medium">{error.message}</div>
                      <div className="text-muted-foreground mt-1">
                        Line {error.line + 1}, Column {error.column + 1}
                      </div>
                      {error.suggestion && (
                        <div className="mt-1 text-green-600 dark:text-green-400">
                          Suggestion: {error.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Warnings Group */}
          {warnings.length > 0 && (
            <Collapsible 
              open={expandedGroups.warnings} 
              onOpenChange={() => toggleGroup('warnings')}
              className="mb-2"
            >
              <CollapsibleTrigger className="flex items-center w-full text-left p-1 hover:bg-muted/30 rounded">
                {expandedGroups.warnings ? 
                  <ChevronDown className="h-4 w-4 mr-1" /> : 
                  <ChevronRight className="h-4 w-4 mr-1" />}
                <span className="text-sm font-medium">Warnings ({warnings.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {warnings.map((warning, index) => (
                  <div 
                    key={`warning-${index}`}
                    className="flex items-start p-2 text-xs hover:bg-muted/30 rounded cursor-pointer ml-4"
                    onClick={() => onErrorClick && onErrorClick(warning)}
                  >
                    {getSeverityIcon('warning')}
                    <div>
                      <div className="font-medium">{warning.message}</div>
                      {warning.line > 0 && (
                        <div className="text-muted-foreground mt-1">
                          Line {warning.line + 1}, Column {warning.column + 1}
                        </div>
                      )}
                      {warning.suggestion && (
                        <div className="mt-1 text-yellow-600 dark:text-yellow-400">
                          Suggestion: {warning.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Info Group */}
          {infos.length > 0 && (
            <Collapsible 
              open={expandedGroups.infos} 
              onOpenChange={() => toggleGroup('infos')}
            >
              <CollapsibleTrigger className="flex items-center w-full text-left p-1 hover:bg-muted/30 rounded">
                {expandedGroups.infos ? 
                  <ChevronDown className="h-4 w-4 mr-1" /> : 
                  <ChevronRight className="h-4 w-4 mr-1" />}
                <span className="text-sm font-medium">Information ({infos.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {infos.map((info, index) => (
                  <div 
                    key={`info-${index}`}
                    className="flex items-start p-2 text-xs hover:bg-muted/30 rounded cursor-pointer ml-4"
                    onClick={() => onErrorClick && onErrorClick(info)}
                  >
                    {getSeverityIcon('info')}
                    <div>
                      <div className="font-medium">{info.message}</div>
                      {info.line > 0 && (
                        <div className="text-muted-foreground mt-1">
                          Line {info.line + 1}, Column {info.column + 1}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {totalIssues === 0 && (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No problems found in your YAML
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
