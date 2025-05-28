import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';
import { SecurityScheme } from '@/pages/Index';

interface SecurityBuilderProps {
  securitySchemes: SecurityScheme[];
  setSecuritySchemes: (schemes: SecurityScheme[]) => void;
}

const SecurityBuilder: React.FC<SecurityBuilderProps> = ({ securitySchemes, setSecuritySchemes }) => {
  const [newSchemeName, setNewSchemeName] = useState('');

  const addSecurityScheme = () => {
    if (!newSchemeName.trim()) return;
    
    const newScheme: SecurityScheme = {
      name: newSchemeName,
      type: 'http',
      scheme: 'bearer'
    };
    
    setSecuritySchemes([...securitySchemes, newScheme]);
    setNewSchemeName('');
  };

  const removeSecurityScheme = (index: number) => {
    setSecuritySchemes(securitySchemes.filter((_, i) => i !== index));
  };

  const updateSecurityScheme = (index: number, field: keyof SecurityScheme, value: any) => {
    const newSchemes = [...securitySchemes];
    newSchemes[index] = { ...newSchemes[index], [field]: value };
    setSecuritySchemes(newSchemes);
  };

  const addScope = (schemeIndex: number, scopeName: string, scopeDescription: string) => {
    if (!scopeName.trim()) return;
    
    const newSchemes = [...securitySchemes];
    if (!newSchemes[schemeIndex].scopes) {
      newSchemes[schemeIndex].scopes = {};
    }
    newSchemes[schemeIndex].scopes![scopeName] = scopeDescription;
    setSecuritySchemes(newSchemes);
  };

  const removeScope = (schemeIndex: number, scopeName: string) => {
    const newSchemes = [...securitySchemes];
    if (newSchemes[schemeIndex].scopes) {
      delete newSchemes[schemeIndex].scopes![scopeName];
    }
    setSecuritySchemes(newSchemes);
  };

  const updateOAuth2Flows = (schemeIndex: number, authUrl: string, tokenUrl: string) => {
    const newSchemes = [...securitySchemes];
    newSchemes[schemeIndex].flows = {
      authorizationCode: {
        authorizationUrl: authUrl,
        tokenUrl: tokenUrl,
        scopes: newSchemes[schemeIndex].scopes || {}
      }
    };
    setSecuritySchemes(newSchemes);
  };

  return (
    <div className="space-y-4">
      {/* Add new security scheme */}
      <Card className="bg-red-50/50 border-red-200">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              value={newSchemeName}
              onChange={(e) => setNewSchemeName(e.target.value)}
              placeholder="bearerAuth or OAuth2"
              className="flex-1"
            />
            <Button onClick={addSecurityScheme} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Security Scheme
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing security schemes */}
      {securitySchemes.map((scheme, schemeIndex) => (
        <Card key={schemeIndex} className="bg-white border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-mono text-red-700">
                {scheme.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSecurityScheme(schemeIndex)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Security Type *</Label>
                <Select
                  value={scheme.type}
                  onValueChange={(value) => updateSecurityScheme(schemeIndex, 'type', value as any)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    <SelectItem value="apiKey">API Key</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {scheme.type === 'http' && (
                <div>
                  <Label className="text-sm">Scheme</Label>
                  <Select
                    value={scheme.scheme || 'bearer'}
                    onValueChange={(value) => updateSecurityScheme(schemeIndex, 'scheme', value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="digest">Digest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {scheme.type === 'http' && scheme.scheme === 'bearer' && (
              <div>
                <Label className="text-sm">Bearer Format</Label>
                <Input
                  value={scheme.bearerFormat || ''}
                  onChange={(e) => updateSecurityScheme(schemeIndex, 'bearerFormat', e.target.value)}
                  placeholder="JWT"
                  className="mt-1"
                />
              </div>
            )}

            {scheme.type === 'oauth2' && (
              <Card className="bg-gray-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">OAuth 2.0 Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm">Authorization URL</Label>
                    <Input
                      value={scheme.flows?.authorizationCode?.authorizationUrl || ''}
                      onChange={(e) => {
                        const tokenUrl = scheme.flows?.authorizationCode?.tokenUrl || '';
                        updateOAuth2Flows(schemeIndex, e.target.value, tokenUrl);
                      }}
                      placeholder="https://accounts.localzoho.com/oauth/v2/auth"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm">Token URL</Label>
                    <Input
                      value={scheme.flows?.authorizationCode?.tokenUrl || ''}
                      onChange={(e) => {
                        const authUrl = scheme.flows?.authorizationCode?.authorizationUrl || '';
                        updateOAuth2Flows(schemeIndex, authUrl, e.target.value);
                      }}
                      placeholder="https://accounts.localzoho.com/oauth/v2/token"
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {(scheme.type === 'oauth2' || scheme.type === 'apiKey') && (
              <Card className="bg-gray-50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">Scopes</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const scopeName = prompt('Scope name:');
                        const scopeDescription = prompt('Scope description:');
                        if (scopeName && scopeDescription) {
                          addScope(schemeIndex, scopeName, scopeDescription);
                        }
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Scope
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {scheme.scopes && Object.entries(scheme.scopes).map(([scopeName, scopeDescription]) => (
                    <div key={scopeName} className="flex justify-between items-center p-2 bg-white rounded border">
                      <div>
                        <span className="font-mono text-sm text-blue-600">{scopeName}</span>
                        <p className="text-xs text-gray-600">{scopeDescription}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScope(schemeIndex, scopeName)}
                        className="text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {(!scheme.scopes || Object.keys(scheme.scopes).length === 0) && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      No scopes defined. Add your first scope above.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      ))}

      {securitySchemes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No security schemes defined yet. Add your first security configuration above.</p>
        </div>
      )}
    </div>
  );
};

export default SecurityBuilder;
