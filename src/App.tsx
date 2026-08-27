import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { AuthGate } from '@/auth/AuthGate';
import { AuthProvider } from '@/auth/AuthProvider';

/**
 * Root app component — provides the router context.
 */
function App() {
  return <AuthProvider><AuthGate><RouterProvider router={router} /></AuthGate></AuthProvider>;
}

export default App;
