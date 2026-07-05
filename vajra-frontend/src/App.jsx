import React from 'react';
import { useStore } from './store';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const isAuthenticated = useStore((state) => state.isAuthenticated);

  return (
    <div className="app-root">
      {isAuthenticated ? <Dashboard /> : <Login />}
    </div>
  );
}

export default App;
