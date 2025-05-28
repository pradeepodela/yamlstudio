
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ApiInfo } from '@/pages/Index';

interface ApiInfoFormProps {
  apiInfo: ApiInfo;
  setApiInfo: (info: ApiInfo) => void;
}

const ApiInfoForm: React.FC<ApiInfoFormProps> = ({ apiInfo, setApiInfo }) => {
  const updateApiInfo = (field: string, value: string) => {
    setApiInfo({ ...apiInfo, [field]: value });
  };

  const updateContact = (field: string, value: string) => {
    setApiInfo({
      ...apiInfo,
      contact: {
        ...apiInfo.contact,
        [field]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="title" className="text-sm font-medium">API Title *</Label>
          <Input
            id="title"
            value={apiInfo.title}
            onChange={(e) => updateApiInfo('title', e.target.value)}
            placeholder="e.g., ZohoDesk Ticket Support Agent"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="description" className="text-sm font-medium">Description</Label>
          <Textarea
            id="description"
            value={apiInfo.description}
            onChange={(e) => updateApiInfo('description', e.target.value)}
            placeholder="Brief description of your API"
            className="mt-1 min-h-[80px]"
          />
        </div>

        <div>
          <Label htmlFor="version" className="text-sm font-medium">Version *</Label>
          <Input
            id="version"
            value={apiInfo.version}
            onChange={(e) => updateApiInfo('version', e.target.value)}
            placeholder="1.0.0"
            className="mt-1"
          />
        </div>
      </div>

      <Separator />

      <Card className="bg-gray-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="contactName" className="text-sm">Contact Name</Label>
            <Input
              id="contactName"
              value={apiInfo.contact?.name || ''}
              onChange={(e) => updateContact('name', e.target.value)}
              placeholder="e.g., pradeep"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="contactEmail" className="text-sm">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={apiInfo.contact?.email || ''}
              onChange={(e) => updateContact('email', e.target.value)}
              placeholder="e.g., odelapradeep12@gmail.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="contactUrl" className="text-sm">Contact URL</Label>
            <Input
              id="contactUrl"
              type="url"
              value={apiInfo.contact?.url || ''}
              onChange={(e) => updateContact('url', e.target.value)}
              placeholder="https://example.com"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiInfoForm;
