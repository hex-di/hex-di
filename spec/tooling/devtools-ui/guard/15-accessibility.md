_Previous: [14-integration.md](14-integration.md) | Next: [16-definition-of-done.md](16-definition-of-done.md)_

# 15. Accessibility

WCAG 2.1 AA compliance for all Guard Panel views. This section covers ARIA roles, keyboard navigation, screen reader support, motion preferences, and high-contrast mode.

## 15.1 Compliance Target

The Guard Panel targets WCAG 2.1 Level AA conformance:

| Principle      | Guidelines Addressed                                         |
| -------------- | ------------------------------------------------------------ |
| Perceivable    | Text alternatives, color not sole indicator, contrast ratios |
| Operable       | Keyboard accessible, no timing traps, navigable              |
| Understandable | Readable, predictable, input assistance                      |
| Robust         | Compatible with assistive technologies                       |

## 15.2 ARIA Roles and Landmarks

### Panel Structure

```html
<div role="region" aria-label="Guard Panel">
  <div role="toolbar" aria-label="Guard Panel views">
    <button role="tab" aria-selected="true" aria-controls="guard-tree-view">Tree</button>
    <button role="tab" aria-selected="false" aria-controls="guard-log-view">Log</button>
    <!-- ... 5 more tabs ... -->
  </div>
  <div role="tabpanel" id="guard-tree-view" aria-label="Policy Evaluation Tree">
    <!-- Active view content -->
  </div>
  <div role="status" aria-label="Guard Panel status" aria-live="polite">
    Port: UserService | Last: Allow | Allow: 847 Deny: 23 | Rate: 97%
  </div>
</div>
```

### View-Specific Roles

| View                   | Root ARIA Role | Description                          |
| ---------------------- | -------------- | ------------------------------------ |
| Policy Evaluation Tree | `tree`         | Navigable tree of policy nodes       |
| Decision Log           | `table`        | Sortable data table of decisions     |
| Policy Path Explorer   | `tree`         | Branching path tree                  |
| Access Flow Statistics | `img`          | SVG diagram with textual description |
| Evaluation Timeline    | `table`        | Timeline rows as table rows          |
| Role Hierarchy Graph   | `tree`         | DAG rendered as navigable tree       |
| Overview Dashboard     | `region`       | Collection of stat cards and charts  |

## 15.3 Policy Evaluation Tree Accessibility

### ARIA Tree Pattern

```html
<div role="tree" aria-label="Policy evaluation tree for UserService">
  <div role="treeitem" aria-expanded="true" aria-level="1" aria-label="AllOf: allow, 0.15ms">
    <div role="group">
      <div role="treeitem" aria-level="2" aria-label="HasRole admin: allow, 0.02ms"></div>
      <div role="treeitem" aria-expanded="true" aria-level="2" aria-label="AnyOf: allow, 0.12ms">
        <div role="group">
          <div
            role="treeitem"
            aria-level="3"
            aria-label="HasPermission user read: allow, 0.05ms"
          ></div>
          <div
            role="treeitem"
            aria-level="3"
            aria-label="HasAttribute dept equals eng: skipped, short-circuited"
          ></div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Node Announcements

| Node State | Screen Reader Announcement                             |
| ---------- | ------------------------------------------------------ |
| Allow      | "[kind] [label]: allow, [duration]"                    |
| Deny       | "[kind] [label]: deny, [reason], [duration]"           |
| Skip       | "[kind] [label]: skipped, short-circuited by [parent]" |
| Error      | "[kind] [label]: error, [error message]"               |
| Selected   | "Selected. [full node description]"                    |
| Expanded   | "Expanded. [N] children."                              |
| Collapsed  | "Collapsed."                                           |

### Keyboard Navigation

Follows the ARIA tree pattern:

| Key         | Action                                        |
| ----------- | --------------------------------------------- |
| Arrow Down  | Move to next visible treeitem                 |
| Arrow Up    | Move to previous visible treeitem             |
| Arrow Right | Expand collapsed node; or move to first child |
| Arrow Left  | Collapse expanded node; or move to parent     |
| Home        | Move to first treeitem                        |
| End         | Move to last visible treeitem                 |
| Enter       | Activate (select) focused treeitem            |
| Space       | Toggle expand/collapse                        |

## 15.4 Decision Log Accessibility

### ARIA Table Pattern

```html
<table role="table" aria-label="Guard decision log">
  <thead>
    <tr>
      <th role="columnheader" aria-sort="descending" scope="col">Timestamp</th>
      <th role="columnheader" scope="col">Port</th>
      <th role="columnheader" scope="col">Subject</th>
      <th role="columnheader" scope="col">Decision</th>
      <th role="columnheader" scope="col">Policy</th>
      <th role="columnheader" scope="col">Duration</th>
    </tr>
  </thead>
  <tbody>
    <tr role="row" aria-selected="true" tabindex="0">
      <td>14:32:01.423</td>
      <td>UserService</td>
      <td>alice</td>
      <td><span aria-label="Allow">● Allow</span></td>
      <td>allOf</td>
      <td>0.15ms</td>
    </tr>
  </tbody>
