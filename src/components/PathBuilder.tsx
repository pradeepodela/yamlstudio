
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Edit } from 'lucide-react';
import { Path, Schema, SecurityScheme } from '@/pages/Index';
import PathMethodForm from '@/components/PathMethodForm';

interface PathBuilderProps {
  paths: Path[];
  setPaths: (paths: Path[]) => void;
  schemas: Schema[];
  securitySchemes: SecurityScheme[];
}

const PathBuilder: React.FC<PathBuilderProps> = ({ paths, setPaths, schemas, securitySchemes }) => {
  const [newPathUrl, setNewPathUrl] = useState('');
  const [editingPath, setEditingPath] = useState<number | null>(null);
  const [editingMethod, setEditingMethod] = useState<string | null>(null);

  const addPath = () => {
    if (!newPathUrl.trim()) return;
    
    const newPath: Path = {
      path: newPathUrl,
      methods: {}
    };
    
    setPaths([...paths, newPath]);
    setNewPathUrl('');
  };

  const removePath = (index: number) => {
    setPaths(paths.filter((_, i) => i !== index));
  };

  const addMethodToPath = (pathIndex: number, method: string) => {
    const newPaths = [...paths];
    if (!newPaths[pathIndex].methods[method]) {
      newPaths[pathIndex].methods[method] = {
        summary: '',
        description: '',
        operationId: '',
        tags: [],
        security: [],
        parameters: [],
        responses: []
      };
    }
    setPaths(newPaths);
    setEditingPath(pathIndex);
    setEditingMethod(method);
  };

  const updatePathMethod = (pathIndex: number, method: string, operation: any) => {
    const newPaths = [...paths];
    newPaths[pathIndex].methods[method] = operation;
    setPaths(newPaths);
  };

  const removeMethodFromPath = (pathIndex: number, method: string) => {
    const newPaths = [...paths];
    delete newPaths[pathIndex].methods[method];
    setPaths(newPaths);
  };

  const updatePathUrl = (index: number, newUrl: string) => {
    const newPaths = [...paths];
    newPaths[index].path = newUrl;
    setPaths(newPaths);
  };

  const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

  return (
    <div className="space-y-4">
      {/* Add new path */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              value={newPathUrl}
              onChange={(e) => setNewPathUrl(e.target.value)}
              placeholder="/api/v1/tickets or /api/v1/tickets/{ticketId}"
              className="flex-1"
            />
            <Button onClick={addPath} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Path
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Use {`{paramName}`} for path parameters (e.g., /tickets/{`ticketId`})
          </div>
        </CardContent>
      </Card>

      {/* Existing paths */}
      {paths.map((path, pathIndex) => (
        <Card key={pathIndex} className="bg-white border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <Input
                  value={path.path}
                  onChange={(e) => updatePathUrl(pathIndex, e.target.value)}
                  className="font-mono text-blue-700 border-none p-0 h-auto text-lg bg-transparent"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removePath(pathIndex)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Existing methods */}
            <div className="flex flex-wrap gap-2">
              {Object.keys(path.methods).map((method) => (
                <Badge
                  key={method}
                  variant="secondary"
                  className={`cursor-pointer ${
                    method === 'get' ? 'bg-green-100 text-green-700' :
                    method === 'post' ? 'bg-blue-100 text-blue-700' :
                    method === 'put' ? 'bg-orange-100 text-orange-700' :
                    method === 'delete' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}
                  onClick={() => {
                    setEditingPath(pathIndex);
                    setEditingMethod(method);
                  }}
                >
                  {method.toUpperCase()}
                  <Edit className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>

            {/* Add method dropdown */}
            <div className="flex items-center gap-2">
              <Label className="text-sm">Add Method:</Label>
              <Select onValueChange={(method) => addMethodToPath(pathIndex, method)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  {httpMethods
                    .filter(method => !path.methods[method])
                    .map((method) => (
                    <SelectItem key={method} value={method}>
                      {method.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Method editor */}
            {editingPath === pathIndex && editingMethod && (
              <Card className="bg-gray-50">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm">
                      Edit {editingMethod.toUpperCase()} {path.path}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMethodFromPath(pathIndex, editingMethod)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPath(null);
                          setEditingMethod(null);
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <PathMethodForm
                    operation={path.methods[editingMethod]}
                    onUpdate={(operation) => updatePathMethod(pathIndex, editingMethod, operation)}
                    schemas={schemas}
                    securitySchemes={securitySchemes}
                    currentPath={path.path}
                  />
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      ))}

      {paths.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No paths defined yet. Add your first API endpoint above.</p>
        </div>
      )}
    </div>
  );
};

export default PathBuilder;
