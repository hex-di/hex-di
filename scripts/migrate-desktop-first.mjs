#!/usr/bin/env node

/**
 * ADR-016 Desktop-First Migration Script
 * Transforms all 85 capability files (Tiers A-F) to make Desktop App the primary surface.
 */

import fs from 'fs';
import path from 'path';

const CAPS_DIR = 'spec/specforge/capabilities';

// ─── Tier Assignments ───────────────────────────────────────────────────────

const TIER_A = ['040', '076', '078', '080', '082'];
const TIER_B = ['005', '009', '012', '018', '019', '023', '027', '047', '054', '060', '065', '067', '071', '073', '075', '084', '086'];
const TIER_C = ['001', '002', '003', '008', '010', '013', '014', '015', '016', '017', '020', '025', '026', '028', '029', '036', '037', '038', '042', '044', '045', '046', '048', '053', '056', '057', '058', '059', '061', '062', '063'];
const TIER_D = ['064', '066', '068', '074', '090'];
const TIER_E = ['006', '021', '022', '030', '031', '032', '033', '034', '035', '041', '043', '055', '069', '070', '072'];
const TIER_F = ['004', '011', '024', '077', '079', '081', '083', '085', '087', '088', '089', '091'];
const TIER_G = ['007', '039', '049', '050', '051', '052'];

function getTier(id) {
  const num = id.replace('UX-SF-', '');
  if (TIER_A.includes(num)) return 'A';
  if (TIER_B.includes(num)) return 'B';
  if (TIER_C.includes(num)) return 'C';
  if (TIER_D.includes(num)) return 'D';
  if (TIER_E.includes(num)) return 'E';
  if (TIER_F.includes(num)) return 'F';
  if (TIER_G.includes(num)) return 'G';
  return null;
}

// ─── Panel Registry ─────────────────────────────────────────────────────────

