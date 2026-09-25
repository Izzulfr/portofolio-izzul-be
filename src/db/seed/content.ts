/**
 * The portfolio's starting content, taken from Izzul Faturrizky's CV.
 * Everything here is editable in the CMS afterwards; the seed only fills empty tables.
 * Image paths point at files in the frontend repository (public/media).
 */
import type {
  certifications,
  education,
  experiences,
  organizations,
  profile,
  projects,
  siteSettings,
  skillGroups,
  socialLinks,
  stats,
} from '../schema.js'

type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert']

export const profileRow: Insert<typeof profile> = {
  id: 1,
  name: 'Izzul Faturrizky',
  headline: 'Software Builder',
  roles: ['IT Business Analyst', 'Project Coordinator', 'IT Service Management Analyst'],
  summary:
    'IT Business Analyst and Project Coordinator. I turn business needs into clear requirements, visible processes and software that gets delivered — from the first stakeholder conversation to UAT sign-off.',
  bio: [
    "I'm Izzul — an IT Business Analyst and Project Coordinator based in Tangerang, Indonesia. I work between the people who need software and the people who build it, and my job is to make sure both sides mean the same thing.",
    'Day to day that means gathering and analysing requirements, writing BRDs, SRSs and PRDs, modelling processes in BPMN and UML, and running User Acceptance Testing until a system does what the business actually needs.',
    'At PT. Aero System Indonesia (Garuda Indonesia Group) I manage incidents and service requests across Garuda Indonesia, Citilink and Aerotrans. As a freelance project coordinator at GIZ Technology, I run several system development projects in parallel — timelines, documentation and the conversations that keep clients and developers aligned.',
    "I'm grounded in ITIL, Agile/Scrum, SDLC and PMBOK, and I'm currently pursuing a Master's degree in Informatics Engineering at Universitas Pamulang, focusing on IT Governance.",
  ].join('\n\n'),
  location: 'Tangerang, Indonesia',
  email: 'izzulfaturrizky@gmail.com',
  avatarUrl: null,
  resumeUrl: null,
  availability: 'Open to collaborations',
  isAvailable: true,
}

export const settingsRow: Insert<typeof siteSettings> = {
  id: 1,
  siteTitle: 'Izzul Faturrizky — Software Builder',
  siteDescription:
    'Portfolio of Izzul Faturrizky, an IT Business Analyst and Project Coordinator in Tangerang, Indonesia — requirements, process design and delivery for software that works.',
  ogImageUrl: null,
  heroTitle: 'I turn business needs into software that *ships*.',
  heroSubtitle:
    'IT Business Analyst & Project Coordinator. I write the requirements, model the processes and keep delivery moving — from the first workshop to UAT sign-off.',
  processSteps: [
    {
      title: 'Discover',
      description: 'Stakeholder conversations and requirement gathering to find what the business really needs.',
    },
    {
      title: 'Define',
      description: 'BRD, SRS and PRD that turn those needs into clear, testable scope.',
    },
    {
      title: 'Design',
      description: 'BPMN, UML and flowcharts that make the process visible before it is built.',
    },
    {
      title: 'Deliver',
      description: 'Timelines and stakeholder coordination that keep the build moving.',
    },
    {
      title: 'Validate',
      description: 'UAT, user guides and SOPs so the system is ready for the people using it.',
    },
  ],
  contactTitle: "Let's build something that *works*.",
  contactText:
    'Have a system to plan, a process to untangle or a project that needs steady coordination? Send a message — I read every one.',
  footerNote: 'Built with React, Express and PostgreSQL.',
}

export const statRows: Insert<typeof stats>[] = [
  { value: '4+', label: 'Years in IT delivery and support' },
  { value: '5+', label: 'Projects coordinated in parallel' },
  { value: '3', label: 'Airline entities supported' },
  { value: '6', label: 'Systems analysed and documented' },
]

export const socialRows: Insert<typeof socialLinks>[] = [
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/izzul-faturrizky', icon: 'linkedin' },
  { label: 'Email', url: 'mailto:izzulfaturrizky@gmail.com', icon: 'email' },
]

