
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, X } from 'lucide-react';
import { Schema } from '@/pages/Index';

interface SchemaBuilderProps {
  schemas: Schema[];
  setSchemas: (schemas: Schema[]) => void;
}

const SchemaBuilder: React.FC<SchemaBuilderProps> = ({ schemas, setSchemas }) => {
  const [newSchemaName, setNewSchemaName] = useState('');

  const addSchema = () => {
    if (!newSchemaName.trim()) return;
    
    const newSchema: Schema = {
      name: newSchemaName,
      type: 'object',
      properties: {},
      required: []
    };
    
    setSchemas([...schemas, newSchema]);
    setNewSchemaName('');
  };

  const removeSchema = (index: number) => {
    setSchemas(schemas.filter((_, i) => i !== index));
  };

  const updateSchema = (index: number, field: keyof Schema, value: any) => {
    const newSchemas = [...schemas];
    newSchemas[index] = { ...newSchemas[index], [field]: value };
    setSchemas(newSchemas);
  };

  const addProperty = (schemaIndex: number) => {
    const newSchemas = [...schemas];
    const propertyName = `property${Object.keys(newSchemas[schemaIndex].properties).length + 1}`;
    newSchemas[schemaIndex].properties[propertyName] = {
      type: 'string',
      description: ''
    };
    setSchemas(newSchemas);
  };

  const updateProperty = (schemaIndex: number, propertyName: string, field: string, value: any) => {
    const newSchemas = [...schemas];
    newSchemas[schemaIndex].properties[propertyName] = {
      ...newSchemas[schemaIndex].properties[propertyName],
      [field]: value
    };
    setSchemas(newSchemas);
  };

  const removeProperty = (schemaIndex: number, propertyName: string) => {
    const newSchemas = [...schemas];
    delete newSchemas[schemaIndex].properties[propertyName];
    newSchemas[schemaIndex].required = newSchemas[schemaIndex].required.filter(req => req !== propertyName);
    setSchemas(newSchemas);
  };

  const toggleRequired = (schemaIndex: number, propertyName: string, isRequired: boolean) => {
    const newSchemas = [...schemas];
    if (isRequired) {
      if (!newSchemas[schemaIndex].required.includes(propertyName)) {
        newSchemas[schemaIndex].required.push(propertyName);
      }
    } else {
      newSchemas[schemaIndex].required = newSchemas[schemaIndex].required.filter(req => req !== propertyName);
    }
    setSchemas(newSchemas);
  };

  const renameProperty = (schemaIndex: number, oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return;
    
    const newSchemas = [...schemas];
    const property = newSchemas[schemaIndex].properties[oldName];
    delete newSchemas[schemaIndex].properties[oldName];
    newSchemas[schemaIndex].properties[newName] = property;
    
    // Update required array
    const requiredIndex = newSchemas[schemaIndex].required.indexOf(oldName);
    if (requiredIndex > -1) {
      newSchemas[schemaIndex].required[requiredIndex] = newName;
    }
    
    setSchemas(newSchemas);
  };

  return (
    <div className="space-y-4">
      {/* Add new schema */}
      <Card className="bg-orange-50/50 border-orange-200">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Input
              value={newSchemaName}
              onChange={(e) => setNewSchemaName(e.target.value)}
              placeholder="DeskTicketUpdate"
              className="flex-1"
            />
            <Button onClick={addSchema} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Schema
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing schemas */}
      {schemas.map((schema, schemaIndex) => (
        <Card key={schemaIndex} className="bg-white border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-mono text-orange-700">
                {schema.name}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSchema(schemaIndex)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Properties */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-medium">Properties</Label>
                <Button
                  onClick={() => addProperty(schemaIndex)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Property
                </Button>
              </div>

              {Object.entries(schema.properties).map(([propertyName, property]) => (
                <Card key={propertyName} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-3">
                      <Input
                        value={propertyName}
                        onChange={(e) => renameProperty(schemaIndex, propertyName, e.target.value)}
                        className="font-mono text-sm w-48"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProperty(schemaIndex, propertyName)}
                        className="text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={property.type}
                          onValueChange={(value) => updateProperty(schemaIndex, propertyName, 'type', value)}
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
                            <SelectItem value="object">Object</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2 mt-6">
                        <Switch
                          checked={schema.required.includes(propertyName)}
                          onCheckedChange={(checked) => toggleRequired(schemaIndex, propertyName, checked)}
                        />
                        <Label className="text-xs">Required</Label>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={property.description}
                        onChange={(e) => updateProperty(schemaIndex, propertyName, 'description', e.target.value)}
                        placeholder="The new status of the ticket"
                        className="mt-1"
                      />
                    </div>

                    <div className="mt-3">
                      <Label className="text-xs">ZIA Agent Param Type</Label>
                      <Select
                        value={property['x-zia-agent-param-type'] || 'none'}
                        onValueChange={(value) => updateProperty(schemaIndex, propertyName, 'x-zia-agent-param-type', value === 'none' ? undefined : value)}
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

              {Object.keys(schema.properties).length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No properties defined. Add your first property above.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {schemas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No schemas defined yet. Add your first data schema above.</p>
        </div>
      )}
    </div>
  );
};

export default SchemaBuilder;