const PANEL_REGISTRY = {
  '001': { panel: 'Flow Launcher', uiActions: 'Open Flow Launcher \u2192 Select flow from list \u2192 Click "Run"', firstAction: 'Open Flow Launcher', selectAction: 'Select "spec-verify" from flow list', confirmAction: 'Click "Run"' },
  '002': { panel: 'Flow Launcher', uiActions: 'Open Flow Launcher \u2192 Select flow \u2192 Open Preset dropdown \u2192 Select preset \u2192 Click "Run"', firstAction: 'Open Flow Launcher', selectAction: 'Select flow \u2192 Open Preset dropdown \u2192 Select preset', confirmAction: 'Click "Run"' },
  '003': { panel: 'Flow Launcher', uiActions: 'Open Flow Launcher \u2192 Select flow \u2192 Click "Estimate Cost"', firstAction: 'Open Flow Launcher', selectAction: 'Select flow', confirmAction: 'Click "Estimate Cost"' },
  '004': { panel: 'Flow Monitor', uiActions: 'Open Flow Monitor \u2192 Select running flow \u2192 View live gauges', firstAction: 'Open Flow Monitor', selectAction: 'Select running flow', confirmAction: 'View live gauges' },
  '005': { panel: 'Flow Control', uiActions: 'Open Flow Control \u2192 Select running flow \u2192 Click "Pause" / "Resume" / "Cancel"', firstAction: 'Open Flow Control', selectAction: 'Select running flow', confirmAction: 'Click "Pause"' },
  '006': { panel: 'Flow History', uiActions: 'Open Flow History \u2192 Filter by type/date \u2192 Select run \u2192 Click "Compare"', firstAction: 'Open Flow History', selectAction: 'Filter by type/date \u2192 Select run', confirmAction: 'Click "Compare"' },
  '008': { panel: 'Flow Registry', uiActions: 'Open Flow Registry \u2192 Click "Register Flow" \u2192 Upload definition \u2192 Click "Save"', firstAction: 'Open Flow Registry', selectAction: 'Click "Register Flow" \u2192 Upload definition', confirmAction: 'Click "Save"' },
  '009': { panel: 'Graph Explorer', uiActions: 'Open Graph Explorer \u2192 Enter natural language query \u2192 Click "Search"', firstAction: 'Open Graph Explorer', selectAction: 'Enter natural language query', confirmAction: 'Click "Search"' },
  '010': { panel: 'Graph Explorer', uiActions: 'Open Graph Explorer \u2192 Switch to Analytical tab \u2192 Select query template \u2192 Click "Run"', firstAction: 'Open Graph Explorer', selectAction: 'Switch to Analytical tab \u2192 Select query template', confirmAction: 'Click "Run"' },
  '011': { panel: 'Graph Explorer', uiActions: 'Open Graph Explorer \u2192 Switch to Visual tab \u2192 Click nodes to expand \u2192 Drag to rearrange', firstAction: 'Open Graph Explorer', selectAction: 'Switch to Visual tab', confirmAction: 'Click nodes to expand' },
  '012': { panel: 'Graph Explorer', uiActions: 'Open Graph Explorer \u2192 Switch to Cypher tab \u2192 Enter query \u2192 Click "Execute"', firstAction: 'Open Graph Explorer', selectAction: 'Switch to Cypher tab \u2192 Enter query', confirmAction: 'Click "Execute"' },
  '013': { panel: 'Import/Export', uiActions: 'Open Import/Export \u2192 Select "Import Markdown" \u2192 Browse for file \u2192 Click "Import"', firstAction: 'Open Import/Export', selectAction: 'Select "Import Markdown" \u2192 Browse for file', confirmAction: 'Click "Import"' },
  '014': { panel: 'Import/Export', uiActions: 'Open Import/Export \u2192 Select "Import OpenAPI" \u2192 Browse for file \u2192 Click "Import"', firstAction: 'Open Import/Export', selectAction: 'Select "Import OpenAPI" \u2192 Browse for file', confirmAction: 'Click "Import"' },
  '015': { panel: 'Import/Export', uiActions: 'Open Import/Export \u2192 Select "Export" \u2192 Choose format \u2192 Select nodes \u2192 Click "Export"', firstAction: 'Open Import/Export', selectAction: 'Select "Export" \u2192 Choose format \u2192 Select nodes', confirmAction: 'Click "Export"' },
  '016': { panel: 'Import/Export', uiActions: 'Open Import/Export \u2192 Click "Manage Adapters" \u2192 Click "Register Adapter" \u2192 Configure \u2192 Click "Save"', firstAction: 'Open Import/Export', selectAction: 'Click "Manage Adapters" \u2192 Click "Register Adapter" \u2192 Configure', confirmAction: 'Click "Save"' },
  '017': { panel: 'Flow Control', uiActions: 'Open Flow Control \u2192 Select running flow \u2192 Click "Inject Feedback" \u2192 Enter feedback \u2192 Click "Submit"', firstAction: 'Open Flow Control', selectAction: 'Select running flow \u2192 Click "Inject Feedback"', confirmAction: 'Enter feedback \u2192 Click "Submit"' },
  '018': { panel: 'Approval Queue', uiActions: 'Open Approval Queue \u2192 Select pending transition \u2192 Review outputs \u2192 Click "Approve" / "Reject"', firstAction: 'Open Approval Queue', selectAction: 'Select pending transition \u2192 Review outputs', confirmAction: 'Click "Approve" / "Reject"' },
  '019': { panel: 'Approval Queue', uiActions: 'Open Approval Queue \u2192 Select clarification request \u2192 Enter response \u2192 Click "Submit"', firstAction: 'Open Approval Queue', selectAction: 'Select clarification request', confirmAction: 'Enter response \u2192 Click "Submit"' },
  '020': { panel: 'Flow Control', uiActions: 'Open Flow Control \u2192 Select running flow \u2192 Click "Force Convergence" / "Add Iteration"', firstAction: 'Open Flow Control', selectAction: 'Select running flow', confirmAction: 'Click "Force Convergence" / "Add Iteration"' },
  '021': { panel: 'Shared Flows', uiActions: 'Open Shared Flows \u2192 Select team flow \u2192 View live progress', firstAction: 'Open Shared Flows', selectAction: 'Select team flow', confirmAction: 'View live progress' },
  '022': { panel: 'Comments', uiActions: 'Open artifact \u2192 Click "Add Comment" \u2192 Enter text \u2192 Click "Post"', firstAction: 'Open artifact', selectAction: 'Click "Add Comment"', confirmAction: 'Enter text \u2192 Click "Post"' },
  '023': { panel: 'Approval Queue', uiActions: 'Open Approval Queue \u2192 Select agent change \u2192 Review diff \u2192 Click "Approve" / "Reject"', firstAction: 'Open Approval Queue', selectAction: 'Select agent change \u2192 Review diff', confirmAction: 'Click "Approve" / "Reject"' },
  '024': { panel: 'Project Switcher', uiActions: 'Click Project Switcher \u2192 Select project from list', firstAction: 'Click Project Switcher', selectAction: 'Select project from list', confirmAction: '' },
  '025': { panel: 'Flow Control', uiActions: 'Open Flow Control \u2192 Select flow \u2192 Click "Transfer Ownership" \u2192 Select new owner \u2192 Click "Confirm"', firstAction: 'Open Flow Control', selectAction: 'Select flow \u2192 Click "Transfer Ownership"', confirmAction: 'Select new owner \u2192 Click "Confirm"' },
  '026': { panel: 'Agent Backends', uiActions: 'Open Agent Backends \u2192 Click "Register Backend" \u2192 Configure connection \u2192 Click "Save"', firstAction: 'Open Agent Backends', selectAction: 'Click "Register Backend" \u2192 Configure connection', confirmAction: 'Click "Save"' },
  '027': { panel: 'Agent Backends', uiActions: 'Open Agent Backends \u2192 View health dashboard \u2192 Select backend for details', firstAction: 'Open Agent Backends', selectAction: 'View health dashboard', confirmAction: 'Select backend for details' },
  '028': { panel: 'MCP Configuration', uiActions: 'Open MCP Configuration \u2192 Select agent role \u2192 Add/remove MCP servers \u2192 Click "Save"', firstAction: 'Open MCP Configuration', selectAction: 'Select agent role \u2192 Add/remove MCP servers', confirmAction: 'Click "Save"' },
  '029': { panel: 'Agent Roles', uiActions: 'Open Agent Roles \u2192 Click "Create Role" \u2192 Select template \u2192 Customize \u2192 Click "Save"', firstAction: 'Open Agent Roles', selectAction: 'Click "Create Role" \u2192 Select template \u2192 Customize', confirmAction: 'Click "Save"' },
  '030': { panel: 'Session Inspector', uiActions: 'Open Session Inspector \u2192 Select session \u2192 View decision log and tool calls', firstAction: 'Open Session Inspector', selectAction: 'Select session', confirmAction: 'View decision log and tool calls' },
  '031': { panel: 'Session Inspector', uiActions: 'Open Session Inspector \u2192 Select session \u2192 Browse composed chunks \u2192 Expand context', firstAction: 'Open Session Inspector', selectAction: 'Select session', confirmAction: 'Browse composed chunks \u2192 Expand context' },
  '032': { panel: 'Session Inspector', uiActions: 'Open Session Inspector \u2192 Select completed session \u2192 Click "Replay" \u2192 Step through', firstAction: 'Open Session Inspector', selectAction: 'Select completed session', confirmAction: 'Click "Replay" \u2192 Step through' },
  '033': { panel: 'Session Inspector', uiActions: 'Open Session Inspector \u2192 Select session A \u2192 Click "Diff" \u2192 Select session B \u2192 View side-by-side', firstAction: 'Open Session Inspector', selectAction: 'Select session A', confirmAction: 'Click "Diff" \u2192 Select session B' },
  '034': { panel: 'Session Inspector', uiActions: 'Open Session Inspector \u2192 Select session \u2192 Switch to Token Usage tab \u2192 View per-call breakdown', firstAction: 'Open Session Inspector', selectAction: 'Select session', confirmAction: 'Switch to Token Usage tab' },
  '035': { panel: 'Session Inspector', uiActions: 'Open Session Inspector \u2192 Select session replay \u2192 Click "Export Report" \u2192 Choose format \u2192 Click "Download"', firstAction: 'Open Session Inspector', selectAction: 'Select session replay', confirmAction: 'Click "Export Report" \u2192 Choose format' },
  '036': { panel: 'Project Setup', uiActions: 'Open Project Setup \u2192 Click "New Project" \u2192 Configure settings \u2192 Click "Initialize"', firstAction: 'Open Project Setup', selectAction: 'Click "New Project" \u2192 Configure settings', confirmAction: 'Click "Initialize"' },
  '037': { panel: 'Deployment Settings', uiActions: 'Open Deployment Settings \u2192 Select mode (solo/SaaS) \u2192 Configure \u2192 Click "Apply"', firstAction: 'Open Deployment Settings', selectAction: 'Select mode (solo/SaaS) \u2192 Configure', confirmAction: 'Click "Apply"' },
  '038': { panel: 'Budget Settings', uiActions: 'Open Budget Settings \u2192 Set token limits per role/flow \u2192 Click "Save"', firstAction: 'Open Budget Settings', selectAction: 'Set token limits per role/flow', confirmAction: 'Click "Save"' },
  '040': { panel: 'Notification Settings', uiActions: 'Open Notification Settings \u2192 Configure event filters \u2192 Set channels \u2192 Set quiet hours \u2192 Click "Save"', firstAction: 'Open Notification Settings', selectAction: 'Configure event filters \u2192 Set channels', confirmAction: 'Set quiet hours \u2192 Click "Save"' },
  '041': { panel: 'Cost Analytics', uiActions: 'Open Cost Analytics \u2192 Select time range \u2192 View budget zones \u2192 Drill into details', firstAction: 'Open Cost Analytics', selectAction: 'Select time range', confirmAction: 'View budget zones' },
  '042': { panel: 'Model Routing', uiActions: 'Open Model Routing \u2192 Select agent role \u2192 Assign model tier \u2192 Click "Save"', firstAction: 'Open Model Routing', selectAction: 'Select agent role \u2192 Assign model tier', confirmAction: 'Click "Save"' },
  '043': { panel: 'Escalation Events', uiActions: 'Open Escalation Events \u2192 Select event \u2192 View escalation chain and reason', firstAction: 'Open Escalation Events', selectAction: 'Select event', confirmAction: 'View escalation chain and reason' },
  '044': { panel: 'Plugin Manager', uiActions: 'Open Plugin Manager \u2192 Browse available \u2192 Click "Install" \u2192 Confirm', firstAction: 'Open Plugin Manager', selectAction: 'Browse available plugins', confirmAction: 'Click "Install" \u2192 Confirm' },
  '045': { panel: 'Plugin Manager', uiActions: 'Open Plugin Manager \u2192 Toggle enable/disable \u2192 Click "Configure" \u2192 Adjust settings', firstAction: 'Open Plugin Manager', selectAction: 'Toggle enable/disable', confirmAction: 'Click "Configure" \u2192 Adjust settings' },
  '046': { panel: 'Plugin Manager', uiActions: 'Open Plugin Manager \u2192 Select plugin \u2192 Click "Register Flows" / "Register Agents"', firstAction: 'Open Plugin Manager', selectAction: 'Select plugin', confirmAction: 'Click "Register Flows" / "Register Agents"' },
  '047': { panel: 'Agent Marketplace', uiActions: 'Open Agent Marketplace \u2192 Search/browse \u2192 View details \u2192 Click "Install"', firstAction: 'Open Agent Marketplace', selectAction: 'Search/browse \u2192 View details', confirmAction: 'Click "Install"' },
  '048': { panel: 'Agent Marketplace', uiActions: 'Open Agent Marketplace \u2192 Click "Publish" \u2192 Select pack \u2192 Configure metadata \u2192 Click "Submit"', firstAction: 'Open Agent Marketplace', selectAction: 'Click "Publish" \u2192 Select pack', confirmAction: 'Configure metadata \u2192 Click "Submit"' },
  '053': { panel: 'Compliance Settings', uiActions: 'Open Compliance Settings \u2192 Toggle "GxP Mode" \u2192 Configure audit level \u2192 Click "Activate"', firstAction: 'Open Compliance Settings', selectAction: 'Toggle "GxP Mode" \u2192 Configure audit level', confirmAction: 'Click "Activate"' },
  '054': { panel: 'Compliance Reports', uiActions: 'Open Compliance Reports \u2192 Select report type \u2192 Set date range \u2192 Click "Generate"', firstAction: 'Open Compliance Reports', selectAction: 'Select report type \u2192 Set date range', confirmAction: 'Click "Generate"' },
  '055': { panel: 'Audit Trail', uiActions: 'Open Audit Trail \u2192 Select flow \u2192 Browse timestamped entries \u2192 Filter by action type', firstAction: 'Open Audit Trail', selectAction: 'Select flow', confirmAction: 'Browse timestamped entries' },
  '056': { panel: 'Compliance Packs', uiActions: 'Open Compliance Packs \u2192 Browse available \u2192 Click "Install" \u2192 Configure \u2192 Click "Activate"', firstAction: 'Open Compliance Packs', selectAction: 'Browse available \u2192 Click "Install"', confirmAction: 'Configure \u2192 Click "Activate"' },
  '057': { panel: 'Validation Protocols', uiActions: 'Open Validation Protocols \u2192 Select protocol (IQ/OQ/PQ) \u2192 Click "Run" \u2192 Monitor progress', firstAction: 'Open Validation Protocols', selectAction: 'Select protocol (IQ/OQ/PQ)', confirmAction: 'Click "Run"' },
  '058': { panel: 'Access Matrix', uiActions: 'Open Access Matrix \u2192 Select role \u2192 Toggle permissions per resource \u2192 Click "Save"', firstAction: 'Open Access Matrix', selectAction: 'Select role \u2192 Toggle permissions per resource', confirmAction: 'Click "Save"' },
  '059': { panel: 'Permission Preview', uiActions: 'Open Permission Preview \u2192 Select role + context \u2192 Click "Preview" \u2192 View effective permissions', firstAction: 'Open Permission Preview', selectAction: 'Select role + context', confirmAction: 'Click "Preview"' },
  '060': { panel: 'Approval Queue', uiActions: 'Open Approval Queue \u2192 Select permission request \u2192 Review scope \u2192 Click "Grant" / "Deny"', firstAction: 'Open Approval Queue', selectAction: 'Select permission request \u2192 Review scope', confirmAction: 'Click "Grant" / "Deny"' },
  '061': { panel: 'Tool Isolation', uiActions: 'Open Tool Isolation \u2192 Select agent role \u2192 Configure allowed tools \u2192 Click "Save"', firstAction: 'Open Tool Isolation', selectAction: 'Select agent role \u2192 Configure allowed tools', confirmAction: 'Click "Save"' },
  '062': { panel: 'Memory Manager', uiActions: 'Open Memory Manager \u2192 View generated CLAUDE.md \u2192 Edit sections \u2192 Click "Save"', firstAction: 'Open Memory Manager', selectAction: 'View generated CLAUDE.md \u2192 Edit sections', confirmAction: 'Click "Save"' },
  '063': { panel: 'Memory Manager', uiActions: 'Open Memory Manager \u2192 Select version A \u2192 Click "Diff" \u2192 Select version B \u2192 View changes', firstAction: 'Open Memory Manager', selectAction: 'Select version A', confirmAction: 'Click "Diff" \u2192 Select version B' },
  '064': { panel: 'Memory Manager', uiActions: 'Open Memory Manager \u2192 Click "Transfer" \u2192 Select target project \u2192 Choose patterns \u2192 Click "Apply"', firstAction: 'Open Memory Manager', selectAction: 'Click "Transfer" \u2192 Select target project', confirmAction: 'Choose patterns \u2192 Click "Apply"' },
  '065': { panel: 'Structured Logs', uiActions: 'Open Structured Logs \u2192 Filter by correlation ID \u2192 Select log entry \u2192 View context', firstAction: 'Open Structured Logs', selectAction: 'Filter by correlation ID', confirmAction: 'Select log entry \u2192 View context' },
  '066': { panel: 'Trace Export', uiActions: 'Open Trace Export \u2192 Select export target \u2192 Configure format \u2192 Click "Export"', firstAction: 'Open Trace Export', selectAction: 'Select export target \u2192 Configure format', confirmAction: 'Click "Export"' },
  '067': { panel: 'System Health', uiActions: 'Open System Health \u2192 View service status \u2192 Select component for details', firstAction: 'Open System Health', selectAction: 'View service status', confirmAction: 'Select component for details' },
  '068': { panel: 'Auth & Tokens', uiActions: 'Open Auth & Tokens \u2192 Click "Log In" / Click "Generate Token" \u2192 Configure scope \u2192 Click "Create"', firstAction: 'Open Auth & Tokens', selectAction: 'Click "Log In" / Click "Generate Token"', confirmAction: 'Configure scope \u2192 Click "Create"' },
  '069': { panel: 'Organization Settings', uiActions: 'Open Organization Settings \u2192 Configure billing plan \u2192 Manage team members', firstAction: 'Open Organization Settings', selectAction: 'Configure billing plan', confirmAction: 'Manage team members' },
  '070': { panel: 'Reactive Queries', uiActions: 'Open Reactive Queries \u2192 Create subscription \u2192 Configure filters \u2192 Click "Subscribe"', firstAction: 'Open Reactive Queries', selectAction: 'Create subscription \u2192 Configure filters', confirmAction: 'Click "Subscribe"' },
  '071': { panel: 'Graph Pipeline', uiActions: 'Open Graph Pipeline \u2192 Configure mutation validators \u2192 Set ordering \u2192 Click "Save"', firstAction: 'Open Graph Pipeline', selectAction: 'Configure mutation validators \u2192 Set ordering', confirmAction: 'Click "Save"' },
  '072': { panel: 'Conflict Resolver', uiActions: 'Open Conflict Resolver \u2192 Select conflicting mutations \u2192 Choose resolution \u2192 Click "Resolve"', firstAction: 'Open Conflict Resolver', selectAction: 'Select conflicting mutations', confirmAction: 'Choose resolution \u2192 Click "Resolve"' },
  '073': { panel: 'Project Lifecycle', uiActions: 'Open Project Lifecycle \u2192 View current state \u2192 Click "Transition" \u2192 Select target state \u2192 Click "Confirm"', firstAction: 'Open Project Lifecycle', selectAction: 'View current state \u2192 Click "Transition"', confirmAction: 'Select target state \u2192 Click "Confirm"' },
  '074': { panel: 'Plugin Manager', uiActions: 'Open Plugin Manager \u2192 Click "Settings" \u2192 Configure lazy loading thresholds \u2192 Click "Save"', firstAction: 'Open Plugin Manager', selectAction: 'Click "Settings" \u2192 Configure lazy loading thresholds', confirmAction: 'Click "Save"' },
  '075': { panel: 'Permission Boundaries', uiActions: 'Open Permission Boundaries \u2192 Define scope \u2192 Set boundary rules \u2192 Click "Save"', firstAction: 'Open Permission Boundaries', selectAction: 'Define scope \u2192 Set boundary rules', confirmAction: 'Click "Save"' },
  '076': { panel: 'Notification Settings', uiActions: 'Open Notification Settings \u2192 Add classification rule \u2192 Add routing rule \u2192 Click "Save"', firstAction: 'Open Notification Settings', selectAction: 'Add classification rule \u2192 Add routing rule', confirmAction: 'Click "Save"' },
  '077': { panel: 'Skill Registry', uiActions: 'Open Skill Registry \u2192 Browse skills \u2192 Filter by source/tag \u2192 View details', firstAction: 'Open Skill Registry', selectAction: 'Browse skills \u2192 Filter by source/tag', confirmAction: 'View details' },
  '078': { panel: 'Skill Editor', uiActions: 'Open Skill Editor \u2192 Click "New Skill" \u2192 Define skill \u2192 Click "Save"', firstAction: 'Open Skill Editor', selectAction: 'Click "New Skill" \u2192 Define skill', confirmAction: 'Click "Save"' },
  '079': { panel: 'Skill Graph', uiActions: 'Open Skill Graph \u2192 View orchestration DAG \u2192 Click nodes to inspect dependencies', firstAction: 'Open Skill Graph', selectAction: 'View orchestration DAG', confirmAction: 'Click nodes to inspect dependencies' },
  '080': { panel: 'Workflow Builder', uiActions: 'Open Workflow Builder \u2192 Drag skills into sequence \u2192 Configure connections \u2192 Click "Save"', firstAction: 'Open Workflow Builder', selectAction: 'Drag skills into sequence \u2192 Configure connections', confirmAction: 'Click "Save"' },
  '081': { panel: 'Workflow Marketplace', uiActions: 'Open Workflow Marketplace \u2192 Browse/search \u2192 Click "Share" / "Install"', firstAction: 'Open Workflow Marketplace', selectAction: 'Browse/search', confirmAction: 'Click "Share" / "Install"' },
  '082': { panel: 'Workflow Runner', uiActions: 'Open Workflow Runner \u2192 Select workflow \u2192 Click "Run" \u2192 Monitor execution', firstAction: 'Open Workflow Runner', selectAction: 'Select workflow', confirmAction: 'Click "Run"' },
  '083': { panel: 'Traceability Graph', uiActions: 'Open Traceability Graph \u2192 Select spec component \u2192 View upstream/downstream links', firstAction: 'Open Traceability Graph', selectAction: 'Select spec component', confirmAction: 'View upstream/downstream links' },
  '084': { panel: 'Output Schemas', uiActions: 'Open Output Schemas \u2192 Select agent role \u2192 Define JSON schema \u2192 Click "Save"', firstAction: 'Open Output Schemas', selectAction: 'Select agent role \u2192 Define JSON schema', confirmAction: 'Click "Save"' },
  '085': { panel: 'Streaming Monitor', uiActions: 'Open Streaming Monitor \u2192 Select active agent \u2192 View live structured output', firstAction: 'Open Streaming Monitor', selectAction: 'Select active agent', confirmAction: 'View live structured output' },
  '086': { panel: 'Integrations', uiActions: 'Open Integrations \u2192 Click "Connect" \u2192 Select service \u2192 Authorize \u2192 Click "Save"', firstAction: 'Open Integrations', selectAction: 'Click "Connect" \u2192 Select service \u2192 Authorize', confirmAction: 'Click "Save"' },
  '087': { panel: 'Integrations', uiActions: 'Open Integrations \u2192 View sync status \u2192 Select integration for details', firstAction: 'Open Integrations', selectAction: 'View sync status', confirmAction: 'Select integration for details' },
  '088': { panel: 'Architecture Health', uiActions: 'Open Architecture Health \u2192 View health score \u2192 Drill into component scores', firstAction: 'Open Architecture Health', selectAction: 'View health score', confirmAction: 'Drill into component scores' },
  '089': { panel: 'Drift Alerts', uiActions: 'Open Drift Alerts \u2192 Review predictive alerts \u2192 Click alert for details', firstAction: 'Open Drift Alerts', selectAction: 'Review predictive alerts', confirmAction: 'Click alert for details' },
  '090': { panel: 'Maintenance Settings', uiActions: 'Open Maintenance Settings \u2192 Configure auto-update rules \u2192 Set schedules \u2192 Click "Save"', firstAction: 'Open Maintenance Settings', selectAction: 'Configure auto-update rules \u2192 Set schedules', confirmAction: 'Click "Save"' },
  '091': { panel: 'Update Proposals', uiActions: 'Open Update Proposals \u2192 Review AI-generated proposal \u2192 Click "Approve" / "Reject" / "Modify"', firstAction: 'Open Update Proposals', selectAction: 'Review AI-generated proposal', confirmAction: 'Click "Approve" / "Reject" / "Modify"' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getIdNum(id) {
  return id.replace('UX-SF-', '');
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { frontmatter: '', body: content, raw: '' };
  return { frontmatter: match[1], body: content.slice(match[0].length), raw: match[0] };
}

function updateSurface(frontmatter, tier, id) {
  // Parse current surface
  const surfaceMatch = frontmatter.match(/surface:\s*\[(.*?)\]/);
  if (!surfaceMatch) return frontmatter;

  const current = surfaceMatch[1].split(',').map(s => s.trim());

  let newSurface;
  switch (tier) {
    case 'A':
      // Reorder to [desktop, dashboard, cli]
      newSurface = ['desktop', 'dashboard', 'cli'];
      break;
    case 'B': {
      // [cli, dashboard] -> [desktop, dashboard, cli], preserve vscode
      newSurface = ['desktop', 'dashboard'];
      if (current.includes('vscode')) newSurface.push('vscode');
      newSurface.push('cli');
      break;
    }
    case 'C':
    case 'D':
      // [cli] -> [desktop, cli]
      newSurface = ['desktop', 'cli'];
      break;
    case 'E': {
      // [dashboard] -> [desktop, dashboard], preserve vscode/api
      newSurface = ['desktop', 'dashboard'];
      if (current.includes('vscode')) newSurface.push('vscode');
      if (current.includes('api')) newSurface.push('api');
      break;
    }
    case 'F': {
      // [dashboard, desktop] -> [desktop, dashboard], preserve vscode
      newSurface = ['desktop', 'dashboard'];
      if (current.includes('vscode')) newSurface.push('vscode');
      break;
    }
    default:
      return frontmatter;
  }

  return frontmatter.replace(
    /surface:\s*\[.*?\]/,
    `surface: [${newSurface.join(', ')}]`
  );
}

// ─── Use Case Rewriting ─────────────────────────────────────────────────────

function getPersonaFromFrontmatter(fm) {
  const match = fm.match(/persona:\s*\[(.*?)\]/);
  if (!match) return 'developer';
  const personas = match[1].split(',').map(s => s.trim());
  // Return first persona for the use case sentence
  return personas[0];
}

function personaArticle(persona) {
  // Map persona IDs to display text with article
  const map = {
    'developer': 'A developer',
    'team-lead': 'A team lead',
    'admin': 'An admin',
    'devops': 'A devops engineer',
    'compliance-officer': 'A compliance officer',
  };
  return map[persona] || `A ${persona}`;
}

function extractCliCommand(content) {
  // Try to extract the first specforge command from the file
  const match = content.match(/specforge\s+\S+(?:\s+\S+)*/);
  return match ? match[0] : null;
}

function rewriteUseCase(content, tier, idNum, persona) {
  const reg = PANEL_REGISTRY[idNum];
  if (!reg) return content;

  const useCaseStart = content.indexOf('## Use Case');
  if (useCaseStart === -1) return content;

  const nextSection = content.indexOf('\n## ', useCaseStart + 11);
  if (nextSection === -1) return content;

  const useCaseSection = content.slice(useCaseStart, nextSection);
  const lines = useCaseSection.split('\n');
  // Skip header and empty line
  const paraStart = lines.findIndex((l, i) => i > 0 && l.trim().length > 0);
  if (paraStart === -1) return content;

  const paragraphLines = [];
  for (let i = paraStart; i < lines.length; i++) {
    if (lines[i].trim() === '' && paragraphLines.length > 0) break;
    paragraphLines.push(lines[i]);
  }
  const originalParagraph = paragraphLines.join('\n');

  // Get sentences from original paragraph (all but first)
  const sentences = originalParagraph.match(/[^.!?]+[.!?]+/g) || [];
  const restSentences = sentences.slice(1).join('').trim();

  // Build new use case based on tier
  const personaText = personaArticle(persona);
  const panelName = reg.panel;
  const isDualSurface = ['A', 'B', 'C', 'D'].includes(tier);

  // Extract a verb/action from the original use case
  let actionDesc = '';
  if (sentences.length > 0) {
    // Try to extract the action from the first sentence
    const firstSentence = sentences[0].trim();
    // Look for "wants to X" or "needs to X" patterns
    const wantsMatch = firstSentence.match(/wants?\s+to\s+(.*?)(?:\s*[—\-]\s*|$)/);
    const needsMatch = firstSentence.match(/needs?\s+to\s+(.*?)(?:\s*[—\-]\s*|$)/);
    if (wantsMatch) {
      actionDesc = wantsMatch[1].replace(/\.$/, '');
    } else if (needsMatch) {
      actionDesc = needsMatch[1].replace(/\.$/, '');
    }
  }

  let newFirstSentence;
  if (actionDesc) {
    newFirstSentence = `${personaText} opens the ${panelName} in the desktop app to ${actionDesc}.`;
  } else {
    newFirstSentence = `${personaText} opens the ${panelName} in the desktop app.`;
  }

  let newParagraph;
  if (isDualSurface) {
    const cliCmd = extractCliCommand(content);
    const cliNote = cliCmd
      ? ` The same operation is accessible via CLI (\`${cliCmd}\`) for scripted/CI workflows.`
      : ' The same operation is accessible via CLI for scripted/CI workflows.';
    newParagraph = restSentences
      ? `${newFirstSentence} ${restSentences}${cliNote}`
      : `${newFirstSentence}${cliNote}`;
  } else {
    newParagraph = restSentences
      ? `${newFirstSentence} ${restSentences}`
      : newFirstSentence;
  }

  return content.replace(originalParagraph, newParagraph);
}

// ─── Steps Rewriting ────────────────────────────────────────────────────────

function rewriteSteps(content, tier, idNum) {
  const reg = PANEL_REGISTRY[idNum];
  if (!reg) return content;

  const stepsStart = content.indexOf('## Steps');
  if (stepsStart === -1) return content;

  const nextSection = content.indexOf('\n## ', stepsStart + 8);
  const stepsEnd = nextSection === -1 ? content.length : nextSection;
  const stepsSection = content.slice(stepsStart, stepsEnd);

  const lines = stepsSection.split('\n');
  const isDualSurface = ['A', 'B', 'C', 'D'].includes(tier);

  // Rewrite first step to desktop-primary
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\d+\.\s/)) {
      // Rewrite step 1
      const panelName = reg.panel;

      // Replace dashboard/CLI references in step 1
      if (lines[i].match(/dashboard|cli|terminal|command/i) || lines[i].match(/^\d+\.\s/)) {
        const stepContent = lines[i].replace(/^\d+\.\s+/, '');
        // Check if step already mentions desktop app
        if (!stepContent.toLowerCase().includes('desktop app') && !stepContent.toLowerCase().includes('desktop')) {
          if (stepContent.match(/^(Open the |Navigate to |Go to )/i)) {
            lines[i] = lines[i].replace(
              /^(\d+\.\s+).*$/,
              `$1Open the ${panelName} in the desktop app`
            );
          } else if (stepContent.match(/^(List |Select |Enter |Run |View )/i)) {
            lines[i] = `1. Open the ${panelName} in the desktop app`;
          }
        }
      }

      // For dual-surface: add CLI alternative mention if step 1 doesn't already have it
      if (isDualSurface && !lines[i].includes('CLI') && !lines[i].includes('cli')) {
        const cliCmd = extractCliCommand(content);
        if (cliCmd) {
          // Check if step 2 mentions CLI, if not modify step 1
          // We'll keep it simple - just rewrite step 1
        }
      }

      break; // Only modify first step
    }
  }

  // Replace "Open the dashboard" / "Navigate to dashboard" patterns in other steps
  const modifiedSteps = lines.map(line => {
    if (!line.match(/^\d+\.\s/)) return line;

    // Replace dashboard references
    let modified = line
      .replace(/Open the (web )?dashboard( and navigate| or desktop app)/gi, 'Open the desktop app')
      .replace(/in the (web )?dashboard/gi, 'in the desktop app')
      .replace(/on the (web )?dashboard/gi, 'in the desktop app')
      .replace(/The dashboard/g, 'The desktop app')
      .replace(/the dashboard/g, 'the desktop app')
      .replace(/Dashboard /g, 'Desktop app ');

    return modified;
  });

  const newStepsSection = modifiedSteps.join('\n');
  return content.slice(0, stepsStart) + newStepsSection + content.slice(stepsEnd);
}

