import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './app/routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-white text-[#111827] antialiased selection:bg-[#0B5A54] selection:text-white w-full relative flex flex-col overflow-x-hidden">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
