import React, { Suspense } from 'react';

// Dynamically import the component
const NonCriticalComponent = React.lazy(() => import('./NonCriticalComponent'));

export function LazyLoadedComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NonCriticalComponent />
    </Suspense>
  );
}