// ─── Diagram Transformation for Tiers E/F ───────────────────────────────────

function transformDiagramsEF(content, idNum) {
  const reg = PANEL_REGISTRY[idNum];
  if (!reg) return content;

  const panelName = reg.panel;

  // Transform ASCII diagram: replace Dashboard participant
  let result = content;

  // Replace Dashboard box in ASCII
  // Pattern: │ Dashboard │ or │Dashboard│
  result = result.replace(/│\s*Dashboard\s*│/g, '│ Desktop App │');

  // Replace box borders (approximate - handles common widths)
  // ┌───────────┐ for Dashboard (11-13 wide) -> adjust for Desktop App (13 wide)
  // The exact replacement depends on the box width, so we'll handle the label

  // Transform Mermaid diagram
  // Replace participant alias
  result = result.replace(
    /participant\s+Dash\s+as\s+Dashboard/g,
    `participant DesktopApp as Desktop App (${panelName})`
  );

  // Replace all Dash references in Mermaid
  result = result.replace(/(\s+)Dash(->>)/g, '$1DesktopApp$2');
  result = result.replace(/(\s+)Dash(-->>)/g, '$1DesktopApp$2');
  result = result.replace(/(>>[\+\-]?)Dash:/g, '$1DesktopApp:');
  result = result.replace(/(>>[\+\-]?)Dash\b(?!:)/g, '$1DesktopApp');
  result = result.replace(/(->>[\+\-]?)Dash\b/g, '$1DesktopApp');
  result = result.replace(/(-->>[\+\-]?)Dash\b/g, '$1DesktopApp');

  // Handle "Dev->>+Dash:" pattern
  result = result.replace(/Dash:/g, (match, offset) => {
    // Check if this is inside a mermaid block
    const before = result.slice(Math.max(0, offset - 200), offset);
    if (before.includes('```mermaid') && !before.includes('```\n')) {
      return 'DesktopApp:';
    }
    return match;
  });

  // More robust Mermaid replacement
  result = result.replace(/(\s)Dash(\s)/g, '$1DesktopApp$2');

  // Final pass: ensure all Dash references in mermaid blocks are replaced
  result = replaceMermaidParticipant(result, 'Dash', 'DesktopApp');

  return result;
}

