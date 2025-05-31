import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, FileText, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '../utils/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface YamlPreviewProps {
  spec: any;
}

const YamlPreview: React.FC<YamlPreviewProps> = ({ spec }) => {
  const { user } = useAuth();
  
  const generateYaml = (obj: any, indent = 0): string => {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += generateYaml(value, indent + 1);
      } else if (Array.isArray(value)) {
        if (value.length === 0) continue;
        yaml += `${spaces}${key}:\n`;
        value.forEach((item) => {
          if (typeof item === 'object') {
            yaml += `${spaces}- `;
            const itemYaml = generateYaml(item, indent + 1);
            // Handle first line differently for array items
            const lines = itemYaml.split('\n');
            yaml += lines[0].trim() + '\n';
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                yaml += `${spaces}  ${lines[i].trim()}\n`;
              }
            }
          } else {
            yaml += `${spaces}- ${item}\n`;
          }
        });
      } else {
        // Handle special cases for YAML formatting
        if (typeof value === 'string' && (value.includes(':') || value.includes('\n') || value.includes("'"))) {
          yaml += `${spaces}${key}: "${value.replace(/"/g, '\\"')}"\n`;
        } else {
          yaml += `${spaces}${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}\n`;
        }
      }
    }

    return yaml;
  };

  // Enhanced YAML generation with proper structure
  const generateProperYaml = (spec: any): string => {
    let yaml = `openapi: ${spec.openapi || '3.0.0'}\n`;
    
    // Info section
    if (spec.info) {
      yaml += 'info:\n';
      if (spec.info.title) yaml += `  title: ${spec.info.title}\n`;
      if (spec.info.description) yaml += `  description: ${spec.info.description}\n`;
      if (spec.info.version) yaml += `  version: ${spec.info.version}\n`;
      if (spec.info.contact) {
        yaml += '  contact:\n';
        if (spec.info.contact.name) yaml += `    name: ${spec.info.contact.name}\n`;
        if (spec.info.contact.email) yaml += `    email: ${spec.info.contact.email}\n`;
        if (spec.info.contact.url) yaml += `    url: ${spec.info.contact.url}\n`;
      }
    }

    // Servers section
    if (spec.servers && spec.servers.length > 0) {
      yaml += 'servers:\n';
      spec.servers.forEach((server: any) => {
        yaml += `- url: ${server.url}\n`;
        if (server.description) yaml += `  description: ${server.description}\n`;
      });
    }

    // Paths section
    if (spec.paths && Object.keys(spec.paths).length > 0) {
      yaml += 'paths:\n';
      Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
        yaml += `  ${path}:\n`;
        Object.entries(methods).forEach(([method, operation]: [string, any]) => {
          yaml += `    ${method}:\n`;
          if (operation.summary) yaml += `      summary: ${operation.summary}\n`;
          if (operation.description) yaml += `      description: ${operation.description}\n`;
          if (operation.operationId) yaml += `      operationId: ${operation.operationId}\n`;
          
          if (operation.tags && operation.tags.length > 0) {
            yaml += '      tags:\n';
            operation.tags.forEach((tag: string) => {
              yaml += `      - ${tag}\n`;
            });
          }

          if (operation.security && operation.security.length > 0) {
            yaml += '      security:\n';
            operation.security.forEach((sec: any) => {
              yaml += '      - ';
              Object.entries(sec).forEach(([schemeName, scopes]: [string, any], index) => {
                if (index > 0) yaml += '        ';
                yaml += `${schemeName}: `;
                if (Array.isArray(scopes) && scopes.length > 0) {
                  yaml += `[ '${scopes.join("', '")}' ]\n`;
                } else {
                  yaml += '[]\n';
                }
              });
            });
          }

          if (operation.parameters && operation.parameters.length > 0) {
            yaml += '      parameters:\n';
            operation.parameters.forEach((param: any) => {
              yaml += '      - name: ' + param.name + '\n';
              yaml += '        in: ' + param.in + '\n';
              if (param.required) yaml += '        required: true\n';
              if (param.description) yaml += '        description: ' + param.description + '\n';
              if (param['x-zia-agent-param-type']) yaml += '        x-zia-agent-param-type: ' + param['x-zia-agent-param-type'] + '\n';
              if (param.schema) {
                yaml += '        schema:\n';
                yaml += '          type: ' + param.schema.type + '\n';
              }
            });
          }          if (operation.requestBody) {            yaml = yaml + '      requestBody:\n';
            if (operation.requestBody.required) yaml = yaml + '        required: true\n';
            yaml = yaml + '        content:\n';
            yaml = yaml + '          application/json:\n';            yaml = yaml + '            schema:\n';
            const schema = operation.requestBody.content?.['application/json']?.schema;
            if (schema?.$ref) {
              yaml = yaml + `              $ref: '${schema.$ref}'\n`;
            } else {
              yaml = yaml + '              type: object\n';
            }
            yaml = yaml + '            x-zia-agent-param-type: dynamic\n';
          }

          if (operation.responses && operation.responses.length > 0) {
            yaml += '      responses:\n';
            operation.responses.forEach((response: any) => {
              yaml += `        '${response.statusCode}':\n`;
              yaml += `          description: ${response.description}\n`;
              if (response.content?.['application/json']?.schema) {
                yaml += '          content:\n';
                yaml += '            application/json:\n';
                yaml += '              schema:\n';
                if (response.content['application/json'].schema.$ref) {
                  yaml += `                $ref: '${response.content['application/json'].schema.$ref}'\n`;
                } else {
                  yaml += `                type: ${response.content['application/json'].schema.type || 'object'}\n`;
                }
              }
            });
          }
        });
      });
    }

    // Components section
    if (spec.components) {
      yaml += 'components:\n';
      
      if (spec.components.schemas && Object.keys(spec.components.schemas).length > 0) {
        yaml += '  schemas:\n';
        Object.entries(spec.components.schemas).forEach(([schemaName, schema]: [string, any]) => {
          yaml += `    ${schemaName}:\n`;
          yaml += `      type: ${schema.type}\n`;
          if (schema.properties && Object.keys(schema.properties).length > 0) {
            yaml += '      properties:\n';
            Object.entries(schema.properties).forEach(([propName, prop]: [string, any]) => {
              yaml += `        ${propName}:\n`;
              yaml += `          type: ${prop.type}\n`;
              if (prop.description) yaml += `          description: ${prop.description}\n`;
              if (prop['x-zia-agent-param-type']) yaml += `          x-zia-agent-param-type: ${prop['x-zia-agent-param-type']}\n`;
            });
          }
          if (schema.required && schema.required.length > 0) {
            yaml += '      required:\n';
            schema.required.forEach((req: string) => {
              yaml += `      - ${req}\n`;
            });
          }
        });
      }

      if (spec.components.securitySchemes && Object.keys(spec.components.securitySchemes).length > 0) {
        yaml += '  securitySchemes:\n';
        Object.entries(spec.components.securitySchemes).forEach(([schemeName, scheme]: [string, any]) => {
          yaml += `    ${schemeName}:\n`;
          yaml += `      type: ${scheme.type}\n`;
          if (scheme.scheme) yaml += `      scheme: ${scheme.scheme}\n`;
          if (scheme.bearerFormat) yaml += `      bearerFormat: ${scheme.bearerFormat}\n`;
          if (scheme.flows) {
            yaml += '      flows:\n';
            Object.entries(scheme.flows).forEach(([flowType, flow]: [string, any]) => {
              yaml += `        ${flowType}:\n`;
              if (flow.authorizationUrl) yaml += `          authorizationUrl: ${flow.authorizationUrl}\n`;
              if (flow.tokenUrl) yaml += `          tokenUrl: ${flow.tokenUrl}\n`;
              if (flow.scopes && Object.keys(flow.scopes).length > 0) {
                yaml += '          scopes:\n';
                Object.entries(flow.scopes).forEach(([scopeName, scopeDesc]: [string, any]) => {
                  yaml += `            '${scopeName}': ${scopeDesc}\n`;
                });
              }
            });
          }
        });
      }
    }

    // Global security
    if (spec.security && spec.security.length > 0) {
      yaml += 'security:\n';
      spec.security.forEach((sec: any) => {
        yaml += '- ';
        Object.entries(sec).forEach(([schemeName, scopes]: [string, any], index) => {
          if (index > 0) yaml += '  ';
          yaml += `${schemeName}: `;
          if (Array.isArray(scopes) && scopes.length > 0) {
            yaml += `[ '${scopes.join("', '")}' ]\n`;
          } else {
            yaml += '[]\n';
          }
        });
      });
    }

    return yaml;
  };

  const yamlString = generateProperYaml(spec);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(yamlString);
    toast({
      title: "Copied!",
      description: "YAML has been copied to clipboard",
    });
  };

  const downloadYaml = () => {
    const blob = new Blob([yamlString], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.info?.title?.replace(/\s+/g, '-').toLowerCase() || 'openapi'}.yaml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "YAML file has been downloaded",
    });
  };

  const getStats = () => {
    const pathCount = Object.keys(spec.paths || {}).length;
    const schemaCount = Object.keys(spec.components?.schemas || {}).length;
    const serverCount = (spec.servers || []).length;
    const securityCount = Object.keys(spec.components?.securitySchemes || {}).length;
    
    return { pathCount, schemaCount, serverCount, securityCount };
  };

  const { pathCount, schemaCount, serverCount, securityCount } = getStats();

  return (
    <div className="space-y-4">
      {/* Stats */}
     <div className="flex gap-2 relative">
  <TooltipProvider delayDuration={100}>
    <div className="flex gap-2 flex-1 z-10">
      <Tooltip>
        <TooltipTrigger asChild>
         <Button 
  onClick={user ? copyToClipboard : () => toast({
    title: "Sign in required",
    description: "Please sign in to copy the YAML",
  })} 
  variant="outline" 
  size="sm" 
  className={`flex-1 ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  <span className="flex items-center">
    <Copy className="w-4 h-4 mr-1" />
    {user ? 'Copy YAML' : 'Sign in to copy'}
    {!user && <Lock className="w-4 h-4 ml-2 text-gray-400" />}
  </span>
</Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-white text-gray-900 border shadow-sm z-50">
          {user ? 'Copy YAML to clipboard' : 'Sign in to copy YAML'}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
         <Button 
  onClick={user ? downloadYaml : () => toast({
    title: "Sign in required",
    description: "Please sign in to download the YAML",
  })} 
  variant="outline" 
  size="sm" 
  className={`flex-1 ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  <span className="flex items-center">
    <Download className="w-4 h-4 mr-1" />
    {user ? 'Download YAML' : 'Sign in to download'}
    {!user && <Lock className="w-4 h-4 ml-2 text-gray-400" />}
  </span>
</Button>

        </TooltipTrigger>
        <TooltipContent side="top" className="bg-white text-gray-900 border shadow-sm z-50">
          {user ? 'Download YAML file' : 'Sign in to download YAML'}
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
</div>

      {/* YAML Preview */}
      <ScrollArea className="h-[500px] w-full border rounded-lg bg-gray-900 text-gray-100">
        <pre className="p-4 text-xs font-mono leading-relaxed">
          <code>{yamlString || '# Configure your API above to see the YAML preview'}</code>
        </pre>
      </ScrollArea>

      {/* Validation Info */}
      {spec.info?.title && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <strong>API:</strong> {spec.info.title} v{spec.info.version}
          {spec.info.description && (
            <>
              <br />
              <strong>Description:</strong> {spec.info.description}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default YamlPreview;