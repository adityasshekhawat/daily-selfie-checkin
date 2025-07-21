import React, { useState } from 'react';
import { AuthScreen } from '@/components/auth-screen';
import { VerificationApp } from '@/components/verification-app';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userCode, setUserCode] = useState('');

  const handleAuthenticated = (code: string) => {
    setUserCode(code);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUserCode('');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return <VerificationApp userCode={userCode} onLogout={handleLogout} />;
};

export default Index;
