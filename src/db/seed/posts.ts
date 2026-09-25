/**
 * Sample articles so the blog is not empty on first run. They are written around
 * the skills in the CV — review, rewrite or unpublish them in the CMS before launch.
 */
import type { posts } from '../schema.js'

type PostSeed = Omit<typeof posts.$inferInsert, 'readingMinutes'>

export const postRows: PostSeed[] = [
  {
    slug: 'incident-vs-problem-itil',
    title: 'Incident or problem? An ITIL distinction that saves hours',
    excerpt:
      'Restoring service and removing a root cause are different jobs. Keeping incident management and problem management apart makes both of them faster.',
    tags: ['ITSM', 'ITIL'],
    isPublished: true,
    publishedAt: new Date('2026-08-20T09:00:00+07:00'),
    content: `In IT service management, "incident" and "problem" sound interchangeable. ITIL treats them as two different practices — and keeping them apart is one of the simplest ways to make a service desk calmer and faster.

## Incidents: restore service first

An incident is an unplanned interruption, or a drop in the quality of a service. A user cannot open their mailbox; a booking page times out. The goal of incident management is to **restore normal service as quickly as possible**, within the agreed SLA — even if the fix is a workaround.

That focus matters. When a team starts digging for the root cause while users are still blocked, resolution times climb and SLAs slip.

## Problems: remove the cause

A problem is the underlying cause of one or more incidents. Problem management investigates *why* things break and works to stop them from happening again. It runs on a different clock: careful root cause analysis with application and infrastructure teams, not a race against an SLA timer.

## How the two work together

1. **Log and categorise every incident consistently.** Patterns stay invisible in messy data.
2. **Link related incidents** to a single problem record once a pattern appears.
3. **Publish known errors and workarounds** to the knowledge base, so the next agent resolves the incident in minutes instead of hours.
4. **Close the problem** only when the root cause is fixed — then check that the linked incidents actually stop.

## Why it pays off

Separating the two keeps first-line support focused on users, and gives specialists the space to fix causes properly. Over time a good knowledge base turns yesterday's investigation into today's two-minute fix — and that is where service quality really improves.`,
  },
  {
    slug: 'uat-is-where-requirements-get-honest',
    title: 'UAT is where requirements get honest',
    excerpt:
      'User Acceptance Testing is the last chance to learn whether a system does what the business needs. How to plan scenarios, run sessions and reach a clean sign-off.',
    tags: ['Business Analysis', 'UAT'],
    isPublished: true,
    publishedAt: new Date('2026-07-02T09:00:00+07:00'),
    content: `User Acceptance Testing is the moment a system meets the people who will live with it. Unit tests prove the code works; UAT proves the *solution* works. Treated as a formality, it lets expensive gaps slip into production. Treated seriously, it is where requirements finally get honest.

## Plan scenarios from real work

Good UAT scenarios mirror a day in the life of a user, not a list of screens. Instead of "test the invoice form", write "a finance officer creates an invoice for a new customer, applies a discount and sends it for approval". Map every scenario back to a requirement in the BRD or SRS, so coverage is visible at a glance.

## Define "accepted" before testing starts

Agree on the exit criteria up front: which scenarios must pass, how defects are classified, and which severity blocks go-live. Without this, sign-off turns into a negotiation.

| Severity | Meaning | Blocks go-live? |
| --- | --- | --- |
| Critical | A core process cannot be completed | Yes |
| Major | The process works, with a painful workaround | Usually |
| Minor | Cosmetic or low-impact issue | No |

## Run sessions, don't just send a spreadsheet

Sit with users while they test — in person or on a call. You learn more from watching someone hesitate over a button than from any defect log. Capture observations as well as failures; they often reveal requirements that were never written down.

## Close the loop

Every defect needs an owner, a status and a re-test. Once the exit criteria are met, get a written sign-off and keep the evidence with the project documentation. It protects everyone the next time someone asks, "who approved this?"

UAT is not the end of delivery. It is the first time the business gets to say, in its own words, whether we built the right thing.`,
  },
  {
    slug: 'writing-a-brd-developers-actually-read',
    title: 'Writing a BRD developers actually read',
    excerpt:
      'A Business Requirement Document only works if the people building the system use it. Five habits that keep a BRD short, testable and alive through delivery.',
    tags: ['Business Analysis', 'Documentation'],
    isPublished: true,
    publishedAt: new Date('2026-05-14T09:00:00+07:00'),
    content: `A Business Requirement Document is meant to be the shared source of truth between the business and the team building the system. In practice, many BRDs are written once, signed off, and never opened again. The problem is rarely the template — it is how the document is written.

These are the habits that keep a BRD useful from kickoff to go-live.

## 1. Start from the problem, not the feature list

Before listing requirements, describe the business problem in two or three sentences: what happens today, why it hurts, and how the organisation will know it is fixed. Every requirement that follows should trace back to that statement. If one doesn't, it is either missing context or out of scope.

## 2. Write requirements that can be tested

"The system should be fast and easy to use" cannot be verified. "An admin can export the monthly report to Excel in under 10 seconds" can. A useful check for every requirement: could someone write a UAT scenario for it without asking what you meant?

## 3. Separate the *what* from the *how*

The BRD describes what the business needs. The SRS describes how the system will satisfy it. Mixing the two locks the team into a solution before the options have been explored — and makes the document harder for business stakeholders to review.

## 4. Draw the process before you describe it

A BPMN diagram or a simple flowchart often replaces pages of prose. Stakeholders spot a missing approval step in a diagram far faster than in paragraph fourteen of section three. Keep each diagram next to the requirements it explains.

## 5. Keep it alive

Requirements change. Version the document, record every change with a date and a reason, and link it from wherever the team actually works — the Jira epic, the Confluence space, the project channel. A BRD nobody can find is a BRD nobody reads.

---

A BRD is not paperwork. It is the cheapest place to find a misunderstanding — long before it becomes a bug.`,
  },
]
