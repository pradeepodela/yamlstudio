import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/utils/AuthContext';
import { signInWithGoogle, handleSignOut } from '@/utils/firebase-config';
import { useState } from 'react';
import { UserInfoDialog } from './UserInfoDialog';

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
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src={user.photoURL || ''}
                    alt="Profile"
                    className="h-8 w-8 rounded-full"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {user.displayName}
                  </span>
                </div>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </>
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
