
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { Server } from '@/pages/Index';

interface ServerFormProps {
  servers: Server[];
  setServers: (servers: Server[]) => void;
}

const ServerForm: React.FC<ServerFormProps> = ({ servers, setServers }) => {
  const addServer = () => {
    setServers([...servers, { url: '', description: '' }]);
  };

  const updateServer = (index: number, field: keyof Server, value: string) => {
    const newServers = [...servers];
    newServers[index] = { ...newServers[index], [field]: value };
    setServers(newServers);
  };

  const removeServer = (index: number) => {
    setServers(servers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {servers.map((server, index) => (
        <Card key={index} className="bg-gray-50/50">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-medium text-sm">Server {index + 1}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeServer(index)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Server URL *</Label>
                <Input
                  value={server.url}
                  onChange={(e) => updateServer(index, 'url', e.target.value)}
                  placeholder="https://desk.localzoho.com"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-sm">Description</Label>
                <Input
                  value={server.description}
                  onChange={(e) => updateServer(index, 'description', e.target.value)}
                  placeholder="Production server"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button onClick={addServer} variant="outline" className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Server
      </Button>
    </div>
  );
};

export default ServerForm;
