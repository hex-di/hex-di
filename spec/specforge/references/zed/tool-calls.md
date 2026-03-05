# Zed ACP — Tool Calls

**Source:** https://github.com/agentclientprotocol/agent-client-protocol/blob/main/rust/schema/src/tool_call.rs
**Captured:** 2026-02-28

---

## ToolCall

Represents a structured agent action sent via `session/update`:

| Field          | Type                    | Description                     |
| -------------- | ----------------------- | ------------------------------- |
| `tool_call_id` | `ToolCallId`            | Unique identifier for this call |
| `title`        | `String`                | Human-readable description      |
| `kind`         | `ToolKind`              | Category of action              |
| `status`       | `ToolCallStatus`        | Current execution state         |
| `content`      | `Vec<ToolCallContent>`  | Output/payload of the call      |
| `locations`    | `Vec<ToolCallLocation>` | File locations affected         |
| `raw_input`    | `Option<Value>`         | Raw input parameters (JSON)     |
| `raw_output`   | `Option<Value>`         | Raw output (JSON)               |
| `meta`         | `Option<Meta>`          | Extensibility metadata          |

---

## ToolKind

Categorizes the type of action the tool performs:

| Variant      | Description                     |
| ------------ | ------------------------------- |
| `Read`       | Reading file contents           |
| `Edit`       | Modifying file contents         |
| `Delete`     | Removing files                  |
| `Move`       | Moving/renaming files           |
| `Search`     | Searching for content or files  |
| `Execute`    | Running commands                |
| `Think`      | Agent reasoning/planning step   |
| `Fetch`      | Fetching web content            |
| `SwitchMode` | Changing operating mode         |
| `Other`      | Default — any unclassified tool |

---

## ToolCallStatus

Tracks the lifecycle of a tool call:

| Variant      | Description           |
| ------------ | --------------------- |
| `Pending`    | Default — call queued |
| `InProgress` | Currently executing   |
| `Completed`  | Finished successfully |
| `Failed`     | Execution failed      |

---

## ToolCallContent

The payload/output of a tool call. Three variants:

### Content

Standard content block:

| Field     | Type           | Description                                        |
| --------- | -------------- | -------------------------------------------------- |
| `content` | `ContentBlock` | Text, image, audio, resource, or embedded resource |
| `meta`    | `Option<Meta>` | Extensibility metadata                             |

### Diff

File modification represented as a diff:

| Field      | Type             | Description                           |
| ---------- | ---------------- | ------------------------------------- |
| `path`     | `String`         | File path affected                    |
| `old_text` | `Option<String>` | Previous content (None for new files) |
| `new_text` | `Option<String>` | New content (None for deletions)      |
| `meta`     | `Option<Meta>`   | Extensibility metadata                |

### Terminal

Live terminal output reference:

| Field         | Type           | Description                   |
| ------------- | -------------- | ----------------------------- |
| `terminal_id` | `TerminalId`   | ID of the associated terminal |
| `meta`        | `Option<Meta>` | Extensibility metadata        |

---

## ToolCallUpdate

Incremental update to an existing tool call:

| Field          | Type                   | Description                   |
| -------------- | ---------------------- | ----------------------------- |
| `tool_call_id` | `ToolCallId`           | Which call to update          |
| `fields`       | `ToolCallUpdateFields` | Changed fields (all optional) |
| `meta`         | `Option<Meta>`         | Extensibility metadata        |

### ToolCallUpdateFields

All fields are optional — only changed fields need to be sent:

| Field        | Type                            |
| ------------ | ------------------------------- |
| `kind`       | `Option<ToolKind>`              |
| `status`     | `Option<ToolCallStatus>`        |
| `title`      | `Option<String>`                |
| `content`    | `Option<Vec<ToolCallContent>>`  |
| `locations`  | `Option<Vec<ToolCallLocation>>` |
| `raw_input`  | `Option<Value>`                 |
| `raw_output` | `Option<Value>`                 |

---

## ToolCallLocation

Identifies a file location affected by the tool call:

| Field   | Type            | Description                       |
| ------- | --------------- | --------------------------------- |
| `path`  | `String`        | File path                         |
| `range` | `Option<Range>` | Line/column range within the file |

---

## Permission Flow

Before executing certain tool calls, agents request user permission:

### RequestPermissionRequest

| Field        | Type                    | Description                         |
| ------------ | ----------------------- | ----------------------------------- |
| `session_id` | `SessionId`             | Active session                      |
| `tool_call`  | `ToolCallUpdate`        | The tool call requesting permission |
| `options`    | `Vec<PermissionOption>` | Available permission choices        |
| `meta`       | `Option<Meta>`          | Extensibility metadata              |

### PermissionOption

| Field       | Type                   | Description              |
| ----------- | ---------------------- | ------------------------ |
| `option_id` | `PermissionOptionId`   | Unique identifier        |
| `name`      | `String`               | Display name             |
| `kind`      | `PermissionOptionKind` | Type of permission grant |
| `meta`      | `Option<Meta>`         | Extensibility metadata   |

### PermissionOptionKind

| Variant        | Description                |
| -------------- | -------------------------- |
| `AllowOnce`    | Permit this single action  |
| `AllowAlways`  | Permit all similar actions |
| `RejectOnce`   | Deny this single action    |
| `RejectAlways` | Deny all similar actions   |

### RequestPermissionOutcome

| Variant     | Description                                  |
| ----------- | -------------------------------------------- |
| `Cancelled` | User dismissed without choosing              |
| `Selected`  | User chose an option — `{ option_id, meta }` |