function replaceMermaidParticipant(content, oldName, newName) {
  // Find all mermaid blocks and replace participant references
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  return content.replace(mermaidRegex, (match, mermaidContent) => {
    let updated = mermaidContent;
    // Replace all standalone occurrences of oldName
    // Be careful not to replace partial matches
    const regex = new RegExp(`\\b${oldName}\\b`, 'g');
    updated = updated.replace(regex, newName);
    return '```mermaid\n' + updated + '```';
  });
}

// ─── Two-Diagram-Set Generation for Tiers A-D ──────────────────────────────

function extractInteractionFlow(content) {
  const ifStart = content.indexOf('## Interaction Flow');
  if (ifStart === -1) return null;

  const nextSection = content.indexOf('\n## ', ifStart + 19);
  const ifEnd = nextSection === -1 ? content.length : nextSection;

  return {
    start: ifStart,
    end: ifEnd,
    section: content.slice(ifStart, ifEnd),
  };
}

function extractCodeBlocks(section) {
  const blocks = [];
  const regex = /```(\w+)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(section)) !== null) {
    blocks.push({
      type: match[1],
      content: match[2],
      full: match[0],
    });
  }
  return blocks;
}

function transformMermaidToCLI(mermaid) {
  // The existing mermaid is already CLI-centric for Tiers C/D
  // For Tiers A/B, might need to handle Dashboard references
  let result = mermaid;

  // If the mermaid uses Dashboard/Dash, we need a CLI version
  if (result.includes('participant Dash') || result.includes('as Dashboard')) {
    // This is a dashboard-centric diagram, transform to CLI
    result = result
      .replace(/participant\s+Dash\s+as\s+Dashboard/g, 'participant CLI')
      .replace(/participant\s+DesktopApp\s+as\s+Desktop App\s*\([^)]*\)/g, 'participant CLI');

    result = replaceMermaidParticipant(result, 'Dash', 'CLI');
    result = replaceMermaidParticipant(result, 'DesktopApp', 'CLI');

    // Transform user actions to CLI commands
    // "Open X" -> "specforge <command>"
    result = result.replace(/(Dev->>[\+\-]?CLI:\s*)Open\s+/g, '$1specforge ');
  }

  return result;
}

function transformMermaidToDesktop(mermaid, idNum) {
  const reg = PANEL_REGISTRY[idNum];
  if (!reg) return mermaid;

  let result = mermaid;
  const panelName = reg.panel;

  // Replace CLI participant with Desktop App
  result = result.replace(
    /participant\s+CLI\b/g,
    `participant DesktopApp as Desktop App (${panelName})`
  );

  // Replace Dashboard/Dash participant
  result = result.replace(
    /participant\s+Dash\s+as\s+Dashboard/g,
    `participant DesktopApp as Desktop App (${panelName})`
  );

  // Replace all CLI references
  result = replaceMermaidParticipant(result, 'CLI', 'DesktopApp');

  // Replace Dash references if any
  result = replaceMermaidParticipant(result, 'Dash', 'DesktopApp');

  // Transform user action messages
  // "specforge xxx" -> GUI actions
  const firstAction = reg.firstAction;
  const selectAction = reg.selectAction || '';

  // Replace first user command
  result = result.replace(
    /(Dev->>[\+\-]?DesktopApp:\s*)specforge\s+[^\n]+/,
    `$1${firstAction}`
  );

  // Replace "Open X" style actions
  result = result.replace(
    /(Dev->>[\+\-]?DesktopApp:\s*)Open\s+[^\n]+/,
    `$1${firstAction}`
  );

  // Add CLI alternative note (remove if exists)
  result = result.replace(/\s*Note over DesktopApp: CLI alternative:[^\n]*/g, '');

  // Update final response to user
  result = result.replace(
    /(DesktopApp-->>[\+\-]?Dev:\s*)Summary \+ exit code \d+/g,
    '$1Execution summary with metrics'
  );

  return result;
}

function transformAsciiToDesktop(ascii, idNum) {
  const reg = PANEL_REGISTRY[idNum];
  if (!reg) return ascii;

  let result = ascii;

  // Replace CLI box
  result = result.replace(/│\s*CLI\s*│/g, '│   Desktop App   │');
  result = result.replace(/┌──┬──┐/g, '┌────────┬────────┐');
  result = result.replace(/└──┬──┘/g, '└────────┬────────┘');
  result = result.replace(/┌─────┐/g, '┌─────────────────┐');
  result = result.replace(/└─────┘/g, '└─────────────────┘');

  // Fix the box for 5-char "CLI" -> wider box
  // Pattern: ┌─────┐ (7 dashes)
  //          │ CLI │
  //          └──┬──┘

  // Replace Dashboard box
  result = result.replace(/│\s*Dashboard\s*│/g, '│   Desktop App   │');

  // Replace "specforge" commands with GUI actions
  const firstAction = reg.firstAction;
  result = result.replace(/specforge\s+\S+(?:\s+\S+)*/g, firstAction);

  // Replace "Summary + exit code 0" with desktop-style result
  result = result.replace(/Summary \+\s*\n?\s*exit code \d+/g, 'Summary shown');
  result = result.replace(/Summary \+ exit code \d+/g, 'Summary shown');

  return result;
}

function transformAsciiToCLI(ascii) {
  let result = ascii;

  // If it has Desktop App, transform to CLI
  result = result.replace(/│\s*Desktop App\s*│/g, '│ CLI │');
  // If it has Dashboard, transform to CLI
  result = result.replace(/│\s*Dashboard\s*│/g, '│ CLI │');

  return result;
}

function generateTwoDiagramSet(content, idNum, tier) {
  const ifData = extractInteractionFlow(content);
  if (!ifData) return content;

  const blocks = extractCodeBlocks(ifData.section);
  if (blocks.length < 2) return content;

  const reg = PANEL_REGISTRY[idNum];
  if (!reg) return content;

  // Find ASCII and Mermaid blocks
  let asciiBlock = blocks.find(b => b.type === 'text');
  let mermaidBlock = blocks.find(b => b.type === 'mermaid');

  // Handle sequence diagram mermaid blocks (skip flowcharts and state diagrams)
  const sequenceMermaid = blocks.filter(b =>
    b.type === 'mermaid' && b.content.includes('sequenceDiagram')
  );
  const otherMermaid = blocks.filter(b =>
    b.type === 'mermaid' && !b.content.includes('sequenceDiagram')
  );

  if (sequenceMermaid.length > 0) {
    mermaidBlock = sequenceMermaid[0];
  }

  if (!asciiBlock || !mermaidBlock) return content;

  // Generate Desktop App versions
  const desktopAscii = transformAsciiToDesktop(asciiBlock.content, idNum);
  const desktopMermaid = transformMermaidToDesktop(mermaidBlock.content, idNum);

  // Keep/transform CLI versions
  let cliAscii = asciiBlock.content;
  let cliMermaid = mermaidBlock.content;

  // If the existing diagrams use Dashboard/Desktop, transform to CLI
  if (cliAscii.includes('Dashboard') || cliAscii.includes('Desktop App')) {
    cliAscii = transformAsciiToCLI(cliAscii);
  }
  if (cliMermaid.includes('Dashboard') || cliMermaid.includes('Desktop App')) {
    cliMermaid = transformMermaidToCLI(cliMermaid);
  }

  // Ensure CLI mermaid has CLI participant (not Desktop or Dashboard)
  if (!cliMermaid.includes('participant CLI')) {
    cliMermaid = cliMermaid
      .replace(/participant\s+DesktopApp\s+as\s+Desktop App[^\n]*/g, 'participant CLI')
      .replace(/participant\s+Dash\s+as\s+Dashboard/g, 'participant CLI');
    cliMermaid = replaceMermaidParticipant(cliMermaid, 'DesktopApp', 'CLI');
    cliMermaid = replaceMermaidParticipant(cliMermaid, 'Dash', 'CLI');
  }

  // Build new Interaction Flow section
  let newSection = '## Interaction Flow\n\n### Desktop App\n\n';
  newSection += '```text\n' + desktopAscii + '```\n\n';
  newSection += '```mermaid\n' + desktopMermaid + '```\n\n';
  newSection += '### CLI\n\n';
  newSection += '```text\n' + cliAscii + '```\n\n';
  newSection += '```mermaid\n' + cliMermaid + '```\n';

  // Preserve any additional diagram blocks (flowcharts, state diagrams, etc.)
  // that were in the original but aren't sequence diagrams
  // These go after the CLI mermaid

  return content.slice(0, ifData.start) + newSection + content.slice(ifData.end);
}

// ─── Main Processing ────────────────────────────────────────────────────────

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);

  const idMatch = frontmatter.match(/id:\s*(UX-SF-\d+)/);
  if (!idMatch) {
    console.log(`  SKIP: No ID found in ${filePath}`);
    return;
  }

  const id = idMatch[1];
  const idNum = getIdNum(id);
  const tier = getTier(id);

  if (!tier || tier === 'G') {
    console.log(`  SKIP (Tier G/unknown): ${id}`);
    return;
  }

  console.log(`  Processing ${id} (Tier ${tier})`);

  const persona = getPersonaFromFrontmatter(frontmatter);

  // Step 1: Update frontmatter surface
  const newFrontmatter = updateSurface(frontmatter, tier, id);
  let result = '---\n' + newFrontmatter + '\n---' + body;

  // Step 2: Rewrite use case
  result = rewriteUseCase(result, tier, idNum, persona);

  // Step 3: Transform diagrams
  if (tier === 'E' || tier === 'F') {
    // Single-diagram: replace Dashboard with Desktop App
    result = transformDiagramsEF(result, idNum);
  } else {
    // Tiers A-D: Two-diagram-set
    result = generateTwoDiagramSet(result, idNum, tier);
  }

  // Step 4: Rewrite steps
  result = rewriteSteps(result, tier, idNum);

  fs.writeFileSync(filePath, result);
  console.log(`  \u2713 Updated ${id}`);
}

// ─── Overview.md Update ─────────────────────────────────────────────────────

function updateOverview() {
  const overviewPath = 'spec/specforge/overview.md';
  let content = fs.readFileSync(overviewPath, 'utf-8');

  // Surface mapping for each ID
  const surfaceMap = {};

  // Tier A: desktop, dashboard, cli
  for (const n of TIER_A) surfaceMap[n] = 'desktop, dashboard, cli';
  // Tier B: desktop, dashboard, cli (some have vscode)
  for (const n of TIER_B) {
    if (['009', '012'].includes(n)) {
      surfaceMap[n] = 'desktop, dashboard, vscode, cli';
    } else {
      surfaceMap[n] = 'desktop, dashboard, cli';
    }
  }
  // Tier C+D: desktop, cli
  for (const n of [...TIER_C, ...TIER_D]) surfaceMap[n] = 'desktop, cli';
  // Tier E: desktop, dashboard (some have vscode/api)
  for (const n of TIER_E) {
    if (n === '022') surfaceMap[n] = 'desktop, dashboard, vscode';
    else if (n === '070') surfaceMap[n] = 'desktop, dashboard, api';
    else surfaceMap[n] = 'desktop, dashboard';
  }
  // Tier F: desktop, dashboard (some have vscode)
  for (const n of TIER_F) {
    if (n === '024') surfaceMap[n] = 'desktop, dashboard, vscode';
    else surfaceMap[n] = 'desktop, dashboard';
  }

  // Replace each line in the table
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/\|\s*\[capabilities\/UX-SF-(\d+)/);
    if (match) {
      const num = match[1];
      if (surfaceMap[num]) {
        // Replace the surface column (last column)
        const parts = lines[i].split('|');
        if (parts.length >= 6) {
          // parts: ['', file, id, title, persona, surface, '']
          parts[parts.length - 2] = ` ${surfaceMap[num]} `;
          lines[i] = parts.join('|');
        }
      }
    }
  }

  content = lines.join('\n');
  fs.writeFileSync(overviewPath, content);
  console.log('\u2713 Updated overview.md surface column');
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('ADR-016 Desktop-First Migration\n');

  // Get all capability files
  const files = fs.readdirSync(CAPS_DIR)
    .filter(f => f.match(/^UX-SF-\d+/))
    .sort();

  console.log(`Found ${files.length} capability files\n`);

  let processed = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(CAPS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const idMatch = content.match(/id:\s*(UX-SF-\d+)/);
      if (!idMatch) {
        console.log(`  SKIP: No ID in ${file}`);
        skipped++;
        continue;
      }
      const tier = getTier(idMatch[1]);
      if (!tier || tier === 'G') {
        console.log(`  SKIP (Tier G): ${file}`);
        skipped++;
        continue;
      }
      processFile(filePath);
      processed++;
    } catch (err) {
      console.error(`  ERROR: ${file}: ${err.message}`);
    }
  }

  console.log(`\nProcessed: ${processed}, Skipped: ${skipped}`);

  // Update overview.md
  console.log('\nUpdating overview.md...');
  updateOverview();

  console.log('\nDone!');
}

main();
