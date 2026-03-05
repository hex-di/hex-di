# Chat Actions

**IDs:** ACT-011 through ACT-015
**Context:** Chat message submission, error dismissal, and discovery brief lifecycle (request, accept, reject).

---

## Action Flow Diagrams

### ACT-011 Send Message

```
  User clicks send button            User presses Enter in input
         |                                     |
         v                                     v
  ELM-041-chat-send-button (click)    ELM-040-chat-input (Enter)
         |                                     |
         +-------------+--------------+--------+
                        |
                        v
          [preconditions: message non-empty,
           isProcessing === false]
                        |
                        v
               ACT-011-send-message
                        |
                        v
               EVT-008-message-sent { message }
                        |
                        +---> STR-004-chat-store (messages appended, isProcessing = true)
                        +---> ELM-040-chat-input cleared
                        +---> Message list re-renders with new user message
                        +---> Agent processing indicator appears
```

### ACT-012 Clear Chat Error

```
  User clicks dismiss button on error banner
         |
         v
  ELM-043-chat-error-banner (dismiss click)
         |
         v
  ACT-012-clear-chat-error
         |
         v
  EVT-024-error-cleared
         |
         +---> STR-004-chat-store (error = null)
         +---> Error banner unmounts
```

### ACT-013 Accept Brief

```
  User clicks accept brief button
         |
         v
  ELM-032-accept-brief-button (click)
         |
         v
  ACT-013-accept-brief
         |
         v
  EVT-013-brief-action { accepted: true }
         |
         +---> STR-004-chat-store (discoveryStatus.briefAccepted = true)
         +---> Discovery status bar updates
         +---> Session workflow advances past discovery phase
```

### ACT-014 Reject Brief

```
  User clicks reject brief button
         |
         v
  ELM-033-reject-brief-button (click)
         |
         v
  ACT-014-reject-brief
         |
         v
  EVT-013-brief-action { accepted: false }
         |
         +---> STR-004-chat-store (discoveryStatus.briefAccepted = false)
         +---> Discovery conversation continues
         +---> Accept/reject buttons remain available
```

### ACT-015 Request Brief

```
  User clicks request brief button
         |
         v
  ELM-034-request-brief-button (click)
         |
         v
  ACT-015-request-brief
         |
         v
  EVT-012-discovery-status-changed { briefReady: false }
         |
         +---> STR-004-chat-store (discoveryStatus updated)
         +---> Brief generation starts (async)
         +---> On completion: discoveryStatus.briefReady = true
         +---> Accept/reject buttons (ELM-032, ELM-033) become visible
```

## Action Summary

| ID      | Name             | Type                 | Trigger                       | Preconditions                     | Event Dispatched                 |
| ------- | ---------------- | -------------------- | ----------------------------- | --------------------------------- | -------------------------------- |
| ACT-011 | Send Message     | form-submit          | ELM-041 click / ELM-040 Enter | message non-empty, not processing | EVT-008-message-sent             |
| ACT-012 | Clear Chat Error | notification-dismiss | ELM-043 dismiss button click  | --                                | EVT-024-error-cleared            |
| ACT-013 | Accept Brief     | data-update          | ELM-032 click                 | --                                | EVT-013-brief-action             |
| ACT-014 | Reject Brief     | data-update          | ELM-033 click                 | --                                | EVT-013-brief-action             |
| ACT-015 | Request Brief    | data-create          | ELM-034 click                 | --                                | EVT-012-discovery-status-changed |

## Cross-References

- **Element:** ELM-032-accept-brief-button (ACT-013 trigger)
- **Element:** ELM-033-reject-brief-button (ACT-014 trigger)
- **Element:** ELM-034-request-brief-button (ACT-015 trigger)
- **Element:** ELM-040-chat-input (ACT-011 Enter key trigger)
- **Element:** ELM-041-chat-send-button (ACT-011 click trigger)
- **Element:** ELM-043-chat-error-banner (ACT-012 trigger)
- **Store:** STR-004-chat-store (all chat actions)
- **Component:** CMP-008-discovery-status-bar (ACT-013, ACT-014, ACT-015 context)
- **Component:** CMP-009-message-list (ACT-011 renders new messages)
- **Component:** CMP-010-chat-input-area (ACT-011 input container)