export const experienceRows: Insert<typeof experiences>[] = [
  {
    company: 'PT. Aero System Indonesia (Garuda Indonesia Group)',
    role: 'IT Service Management Analyst',
    employmentType: null,
    location: 'Tangerang, Indonesia',
    period: 'Dec 2024 — Present',
    isCurrent: true,
    highlights: [
      'Manage incidents and service requests across Garuda Indonesia, Citilink and Aerotrans using ITSM tools within SLA targets, keeping service availability high across entities.',
      'Perform root cause analysis with application and infrastructure teams to resolve system issues.',
      'Translate user-reported issues into structured technical insights that support system improvement initiatives.',
      'Administer Microsoft 365 (mailbox configuration, routing, security policy), Active Directory and Exchange.',
      'Write technical documentation and knowledge base articles that make issue resolution faster.',
    ],
    tags: ['ITSM', 'ITIL', 'SLA Management', 'Root Cause Analysis', 'Microsoft 365', 'Active Directory'],
  },
  {
    company: 'GIZ Technology',
    role: 'Project Coordinator',
    employmentType: 'Freelance',
    location: 'Remote',
    period: '2022 — Present',
    isCurrent: true,
    highlights: [
      'Coordinate multiple system development projects in parallel (currently 5+ active projects), covering timeline planning, requirements documentation and stakeholder coordination.',
      "Coordinated Tansdent, a gamification-based children's dental health education platform — requirements, gamification flowchart and PRD.",
      'Coordinated the National Karang Taruna Monitoring System, tracking program proposals end to end — proposal, business process documentation and implementation timeline.',
      'Coordinated a school attendance system, a stock/issuer data management system, and a furniture data and invoice system with automatic integration.',
      'Serve as the main liaison between the development team and clients so requirements are conveyed accurately.',
    ],
    tags: ['Project Coordination', 'Requirements', 'PRD', 'Timeline Planning', 'Stakeholder Management'],
  },
  {
    company: 'PT. Importa Jaya Abadi',
    role: 'IT Business Analyst',
    employmentType: null,
    location: 'Yogyakarta, Indonesia',
    period: 'Jan 2024 — Apr 2024',
    isCurrent: false,
    highlights: [
      'Gathered and analysed business requirements for ERP system enhancements to improve operational efficiency.',
      'Produced Business Requirement Documents (BRD) and Software Requirement Specifications (SRS).',
      'Designed business process models in BPMN and UML to visualise system workflows.',
      'Led User Acceptance Testing (UAT) to make sure system functionality matched business needs.',
      'Acted as liaison between ERP vendors and internal stakeholders to ensure accurate requirement translation.',
    ],
    tags: ['ERP', 'BRD', 'SRS', 'BPMN', 'UML', 'UAT'],
  },
  {
    company: 'Pijar Sekolah by Telkom Indonesia',
    role: 'IT Helpdesk',
    employmentType: 'Part-time',
    location: 'Yogyakarta, Indonesia',
    period: 'Aug 2023 — Nov 2023',
    isCurrent: false,
    highlights: [
      'Analysed business processes and identified opportunities for digital product improvement.',
      'Built an automated reminder system with Google Apps Script, improving operational efficiency.',
      'Conducted data analysis and market research to support product development decisions.',
    ],
    tags: ['Process Analysis', 'Google Apps Script', 'Market Research'],
  },
  {
    company: 'PT. Telekomunikasi Indonesia Tbk',
    role: 'Business Developer Intern',
    employmentType: 'Internship',
    location: 'Indonesia',
    period: 'Jul 2022 — Oct 2022',
    isCurrent: false,
    highlights: [
      'Provided technical troubleshooting and user support for an e-learning platform.',
      'Resolved 90% of user issues related to access, network and account configuration.',
      'Delivered training sessions that improved system adoption among users.',
    ],
    tags: ['User Support', 'Troubleshooting', 'Training'],
  },
]

