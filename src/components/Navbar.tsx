import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/utils/AuthContext';
import { signInWithGoogle, handleSignOut } from '@/utils/firebase-config';
import { useState } from 'react';
import { UserInfoDialog } from './UserInfoDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showUserInfoDialog, setShowUserInfoDialog] = useState(false);

  const handleSignIn = async () => {
  try {
    const result = await signInWithGoogle();
    if (result) {
      const userEmail = result.email;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/check?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
 console.log('User info already exists:', data);
      if (data.exists) {
        console.log('User info already exists, skipping dialog.');
      } else {
        // User info does not exist, show dialog
        setShowUserInfoDialog(true);
      }
    }
  } catch (error) {
    console.error('Sign in error:', error);
  }
};


  const handleDialogClose = (open: boolean) => {
    setShowUserInfoDialog(open);
  };

  return (
    <nav className="bg-white shadow-sm mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">YAML Studio</h1>
          </div>          <div className="flex items-center gap-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                    <Avatar>
                      <AvatarImage src={user.photoURL || ''} alt="Profile" />
                      <AvatarFallback>
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                      {user.displayName}
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.displayName && (
                        <p className="font-medium">{user.displayName}</p>
                      )}
                      {user.email && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="default" 
                size="sm"
                onClick={handleSignIn}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
      <UserInfoDialog 
        open={showUserInfoDialog} 
        onOpenChange={handleDialogClose}
      />
    </nav>
  );
}
