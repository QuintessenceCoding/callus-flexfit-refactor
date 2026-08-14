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


## Issue 002 – Corporate Attendance Source Not Persisted

Status: Observed, Preserved

Observation:
The API accepts a source parameter during attendance marking
(front_desk, kiosk, app) but the value is not stored.

Reason Preserved:
The challenge requires behavior preservation.
Changing persistence behavior could alter existing consumers.
Documented for future investigation.