import type { DocumentType } from '../types/schema';

export interface DocumentTemplate {
  id: string;
  label: string;
  name?: string;
  documentType: DocumentType;
  defaultDocType?: DocumentType;
  description: string;
  icon: string;
  contentJson: Record<string, any>;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'rfc',
    label: 'Request for Comments (RFC)',
    documentType: 'RFC',
    icon: '📋',
    description: 'Propose architectural or systems changes for team review',
    contentJson: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Problem Statement' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Describe the engineering problem, user pain point, or system bottleneck.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Background & Context' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Current system behavior, telemetry, and limitations.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Proposed Architecture' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'High-level topology, technical specifications, and components.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'API & Data Contract' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Endpoints, schemas, and payload specifications.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Alternatives Considered' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Alternative solutions analyzed and why they were rejected.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Security & Rollout Plan' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Rollout phases, canary validation, and disaster recovery.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Open Questions' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Unresolved technical tradeoffs requiring team consensus.' }] },
      ]
    }
  },
  {
    id: 'adr',
    label: 'Architecture Decision Record (ADR)',
    documentType: 'SPEC',
    icon: '⚖️',
    description: 'Document an immutable architectural choice, rationale, and consequences',
    contentJson: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Context & Problem Statement' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'What is the decision context, forces at play, and constraints?' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Decision' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'We will use [Technology / Pattern] because [Rationale]...' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Status' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'PROPOSED / ACCEPTED / DEPRECATED' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Consequences' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Positive Impact' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Benefits, performance gains, or reduced complexity.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Negative Impact & Tradeoffs' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Drawbacks, operational overhead, and migration costs.' }] },
      ]
    }
  },
  {
    id: 'tech-spec',
    label: 'Technical Specification',
    documentType: 'SPEC',
    icon: '🏗️',
    description: 'Detailed blueprint for implementing a complex feature or service',
    contentJson: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Overview & Goals' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Executive overview and measurable success metrics.' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Non-Goals' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Features and requirements explicitly out of scope for v1.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'System Architecture' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Diagrams, service boundaries, and state machines.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Data Storage & Migrations' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Database tables, indexing strategy, and partition keys.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Observability & Monitoring' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Metrics, alerts, structured log attributes, and dashboards.' }] },
      ]
    }
  },
  {
    id: 'postmortem',
    label: 'Incident Postmortem (RCA)',
    documentType: 'NOTE',
    icon: '🔍',
    description: 'Blameless root cause analysis, incident timeline, and prevention action items',
    contentJson: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Incident Summary' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Date, duration, customer impact, and severity level.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Timeline (UTC)' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '- 14:02 UTC: Alert triggered...\n- 14:15 UTC: Incident response room opened...\n- 14:45 UTC: Mitigation deployed...' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Root Cause Analysis' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Deep technical explanation of the failure mode and triggering conditions.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Action Items & Prevention' }] },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Add automated regression test for failing path' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Tune alerting threshold on p99 latency' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Update runbook documentation' }] }] },
          ]
        },
      ]
    }
  },
  {
    id: 'meeting-notes',
    label: 'Engineering Sync Notes',
    documentType: 'MEETING',
    icon: '📝',
    description: 'Structured agenda, technical decisions, and assigned action items',
    contentJson: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Attendees & Date' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Participants: \nDate: ' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Agenda Topics' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Topic 1' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Topic 2' }] }] },
        ]},
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Key Decisions' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Summary of agreed outcomes.' }] },
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Action Items' }] },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Action item 1' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Action item 2' }] }] },
          ]
        },
      ]
    }
  },
];