</table>
```

### Sort Announcements

When a column sort is activated:

- `aria-sort="ascending"` or `aria-sort="descending"` on the column header
- Live region announces: "Sorted by [column] [direction]"

### New Entry Announcements

When real-time updates add new entries:

- `aria-live="polite"` region announces: "New guard decision: [port] [subject] [decision]"
- Maximum 1 announcement per second (batch rapid updates)

## 15.5 Access Flow Statistics (Sankey) Accessibility

SVG diagrams are not inherently accessible. The Sankey view provides:

### Text Alternative

```html
<div role="img" aria-label="Access flow statistics diagram">
  <svg><!-- Sankey diagram --></svg>
</div>
<div class="sr-only" aria-live="polite">
  Access flow: 847 total evaluations. Top subjects: alice (45%), bob (30%), eve (25%). Top roles:
  admin (52%), viewer (35%), editor (13%). Outcomes: 95% allow, 5% deny. Deny hotspot: PaymentPort
  at 28% deny rate.
</div>
```

### Keyboard Navigation

The Sankey diagram provides keyboard-navigable nodes:

- Tab moves between Sankey columns (Subjects, Roles, Policies, Ports, Outcomes)
- Arrow Up/Down moves between nodes within a column
- Enter activates the selected node (filter/navigate)
- Each node announces: "[name]: [percentage], [count] evaluations"

## 15.6 Role Hierarchy Graph Accessibility

### ARIA Tree Representation

The DAG is presented as a tree for screen readers (with cross-references for diamond inheritance):

```html
<div role="tree" aria-label="Role hierarchy">
  <div
    role="treeitem"
    aria-expanded="true"
    aria-level="1"
    aria-label="superAdmin: 12 permissions, inherits admin, auditor"
  >
    <div role="group">
      <div
        role="treeitem"
        aria-expanded="true"
        aria-level="2"
        aria-label="admin: 7 permissions (3 direct, 4 inherited), inherits editor, viewer"
      >
        <!-- ... -->
      </div>
      <div role="treeitem" aria-level="2" aria-label="auditor: 2 permissions"></div>
    </div>
  </div>
</div>
```

### Cycle Announcements

When circular inheritance is detected:

- `aria-invalid="true"` on affected nodes
- Live region: "Warning: Circular role inheritance detected between [roleA] and [roleB]"

## 15.7 Evaluation Timeline Accessibility

### ARIA Table Pattern

```html
<table role="table" aria-label="Evaluation timeline for execution 42">
  <thead>
    <tr>
      <th scope="col">Policy Node</th>
      <th scope="col">Start Time</th>
      <th scope="col">Duration</th>
      <th scope="col">Result</th>
      <th scope="col">Type</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-label="AllOf: 0ms to 4.5ms, allow">
      <td>AllOf</td>
      <td>0ms</td>
      <td>4.5ms</td>
      <td>Allow</td>
      <td>Sync</td>
    </tr>
    <tr aria-label="HasAttribute dept: 0.4ms to 4.3ms, allow, async resolver">
      <td style="padding-left: 40px">HasAttribute "dept"</td>
      <td>0.4ms</td>
      <td>3.9ms</td>
      <td>Allow</td>
      <td>Async</td>
    </tr>
  </tbody>
