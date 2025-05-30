import { useAuth } from "../utils/AuthContext";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { useState } from "react";
import { useToast } from "./ui/use-toast";

const roles = [
  "Backend Developer",
  "API/Product Engineer",
  "Technical Writer",
  "No-Code Developer",
  "Dev Tool Builder",
  "Student / Learner",
  "Other"
];

const yamlFamiliarityLevels = [
  "Beginner",
  "Intermediate",
  "Advanced"
];

const useCaseOptions = [
  "Creating OpenAPI specs from scratch",
  "Editing existing specs",
  "Creating docs for a public API",
  "Integrating with OpenAI/LangChain",
  "Learning OpenAPI",
  "Other"
];

interface UserInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserInfoDialog({ open, onOpenChange }: UserInfoDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState<string>("");
  const [otherRole, setOtherRole] = useState<string>("");
  const [yamlFamiliarity, setYamlFamiliarity] = useState<string>("");
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);
  const [otherUseCase, setOtherUseCase] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUseCaseChange = (useCase: string) => {
    setSelectedUseCases(current => 
      current.includes(useCase)
        ? current.filter(item => item !== useCase)
        : [...current, useCase]
    );
  };

  const handleSubmit = async () => {
    if (!role || !yamlFamiliarity || selectedUseCases.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (role === "Other" && !otherRole.trim()) {
      toast({
        title: "Missing Information",
        description: "Please specify your role",
        variant: "destructive"
      });
      return;
    }

    if (selectedUseCases.includes("Other") && !otherUseCase.trim()) {
      toast({
        title: "Missing Information",
        description: "Please specify your use case",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);    try {      const response = await fetch(`${import.meta.env.VITE_API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user?.displayName,
          email: user?.email,
          role: role === "Other" ? otherRole : role,
          yamlFamiliarity,
          useCases: selectedUseCases.map(useCase => 
            useCase === "Other" ? otherUseCase : useCase
          )
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save user information');
      }
      
      toast({
        title: "Success!",
        description: "Your information has been saved successfully.",
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tell us about yourself</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">What best describes your role?</label>
            <div className="flex gap-2 items-center">
              <Select value={role} onValueChange={setRole} className="flex-1">
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {role === "Other" && (
                <Input 
                  value={otherRole} 
                  onChange={(e) => setOtherRole(e.target.value)} 
                  placeholder="Enter your role"
                  className="flex-1"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">How familiar are you with OpenAPI or YAML?</label>
            <Select value={yamlFamiliarity} onValueChange={setYamlFamiliarity}>
              <SelectTrigger>
                <SelectValue placeholder="Select your familiarity level" />
              </SelectTrigger>
              <SelectContent>
                {yamlFamiliarityLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">What do you plan to use this tool for?</label>
            <div className="space-y-2">
              {useCaseOptions.map((useCase) => (
                <div key={useCase}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={useCase}
                      checked={selectedUseCases.includes(useCase)}
                      onCheckedChange={() => handleUseCaseChange(useCase)}
                    />
                    <label htmlFor={useCase} className="text-sm flex-1">
                      {useCase}
                    </label>
                    {useCase === "Other" && selectedUseCases.includes("Other") && (
                      <Input 
                        value={otherUseCase} 
                        onChange={(e) => setOtherUseCase(e.target.value)} 
                        placeholder="Enter your use case"
                        className="flex-1"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Information"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
