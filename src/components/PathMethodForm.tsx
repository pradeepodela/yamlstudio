
import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X } from 'lucide-react';
import { Operation, Parameter, Response, Schema, SecurityScheme } from '@/pages/Index';

interface PathMethodFormProps {
  operation: Operation;
  onUpdate: (operation: Operation) => void;
  schemas: Schema[];
  securitySchemes: SecurityScheme[];
  currentPath: string;
}

const PathMethodForm: React.FC<PathMethodFormProps> = ({ 
  operation, 
  onUpdate, 
  schemas, 
  securitySchemes, 
  currentPath 
}) => {
  const updateOperation = (field: keyof Operation, value: any) => {
    onUpdate({ ...operation, [field]: value });
  };

  // Auto-detect path parameters from the current path
  useEffect(() => {
    const pathParams = currentPath.match(/\{([^}]+)\}/g);
    if (pathParams) {
      const existingPathParams = operation.parameters.filter(p => p.in === 'path');
      const newPathParams: Parameter[] = [];

      pathParams.forEach(param => {
        const paramName = param.slice(1, -1); // Remove { and }
        const exists = existingPathParams.find(p => p.name === paramName);
        if (!exists) {
          newPathParams.push({
            name: paramName,
            in: 'path',
            required: true,
            description: `ID of the ${paramName}`,
            schema: { type: 'string' },
            'x-zia-agent-param-type': 'system'
          });
        }
      });

      if (newPathParams.length > 0) {
        const otherParams = operation.parameters.filter(p => p.in !== 'path');
        updateOperation('parameters', [...existingPathParams, ...newPathParams, ...otherParams]);
      }
    }
  }, [currentPath]);

  const addParameter = () => {
    const newParam: Parameter = {
      name: '',
      in: 'query',
      required: false,
      description: '',
      schema: { type: 'string' }
    };
    updateOperation('parameters', [...operation.parameters, newParam]);
  };

  const updateParameter = (index: number, field: keyof Parameter, value: any) => {
    const newParams = [...operation.parameters];
    if (field === 'schema') {
      newParams[index] = { ...newParams[index], schema: value };
    } else {
      newParams[index] = { ...newParams[index], [field]: value };
    }
    updateOperation('parameters', newParams);
  };

  const removeParameter = (index: number) => {
    updateOperation('parameters', operation.parameters.filter((_, i) => i !== index));
  };

  const addResponse = () => {
    const newResponse: Response = {
      statusCode: '200',
      description: '',
    };
    updateOperation('responses', [...operation.responses, newResponse]);
  };

  const updateResponse = (index: number, field: keyof Response, value: any) => {
    const newResponses = [...operation.responses];
    newResponses[index] = { ...newResponses[index], [field]: value };
    updateOperation('responses', newResponses);
  };

  const removeResponse = (index: number) => {
    updateOperation('responses', operation.responses.filter((_, i) => i !== index));
  };

  const addTag = (tag: string) => {
    if (tag && !operation.tags.includes(tag)) {
      updateOperation('tags', [...operation.tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    updateOperation('tags', operation.tags.filter(t => t !== tag));
  };

  const updateSecurity = (schemeName: string, scopes: string[], isEnabled: boolean) => {
    const newSecurity = [...operation.security];
    const existingIndex = newSecurity.findIndex(s => Object.keys(s)[0] === schemeName);
    
    if (isEnabled) {
      const securityEntry = { [schemeName]: scopes };
      if (existingIndex >= 0) {
        newSecurity[existingIndex] = securityEntry;
      } else {
        newSecurity.push(securityEntry);
      }
    } else {
      if (existingIndex >= 0) {
        newSecurity.splice(existingIndex, 1);
      }
    }
    
    updateOperation('security', newSecurity);
  };

  const updateRequestBody = (field: string, value: any) => {
    const requestBody = operation.requestBody || {
      required: false,
      content: {
        'application/json': {
          schema: {}
        }
      }
    };
    
    if (field === 'required') {
      requestBody.required = value;
    } else if (field === 'schema') {
      requestBody.content['application/json'].schema = value;
    }
    
    updateOperation('requestBody', requestBody);
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">Summary *</Label>
          <Input
            value={operation.summary}
            onChange={(e) => updateOperation('summary', e.target.value)}
            placeholder="desk List all tickets"
            className="mt-1"
          />
        </div>
        
        <div>
          <Label className="text-sm">Operation ID *</Label>
          <Input
            value={operation.operationId}
            onChange={(e) => updateOperation('operationId', e.target.value)}
            placeholder="desk25 listTickets"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-sm">Description</Label>
        <Textarea
          value={operation.description}
          onChange={(e) => updateOperation('description', e.target.value)}
          placeholder="Detailed description of the operation"
          className="mt-1"
        />
      </div>

      {/* Tags */}
      <Card className="bg-gray-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {operation.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                {tag}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeTag(tag)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag (press Enter)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addTag(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="bg-red-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Security Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {securitySchemes.map((scheme) => {
            const isEnabled = operation.security.some(s => Object.keys(s)[0] === scheme.name);
            const currentScopes = operation.security.find(s => Object.keys(s)[0] === scheme.name)?.[scheme.name] || [];
            
            return (
              <Card key={scheme.name} className="bg-white">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={isEnabled}
                        onCheckedChange={(checked) => updateSecurity(scheme.name, currentScopes, checked as boolean)}
                      />
                      <Label className="font-medium">{scheme.name}</Label>
                      <Badge variant="outline">{scheme.type}</Badge>
                    </div>
                  </div>
                  
                  {isEnabled && scheme.scopes && Object.keys(scheme.scopes).length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs mb-2 block">Required Scopes:</Label>
                      <div className="space-y-2">
                        {Object.entries(scheme.scopes).map(([scopeName, scopeDescription]) => (
                          <div key={scopeName} className="flex items-center space-x-2">
                            <Checkbox
                              checked={currentScopes.includes(scopeName)}
                              onCheckedChange={(checked) => {
                                const newScopes = checked 
                                  ? [...currentScopes, scopeName]
                                  : currentScopes.filter(s => s !== scopeName);
                                updateSecurity(scheme.name, newScopes, true);
                              }}
                            />
                            <Label className="text-xs">{scopeName}</Label>
                            <span className="text-xs text-gray-500">- {scopeDescription}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {securitySchemes.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No security schemes defined. Add security schemes in the Security tab first.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Body */}
      <Card className="bg-purple-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Request Body</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={!!operation.requestBody}
              onCheckedChange={(checked) => {
                if (checked) {
                  updateRequestBody('required', false);
                } else {
                  updateOperation('requestBody', undefined);
                }
              }}
            />
            <Label className="text-sm">Has Request Body</Label>
          </div>
          
          {operation.requestBody && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={operation.requestBody.required}
                  onCheckedChange={(checked) => updateRequestBody('required', checked)}
                />
                <Label className="text-sm">Required</Label>
              </div>
              
              <div>
                <Label className="text-sm">Schema Reference</Label>
                <Select
                  value={operation.requestBody.content?.['application/json']?.schema?.$ref?.replace('#/components/schemas/', '') || 'none'}
                  onValueChange={(value) => updateRequestBody('schema', value === 'none' ? {} : { $ref: `#/components/schemas/${value}` })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select schema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No schema</SelectItem>
                    {schemas.map((schema) => (
                      <SelectItem key={schema.name} value={schema.name}>
                        {schema.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card className="bg-blue-50/30">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm">Parameters</CardTitle>
            <Button onClick={addParameter} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Parameter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {operation.parameters.map((param, index) => (
            <Card key={index} className="bg-white">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="font-medium text-sm">
                    Parameter {index + 1} 
                    {param.in === 'path' && <Badge variant="outline" className="ml-2">Path Param</Badge>}
                  </h5>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParameter(index)}
                    className="text-red-500"
                    disabled={param.in === 'path'} // Don't allow removal of path params
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name *</Label>
                    <Input
                      value={param.name}
                      onChange={(e) => updateParameter(index, 'name', e.target.value)}
                      placeholder="orgId"
                      className="mt-1"
                      disabled={param.in === 'path'} // Don't allow editing path param names
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Location *</Label>
                    <Select
                      value={param.in}
                      onValueChange={(value) => updateParameter(index, 'in', value)}
                      disabled={param.in === 'path'} // Don't allow changing path param location
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="query">Query</SelectItem>
                        <SelectItem value="header">Header</SelectItem>
                        <SelectItem value="path">Path</SelectItem>
                        <SelectItem value="cookie">Cookie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={param.schema.type}
                      onValueChange={(value) => updateParameter(index, 'schema', { type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="integer">Integer</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="array">Array</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-6">
                    <Switch
                      checked={param.required}
                      onCheckedChange={(checked) => updateParameter(index, 'required', checked)}
                      disabled={param.in === 'path'} // Path params are always required
                    />
                    <Label className="text-xs">Required</Label>
                  </div>
                </div>
                
                <div className="mt-3">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={param.description}
                    onChange={(e) => updateParameter(index, 'description', e.target.value)}
                    placeholder="The desk zsoId"
                    className="mt-1"
                  />
                </div>

                <div className="mt-3">
                  <Label className="text-xs">ZIA Agent Param Type</Label>
                  <Select
                    value={param['x-zia-agent-param-type'] || 'none'}
                    onValueChange={(value) => updateParameter(index, 'x-zia-agent-param-type', value === 'none' ? undefined : value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="model">Model</SelectItem>
                      <SelectItem value="dynamic">Dynamic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Responses */}
      <Card className="bg-green-50/30">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-sm">Responses</CardTitle>
            <Button onClick={addResponse} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Response
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {operation.responses.map((response, index) => (
            <Card key={index} className="bg-white">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="font-medium text-sm">Response {index + 1}</h5>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeResponse(index)}
                    className="text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Status Code *</Label>
                    <Input
                      value={response.statusCode}
                      onChange={(e) => updateResponse(index, 'statusCode', e.target.value)}
                      placeholder="200"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs">Description *</Label>
                    <Input
                      value={response.description}
                      onChange={(e) => updateResponse(index, 'description', e.target.value)}
                      placeholder="A list of tickets"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <Label className="text-xs">Content Schema</Label>
                  <Select
                    value={response.content?.['application/json']?.schema?.$ref?.replace('#/components/schemas/', '') || 'none'}
                    onValueChange={(value) => {
                      const newResponse = { ...response };
                      if (value === 'none') {
                        delete newResponse.content;
                      } else {
                        newResponse.content = {
                          'application/json': {
                            schema: { $ref: `#/components/schemas/${value}` }
                          }
                        };
                      }
                      updateResponse(index, 'content', newResponse.content);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select schema (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No schema</SelectItem>
                      {schemas.map((schema) => (
                        <SelectItem key={schema.name} value={schema.name}>
                          {schema.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default PathMethodForm;
