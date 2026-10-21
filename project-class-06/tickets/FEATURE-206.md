# FEATURE-206 — Request history endpoint

Requested by: product team
Status: open

## Story

As an authenticated user,
I want to read a request's history
so I can understand how it changed over time.

## Endpoint

```http
GET /requests/:id/history
```

## Reference representation

```json
[
  {
    "id": 18,
    "type": "status_changed",
    "fromStatus": "open",
    "toStatus": "in_progress",
    "createdAt": "2026-09-15T18:30:00.000Z"
  },
  {
    "id": 21,
    "type": "priority_changed",
    "fromPriority": "medium",
    "toPriority": "high",
    "createdAt": "2026-09-15T18:45:00.000Z"
  }
]
```

## Rules

1. Requires authentication.
2. A requester can read the history of their OWN requests.
3. A requester cannot read someone else's history — keep the EXISTING
   contract for foreign requests (do not silently switch it).
4. An agent can read any history.
5. A missing request answers `404`.
6. A request without events answers `200` with `[]`.
7. Events are ordered oldest first, with a stable rule when two events
   share the same timestamp.
8. The response never exposes passwords, hashes, tokens or secrets.
9. Keep the existing error format and the existing responsibilities —
   do not duplicate authorization rules that already exist.

## Out of scope

Pagination, history filters, WebSockets, advanced auditing.
