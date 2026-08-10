## Issue 001 – Schedule Page Infinite Refetch

### Status

Resolved

### Symptoms

The Schedule page remained in a perpetual loading state.

The browser continuously issued requests to `classes.list`.

### Root Cause

The query input used:

```ts
from: new Date().toISOString()
```

A new timestamp was generated on every render.

React Query uses query inputs as part of its cache key, so each render produced a different query key, causing continuous refetching.

### Resolution

Memoize the timestamp so the query key remains stable for the lifetime of the component.

```ts
const from = useMemo(
  () => new Date().toISOString(),
  []
);
```

### Lessons Learned

React Query query keys must remain stable across renders. Dynamic values should be memoized unless continuous refetching is intended.