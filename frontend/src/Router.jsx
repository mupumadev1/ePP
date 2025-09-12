// React
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';

// Note: Keep any additional routes here as needed. For now, route everything to App
// so existing authentication and UI flows remain intact while enabling React Router.
const router = createBrowserRouter([
  { path: '/*', element: <App /> },
]);

export default function RootRouter() {
  return <RouterProvider router={router} />;
}