export const projectRows: Insert<typeof projects>[] = [
  {
    slug: 'school-attendance-system',
    title: 'School Attendance System',
    summary:
      'Student attendance recording for schools — teachers, students and guardians in one dashboard.',
    role: 'Project Coordinator',
    client: 'GIZ Technology',
    category: 'Education',
    // The file lives in portfolio-frontend/public/media/projects/.
    coverUrl: '/media/projects/school-attendance-system.gif',
    coverAlt: 'Walkthrough of the school attendance dashboard with teacher, student and guardian totals',
    deliverables: ['Requirements', 'Business process'],
    isFeatured: true,
    content: `## Overview

A student attendance recording system for schools. Teachers record attendance in one place, and the school gets a clear view of its teachers, students and guardians.

## My role

As project coordinator at GIZ Technology, I owned the requirements side of the project and kept the school and the development team aligned.

- Gathered requirements with the client and translated them for the developers
- Mapped the attendance business process, from daily recording to reporting
- Planned the timeline and acted as the main liaison between the client and the development team`,
  },
  {
    slug: 'stock-issuer-data-management',
    title: 'Stock & Issuer Data Management System',
    summary:
      'A platform that brings issuer profiles and key financial figures — revenue, profit and growth — into one searchable place.',
    role: 'Project Coordinator',
    client: 'GIZ Technology',
    category: 'Business',
    coverUrl: '/media/projects/stock-issuer-data-management.gif',
    coverAlt: 'Walkthrough of the issuer data platform showing key financials and growth rates',
    deliverables: ['Requirements', 'Process documentation'],
    isFeatured: true,
    content: `## Overview

A data management platform for stock issuers. It collects issuer profiles and key financial figures — revenue, profit and growth rates — so they can be searched and compared in one place.

## My role

- Gathered and documented the requirements for managing issuer data
- Wrote the process documentation describing how data is collected, maintained and presented
- Coordinated delivery between the client and the development team`,
  },
  {
    slug: 'tansdent',
    title: 'Tansdent',
    summary:
      "A gamification-based education platform that helps children learn about dental health through play.",
    role: 'Project Coordinator',
    client: 'GIZ Technology',
    category: 'Education',
    deliverables: ['Requirements', 'Gamification flowchart', 'PRD'],
    isFeatured: true,
    content: `## Overview

Tansdent is a gamification-based education platform about children's dental health.

## My role

As project coordinator at GIZ Technology, I led the project from the requirements side.

- Gathered and documented the product requirements
- Designed the gamification flow as a flowchart, so the reward loop could be reviewed before anything was built
- Wrote the Product Requirements Document (PRD) the development team built from
- Planned the timeline and coordinated between the client and the developers`,
  },
  {
    slug: 'erp-enhancement-importa-jaya-abadi',
    title: 'ERP Enhancement — PT. Importa Jaya Abadi',
    summary:
      'Requirements, process models and acceptance testing for ERP enhancements that improved operational efficiency.',
    role: 'IT Business Analyst',
    client: 'PT. Importa Jaya Abadi',
    category: 'Enterprise',
    year: '2024',
    deliverables: ['BRD', 'SRS', 'BPMN / UML', 'UAT'],
    isFeatured: true,
    content: `## Overview

PT. Importa Jaya Abadi needed enhancements to its ERP system to improve operational efficiency. I worked as the IT Business Analyst between the internal stakeholders and the ERP vendor.

## What I did

- Gathered and analysed the business requirements for the ERP enhancements
- Produced the Business Requirement Document (BRD) and the Software Requirement Specification (SRS)
- Modelled the business processes in BPMN and UML to visualise the system workflows
- Led User Acceptance Testing to confirm the system matched business needs
- Acted as the liaison between the ERP vendor and internal stakeholders, so requirements were translated accurately`,
  },
  {
    slug: 'national-karang-taruna-monitoring-system',
    title: 'National Karang Taruna Monitoring System',
    summary:
      'End-to-end tracking of program proposals for Karang Taruna, from submission through review and monitoring.',
    role: 'Project Coordinator',
    client: 'GIZ Technology',
    category: 'Public sector',
    deliverables: ['Client proposal', 'Business process', 'Implementation timeline'],
    content: `## Overview

A national monitoring system for Karang Taruna, Indonesia's community youth organisation. It tracks program proposals end to end — from submission to review and follow-up.

## My role

- Prepared the client proposal that defined the scope of the system
- Documented the business process for proposal submission, review and monitoring
- Planned the implementation timeline and coordinated delivery with the development team`,
  },
  {
    slug: 'furniture-data-invoice-system',
    title: 'Furniture Data & Invoice System',
    summary:
      'Furniture data recording with automatic invoice integration, so product records flow straight into invoices.',
    role: 'Project Coordinator',
    client: 'GIZ Technology',
    category: 'Business',
    deliverables: ['Requirements', 'Business process'],
    content: `## Overview

A furniture data recording system with automatic invoice integration: product records flow straight into invoices instead of being typed in twice.

## My role

- Gathered the requirements for product records and the invoicing flow
- Documented the business process that connects data entry to invoice generation
- Coordinated the timeline and communication between the client and the developers`,
  },
]

