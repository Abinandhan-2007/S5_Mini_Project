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
        <div className="min-h-screen bg-white sm:bg-slate-200/90 flex justify-center items-start text-[#111827] antialiased selection:bg-[#0B5A54] selection:text-white">
          <div className="w-full max-w-[410px] sm:max-w-md bg-white min-h-screen sm:min-h-[calc(100vh-2rem)] sm:my-3 sm:rounded-3xl sm:shadow-xl border-0 sm:border sm:border-white/80 relative flex flex-col overflow-x-hidden transition-all duration-200">
            <AppRoutes />
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