</table>
```

### Duration Bars

Duration bars use `aria-hidden="true"` since the timing data is in the table cells. The visual bars are decorative.

## 15.8 Color Independence

No information is conveyed by color alone. Every color-coded element has a secondary indicator:

| Information   | Color       | Secondary Indicator                 |
| ------------- | ----------- | ----------------------------------- |
| Allow         | Green       | `●` filled circle + "Allow" text    |
| Deny          | Red         | `○` open circle + "Deny" text       |
| Error         | Amber       | `◆` diamond + "Error" text          |
| Skip          | Gray        | `◌` dashed circle + "Skip" text     |
| Short-circuit | Gray dashed | Dashed border + "(short-circuited)" |
| Async         | Blue        | `[async]` text label                |
| Cycle         | Red dashed  | `⚠` warning icon + "Circular" text  |
| Hotspot       | Red bar     | Percentage number + rank number     |

## 15.9 Contrast Ratios

All text and interactive elements meet WCAG AA contrast ratios:

| Element                    | Minimum Ratio | Actual (Light) | Actual (Dark) |
| -------------------------- | ------------- | -------------- | ------------- |
| Normal text on background  | 4.5:1         | 7.2:1          | 6.8:1         |
| Large text on background   | 3:1           | 7.2:1          | 6.8:1         |
| Allow badge text           | 4.5:1         | 4.8:1          | 5.2:1         |
| Deny badge text            | 4.5:1         | 5.1:1          | 4.9:1         |
| Muted text                 | 4.5:1         | 4.6:1          | 4.7:1         |
| Interactive element border | 3:1           | 3.2:1          | 3.5:1         |

### High Contrast Mode

When `prefers-contrast: more` is detected:

- All muted backgrounds become solid colors
- Border widths increase from 2px to 3px
- Opacity-based dimming is replaced with distinct border styles (dashed, dotted)
- Tree edges increase from 2px to 3px stroke width

## 15.10 Focus Management

### Focus Indicators

| Element Type | Focus Indicator                                          |
| ------------ | -------------------------------------------------------- |
| Buttons      | 2px solid `--hex-accent` outline with 2px offset         |
| Tree items   | 2px solid `--hex-accent` outline around the node         |
| Table rows   | Full-width background highlight + 2px left border accent |
| SVG nodes    | 3px solid `--hex-accent` stroke around the element       |
| Input fields | 2px solid `--hex-accent` border                          |

### Focus Trapping

Modal elements (educational sidebar, simulation panel, context menus) trap focus:

- Tab cycles within the modal
- Escape closes the modal and returns focus to the trigger element
- Focus moves to the first focusable element on open

### Focus Restoration

When navigating between views:

- Focus moves to the first focusable element in the new view
- When returning from a detail panel, focus returns to the last selected item
- When closing a modal, focus returns to the trigger element

## 15.11 Motion Preferences

When `prefers-reduced-motion: reduce` is detected:

| Feature                      | Standard Behavior      | Reduced Motion           |
| ---------------------------- | ---------------------- | ------------------------ |
| Tree playback animation      | 300ms node transitions | Instant state changes    |
| View switch crossfade        | 200ms fade             | Instant switch           |
| Panel slide-in/out           | 250ms translate        | Instant appear/disappear |
| Log entry slide-in           | 200ms translate        | Instant appear           |
| Sankey link hover transition | 150ms opacity          | Instant opacity change   |
| Node glow/pulse effects      | Continuous animation   | Static highlight         |
| "New" badge pulse            | 2s pulse               | Static "New" label       |
| Async spinner                | 1s rotation            | Static `[async]` label   |

## 15.12 Screen Reader Testing Requirements

| Screen Reader | Browser           | Requirement                         |
| ------------- | ----------------- | ----------------------------------- |
| VoiceOver     | Safari (macOS)    | Full tree navigation, announcements |
| NVDA          | Firefox (Windows) | Full tree navigation, announcements |
| JAWS          | Chrome (Windows)  | Full tree navigation, announcements |

### Test Scenarios

1. Navigate the policy tree using only keyboard and verify all node states are announced
2. Sort the decision log and verify sort direction is announced
3. Navigate the role hierarchy and verify inheritance relationships are described
4. Receive a real-time evaluation update and verify it is announced
5. Apply a filter and verify the filtered result count is announced
6. Open and navigate the educational sidebar using only keyboard

## 15.13 Text Sizing

The Guard Panel supports user text scaling:

| Base Size | Scaled at 200% | Behavior                                |
| --------- | -------------- | --------------------------------------- |
| 11px      | 22px           | Badge text scales; badge height grows   |
| 12px      | 24px           | Node labels scale; nodes grow           |
| 13px      | 26px           | Log entries scale; row height increases |
| 14px      | 28px           | Section headers scale                   |

All text containers use relative units (rem) for consistent scaling. Fixed-size SVG elements (icons, badges) also scale proportionally.

_Previous: [14-integration.md](14-integration.md) | Next: [16-definition-of-done.md](16-definition-of-done.md)_