export const skillGroupRows: Insert<typeof skillGroups>[] = [
  {
    title: 'Business Analysis & Documentation',
    description: 'Turning needs into scope that can be built and tested.',
    items: [
      'BRD',
      'SRS',
      'PRD',
      'Client Proposals',
      'Flowcharts',
      'BPMN / UML',
      'Requirement Analysis',
      'Functional Specification',
      'Technical Writing',
      'User Guides',
      'SOP',
    ],
  },
  {
    title: 'Project & Process Management',
    description: 'Keeping delivery predictable and people aligned.',
    items: [
      'Timeline Planning',
      'Stakeholder Coordination',
      'Agile (Scrum / Kanban)',
      'SDLC',
      'PMBOK',
      'ITIL',
    ],
  },
  {
    title: 'IT Service & Application Support',
    description: 'Keeping systems available for the people who depend on them.',
    items: [
      'ITSM',
      'Microsoft 365 Admin Center',
      'Exchange Admin Center',
      'Active Directory',
      'Azure (Basic)',
      'SLA Management',
      'Ticketing Systems',
    ],
  },
  {
    title: 'Tools',
    description: 'Where the work gets written, drawn and tracked.',
    items: ['Jira', 'Confluence', 'Notion', 'Draw.io', 'Visio', 'Figma', 'Miro', 'Google Workspace'],
  },
  {
    title: 'Languages',
    description: null,
    items: ['Bahasa Indonesia (Native)', 'English (Intermediate)'],
  },
]

export const educationRows: Insert<typeof education>[] = [
  {
    institution: 'Universitas Pamulang',
    degree: 'Master of Informatics Engineering (S2)',
    field: 'IT Governance',
    period: '2025 — 2027 (expected)',
    description: 'Expected graduation in 2027, with conferral in 2028.',
  },
  {
    institution: 'Universitas Ahmad Dahlan',
    degree: 'Bachelor of Information System (S.Kom)',
    field: 'Strategic IT Business Development & System Analysis',
    period: 'Aug 2019 — Oct 2023',
    description: 'GPA 3.66 / 4.00',
  },
]

export const certificationRows: Insert<typeof certifications>[] = [
  { name: 'Getting Started with Azure DevOps Boards', year: '2025' },
  { name: 'How to Create a Jira SCRUM Project', year: '2025' },
  { name: 'PMP Project Management — Fundamental Concepts for Beginners', year: '2025' },
  { name: 'Intermediate Multimedia Designer', issuer: 'BNSP', year: '2023' },
  { name: 'UI/UX Training', issuer: 'Ruang Ekspresi UAD', year: '2022' },
]

export const organizationRows: Insert<typeof organizations>[] = [
  {
    name: 'Pers Mahasiswa Poros',
    role: 'Leader',
    period: 'Nov 2019 — May 2023',
    description:
      'Student media organisation focused on journalism and editorial writing. Built leadership, analytical thinking, organisational management, communication, and data research and visualisation skills.',
  },
  {
    name: 'Google Developer Student Club',
    role: 'Creative Media',
    period: 'Aug 2021 — Aug 2022',
    description:
      'Technology community initiated by Google. Developed people development, programming and graphic design skills.',
  },
  {
    name: 'Information Systems Student Association',
    role: 'Literature and Development',
    period: 'Dec 2020 — Dec 2021',
    description:
      'Campus organisation for the Information Systems programme. Developed public speaking, organisational management and event coordination skills.',
  },
]
