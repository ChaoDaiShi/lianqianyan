import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { AuthGate } from '@/auth/AuthGate';
import { AuthProvider } from '@/auth/AuthProvider';
import { ThemeProvider } from '@/theme/ThemeProvider';

/**
 * Root app component — provides the router context.
 */
function App() {
  return <AuthProvider><ThemeProvider><AuthGate><RouterProvider router={router} /></AuthGate></ThemeProvider></AuthProvider>;
}

export default App;
