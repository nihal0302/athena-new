/** Illustrative agent catalogue for the repository prototype. Based on the 21 reference use cases in the capability deck. */
export type Access = 'available' | 'locked' | 'requested' | 'soon'
export type Route = 'Low-code' | 'Pro-code' | 'Hybrid'

export type Agent = {
  id: string
  name: string
  dept: string
  owner: string
  desc: string
  tasks: string // extra search words ("search by task")
  route: Route
  ar: boolean
  cert: boolean
  state: Access
  rating?: number
  usage?: string
  wave?: string
  pinned?: boolean
  cxo?: boolean // built for executives (CXO and their offices)
  recent?: boolean
  rec?: boolean // recommended for the signed-in role
  isNew?: boolean
  prompt: string // drops into a new chat
}

export const ENTERPRISE = 'Enterprise-wide'

export const DEPT_ICON: Record<string, string> = {
  [ENTERPRISE]: 'globe',
  'Human Resources': 'users',
  Procurement: 'doc',
  Finance: 'wallet',
  Legal: 'shield',
  Education: 'target',
  Facilities: 'layers',
  Projects: 'chart',
  Leasing: 'bank',
  Sales: 'cloud',
  Customer: 'msg',
  IT: 'chip',
  'Data & AI': 'db',
  Marketing: 'star',
  'Risk & Compliance': 'warn',
}

export const DEPTS = Object.keys(DEPT_ICON).filter((d) => d !== ENTERPRISE)

export const TRY_TASKS = ['Raise a purchase request', 'Check my leave balance', 'Review a contract', 'Summarise a meeting']

export const AGENTS: Agent[] = [
  // enterprise-wide
  { id: 'policy', name: 'Policy Assistant', dept: ENTERPRISE, owner: 'Group Governance', desc: 'Group policies and procedures, in Arabic or English.', tasks: 'policy procedure compliance rules handbook', route: 'Low-code', ar: true, cert: true, state: 'available', rating: 4.7, usage: '2.4k chats a month', pinned: true, recent: true, rec: true, prompt: 'What is the Group policy on remote working?' },
  { id: 'meeting', name: 'Meeting Companion', dept: ENTERPRISE, owner: 'Group Technology', desc: 'Summaries, actions and follow-ups from Teams meetings.', tasks: 'meeting minutes summarise teams actions follow-up', route: 'Low-code', ar: true, cert: true, state: 'available', rating: 4.5, usage: '1.9k chats a month', recent: true, rec: true, prompt: 'Summarise my last meeting and list the actions.' },
  { id: 'insights', name: 'Data Insights', dept: ENTERPRISE, owner: 'Data & Analytics', desc: 'Ask Aldar’s Gold-layer data questions in plain language and get charts.', tasks: 'data report chart kpi analytics sales numbers', route: 'Pro-code', ar: false, cert: true, state: 'locked', rating: 4.6, usage: '980 chats a month', rec: true, cxo: true, prompt: 'Which buyer segment is largest for Q1 launches?' },
  { id: 'research', name: 'Deep Research', dept: ENTERPRISE, owner: 'Group Technology', desc: 'Multi-step research across internal documents and approved sources, as a cited report.', tasks: 'research report market study cited sources', route: 'Hybrid', ar: false, cert: false, state: 'soon', wave: 'Wave 3', cxo: true, prompt: 'Research the Abu Dhabi residential market.' },
  // HR
  { id: 'hr-policy', name: 'Policy & Benefits Assistant', dept: 'Human Resources', owner: 'HR Sponsor', desc: 'Leave, benefits and policy answers; drafts HR letters for approval.', tasks: 'leave balance benefits salary letter holiday vacation', route: 'Low-code', ar: true, cert: true, state: 'available', rating: 4.6, usage: '1.2k chats a month', pinned: true, recent: true, rec: true, prompt: 'How many annual leave days do I have left?' },
  { id: 'onboard', name: 'Onboarding Coordinator', dept: 'Human Resources', owner: 'HR Sponsor', desc: 'Runs new-joiner checklists, IT access and induction.', tasks: 'new joiner induction checklist access', route: 'Hybrid', ar: false, cert: true, state: 'locked', rating: 4.4, usage: '310 runs a month', prompt: 'Start the onboarding checklist for a new joiner.' },
  { id: 'recruit', name: 'Recruitment Scheduler', dept: 'Human Resources', owner: 'HR Sponsor', desc: 'Books interviews across panels and calendars.', tasks: 'interview hiring candidate schedule', route: 'Low-code', ar: false, cert: false, state: 'soon', wave: 'Wave 2', prompt: 'Book interviews for the open analyst role.' },
  // Education
  { id: 'admissions', name: 'Admissions Enquiry Agent', dept: 'Education', owner: 'Aldar Education', desc: 'Answers parents on admissions, fees and curriculum; books school tours.', tasks: 'school fees admission parents tour curriculum', route: 'Low-code', ar: true, cert: true, state: 'available', rating: 4.3, usage: '640 chats a month', isNew: true, prompt: 'What are the admission fees for Grade 3?' },
  { id: 'teacher', name: 'Teacher Planning Assistant', dept: 'Education', owner: 'Aldar Education', desc: 'Drafts lesson plans, rubrics and differentiated worksheets.', tasks: 'lesson plan rubric worksheet teacher', route: 'Low-code', ar: false, cert: false, state: 'locked', rating: 4.1, usage: '220 chats a month', prompt: 'Draft a lesson plan on fractions for Grade 5.' },
  { id: 'schoolperf', name: 'School Performance Insights', dept: 'Education', owner: 'Aldar Education', desc: 'Plain-language questions on attendance, assessment and inspection data.', tasks: 'attendance assessment inspection results', route: 'Pro-code', ar: false, cert: false, state: 'soon', wave: 'Wave 2', prompt: 'Compare attendance across all schools.' },
  // Procurement
  { id: 'rfq', name: 'RFQ & Tender Drafter', dept: 'Procurement', owner: 'Procurement Lead', desc: 'Drafts RFQs and scopes from templates; checks mandatory clauses.', tasks: 'purchase request rfq tender quotation raise procurement draft', route: 'Low-code', ar: false, cert: true, state: 'available', rating: 4.5, usage: '410 chats a month', rec: true, isNew: true, prompt: 'Raise a purchase request for office furniture.' },
  { id: 'bids', name: 'Bid Evaluation Assistant', dept: 'Procurement', owner: 'Procurement Lead', desc: 'Pulls vendor bids into a comparison matrix and flags gaps.', tasks: 'vendor bids compare evaluate supplier', route: 'Hybrid', ar: false, cert: true, state: 'requested', rating: 4.2, usage: '90 runs a month', prompt: 'Compare the three vendor bids for the fit-out.' },
  // Finance
  { id: 'invoice', name: 'Invoice-to-PO Matching', dept: 'Finance', owner: 'Finance Controller', desc: 'Matches invoices to POs and receipts; routes exceptions for approval.', tasks: 'invoice po payment match exception', route: 'Pro-code', ar: false, cert: true, state: 'locked', rating: 4.4, usage: '1.1k runs a month', prompt: 'Which invoices have no matching PO?' },
  { id: 'variance', name: 'Variance Commentary', dept: 'Finance', owner: 'Finance Controller', desc: 'Drafts monthly budget-vs-actual commentary from Gold-layer figures.', tasks: 'budget actual variance monthly report commentary', route: 'Hybrid', ar: false, cert: true, state: 'available', rating: 4.3, usage: '150 runs a month', cxo: true, prompt: 'Draft the October budget-vs-actual commentary.' },
  // Legal
  { id: 'contract', name: 'Contract Review', dept: 'Legal', owner: 'General Counsel', desc: 'Checks a contract against Aldar’s playbook and suggests clause wording.', tasks: 'contract review clause legal agreement nda', route: 'Hybrid', ar: true, cert: true, state: 'available', rating: 4.8, usage: '380 chats a month', recent: true, rec: true, prompt: 'Review this contract against our playbook.' },
  { id: 'obligations', name: 'Obligations Tracker', dept: 'Legal', owner: 'General Counsel', desc: 'Extracts key dates and obligations from signed contracts; sends reminders.', tasks: 'obligation dates reminder renewal contract', route: 'Low-code', ar: false, cert: false, state: 'locked', rating: 4.0, usage: '60 runs a month', prompt: 'List contract obligations due this quarter.' },
  // Facilities
  { id: 'workorder', name: 'Work Order Triage', dept: 'Facilities', owner: 'Facilities Head', desc: 'Classifies maintenance requests, sets priority and routes to the contractor.', tasks: 'maintenance work order repair priority contractor', route: 'Pro-code', ar: false, cert: true, state: 'available', rating: 4.2, usage: '830 runs a month', prompt: 'Triage the open maintenance requests.' },
  { id: 'tech', name: 'Technician Knowledge Assistant', dept: 'Facilities', owner: 'Facilities Head', desc: 'Answers technicians on site from O&M manuals and photos, on mobile.', tasks: 'manual technician site om equipment', route: 'Low-code', ar: false, cert: false, state: 'soon', wave: 'Wave 2', prompt: 'How do I reset the chiller controller?' },
  // Projects
  { id: 'status', name: 'Project Status Reporter', dept: 'Projects', owner: 'PMO', desc: 'Turns weekly site reports into an executive status summary.', tasks: 'project status weekly report executive summary site', route: 'Hybrid', ar: false, cert: true, state: 'available', rating: 4.5, usage: '270 runs a month', pinned: true, rec: true, cxo: true, prompt: 'Summarise this week’s project status for the executive team.' },
  { id: 'rfi', name: 'RFI & Variation Assistant', dept: 'Projects', owner: 'PMO', desc: 'Reviews RFIs and variation requests against the contract and drafts responses.', tasks: 'rfi variation request contract response', route: 'Pro-code', ar: false, cert: false, state: 'locked', rating: 4.1, usage: '75 chats a month', prompt: 'Draft a response to RFI 114.' },
  // Leasing
  { id: 'lease', name: 'Lease Renewal Assistant', dept: 'Leasing', owner: 'Leasing Head', desc: 'Flags upcoming expiries and drafts renewal offers using rent benchmarks.', tasks: 'lease renewal expiry rent offer tenant', route: 'Hybrid', ar: false, cert: false, state: 'locked', rating: 4.3, usage: '120 runs a month', prompt: 'Which leases expire in the next 90 days?' },
  { id: 'tenant', name: 'Tenant Enquiry Agent', dept: 'Leasing', owner: 'Leasing Head', desc: 'Answers tenants on service charges, permits and fit-out rules.', tasks: 'tenant service charge permit fit-out rules', route: 'Low-code', ar: true, cert: true, state: 'available', rating: 4.4, usage: '510 chats a month', prompt: 'What are the fit-out rules for retail units?' },
  // Sales / Customer / IT
  { id: 'sales', name: 'Sales Enablement Agent', dept: 'Sales', owner: 'Sales Director', desc: 'Answers sales teams and brokers on projects, payment plans and availability.', tasks: 'sales broker payment plan unit availability project', route: 'Low-code', ar: true, cert: true, state: 'available', rating: 4.6, usage: '1.4k chats a month', recent: true, prompt: 'Which 2-bed units are available at Saadiyat?' },
  { id: 'handover', name: 'Handover & Snagging Assistant', dept: 'Customer', owner: 'Customer Care', desc: 'Guides buyers through handover and logs snags with photos from a phone.', tasks: 'handover snag defect buyer photo', route: 'Hybrid', ar: true, cert: false, state: 'soon', wave: 'Wave 2', prompt: 'Log a snag for unit 1204.' },
  { id: 'servicedesk', name: 'IT Service Desk Agent', dept: 'IT', owner: 'IT Service Management', desc: 'Handles how-tos, password and access requests, and raises tickets.', tasks: 'it help password access ticket laptop reset', route: 'Low-code', ar: false, cert: true, state: 'available', rating: 4.5, usage: '2.1k chats a month', rec: true, prompt: 'I need to reset my password.' },
  // Data & AI / Marketing / Risk & Compliance
  { id: 'catalogue', name: 'Data Catalogue Assistant', dept: 'Data & AI', owner: 'Data & Analytics', desc: 'Finds the right dataset, explains what each field means and who owns it.', tasks: 'dataset catalogue lineage definition table field data quality owner', route: 'Low-code', ar: false, cert: true, state: 'available', rating: 4.5, usage: '640 chats a month', prompt: 'Which dataset holds Q1 reservations, and who owns it?' },
  { id: 'modelwatch', name: 'Model Monitoring Assistant', dept: 'Data & AI', owner: 'Data & Analytics', desc: 'Tracks how AI models are performing and flags drift or falling accuracy.', tasks: 'model drift monitoring accuracy ai evaluation performance alert', route: 'Pro-code', ar: false, cert: false, state: 'locked', rating: 4.3, usage: '210 chats a month', prompt: 'Which models have drifted this month?' },
  { id: 'campaign', name: 'Campaign Brief Writer', dept: 'Marketing', owner: 'Head of Marketing', desc: 'Drafts campaign briefs, audience notes and first-pass copy from the launch plan.', tasks: 'campaign brief copy audience launch marketing email social message', route: 'Low-code', ar: true, cert: true, state: 'available', rating: 4.4, usage: '520 chats a month', prompt: 'Draft a campaign brief for the Q1 launch.' },
  { id: 'brand', name: 'Brand Guidelines Assistant', dept: 'Marketing', owner: 'Head of Marketing', desc: 'Answers questions on logo use, tone of voice and approved templates.', tasks: 'brand logo tone voice guideline template colour approved', route: 'Low-code', ar: true, cert: true, state: 'available', rating: 4.6, usage: '780 chats a month', prompt: 'Which logo version should I use on a brochure?' },
  { id: 'riskreg', name: 'Risk Register Assistant', dept: 'Risk & Compliance', owner: 'Head of Risk & Compliance', desc: 'Logs and rates risks, and suggests mitigations from the enterprise risk register.', tasks: 'risk register mitigation rating likelihood impact control', route: 'Hybrid', ar: false, cert: true, state: 'locked', rating: 4.2, usage: '180 chats a month', prompt: 'Add a supplier delay risk to the register and rate it.' },
  { id: 'regchange', name: 'Regulatory Change Tracker', dept: 'Risk & Compliance', owner: 'Head of Risk & Compliance', desc: 'Summarises new regulations and shows which Aldar policies they affect.', tasks: 'regulation regulatory change rera compliance circular policy impact', route: 'Low-code', ar: true, cert: false, state: 'soon', wave: 'Wave 3', prompt: 'What changed in the latest regulatory circular?' },
  { id: 'incident', name: 'Incident Summariser', dept: 'IT', owner: 'IT Service Management', desc: 'Summarises incidents from tickets and logs; drafts post-incident reports.', tasks: 'incident outage post-incident report logs', route: 'Low-code', ar: false, cert: false, state: 'soon', wave: 'Wave 3', prompt: 'Summarise last night’s outage.' },
]

/** Categories for the browse-by-category layout (shown as the tabs above the cards) */
export const CATS = ['Productivity', 'Knowledge & policy', 'Documents & contracts', 'Data & insights', 'Workflows', 'Customer & sales', 'IT & support'] as const
export const CAT_OF: Record<string, (typeof CATS)[number]> = {
  policy: 'Knowledge & policy', meeting: 'Productivity', insights: 'Data & insights', research: 'Data & insights',
  'hr-policy': 'Knowledge & policy', onboard: 'Workflows', recruit: 'Workflows', admissions: 'Customer & sales',
  teacher: 'Productivity', schoolperf: 'Data & insights', rfq: 'Documents & contracts', bids: 'Documents & contracts',
  invoice: 'Workflows', variance: 'Data & insights', contract: 'Documents & contracts', obligations: 'Documents & contracts',
  workorder: 'Workflows', tech: 'Knowledge & policy', status: 'Data & insights', rfi: 'Documents & contracts',
  lease: 'Documents & contracts', tenant: 'Customer & sales', sales: 'Customer & sales', handover: 'Customer & sales',
  servicedesk: 'IT & support', incident: 'IT & support',
  catalogue: 'Data & insights', modelwatch: 'Data & insights', campaign: 'Documents & contracts', brand: 'Knowledge & policy', riskreg: 'Workflows', regchange: 'Knowledge & policy',
}
/** the signed-in user's own department (drives the My department collection) */
export const MY_DEPT = 'Projects'
/** hue (0-360) of the artwork area on the vertical cards, per department */
export const DEPT_HUE: Record<string, number> = {
  [ENTERPRISE]: 24, 'Human Resources': 330, Procurement: 200, Finance: 150, Legal: 265, Education: 45, Facilities: 185, Projects: 225, Leasing: 15, Sales: 295, Customer: 345, IT: 170, 'Data & AI': 205, Marketing: 20, 'Risk & Compliance': 5,
}

/** Agent types (illustrative values; the real list comes from the agent registry) */
export const TYPES = ['Knowledge', 'Task', 'Data', 'Workflow', 'Conversational'] as const
export const TYPE_ICON: Record<(typeof TYPES)[number], string> = { Knowledge: 'doc', Task: 'check', Data: 'chart', Workflow: 'route', Conversational: 'msg' }
export const TYPE_OF: Record<string, (typeof TYPES)[number]> = {
  policy: 'Knowledge', meeting: 'Task', insights: 'Data', research: 'Knowledge', 'hr-policy': 'Knowledge', onboard: 'Workflow',
  recruit: 'Workflow', admissions: 'Conversational', teacher: 'Task', schoolperf: 'Data', rfq: 'Task', bids: 'Task', invoice: 'Workflow',
  variance: 'Data', contract: 'Task', obligations: 'Workflow', workorder: 'Workflow', tech: 'Knowledge', status: 'Data', rfi: 'Task',
  lease: 'Workflow', tenant: 'Conversational', sales: 'Conversational', handover: 'Conversational', servicedesk: 'Conversational', incident: 'Data',
  catalogue: 'Knowledge', modelwatch: 'Data', campaign: 'Task', brand: 'Knowledge', riskreg: 'Workflow', regchange: 'Knowledge',
}

/** Department hub content (illustrative) */
export const deptShort = (d: string) => (d === 'Human Resources' ? 'HR' : d)
export const DEPT_OWNER: Record<string, string> = {
  'Human Resources': 'Director of People & Culture', Procurement: 'Head of Procurement', Finance: 'Group Finance Controller', Legal: 'General Counsel',
  Education: 'CEO, Aldar Education', Facilities: 'Head of Facilities Management', Projects: 'Head of PMO', Leasing: 'Head of Leasing',
  Sales: 'Sales Director', Customer: 'Head of Customer Care', IT: 'Head of IT Service Management',
  'Data & AI': 'Chief Data & AI Officer', Marketing: 'Head of Marketing', 'Risk & Compliance': 'Head of Risk & Compliance',
}
export const DEPT_SOURCES: Record<string, string[]> = {
  [ENTERPRISE]: ['Group policy library (SharePoint)', 'Teams meeting transcripts', 'Aldar Gold-layer data'],
  'Human Resources': ['HR policy library (SharePoint)', 'Benefits handbook', 'Leave and attendance system (read only)'],
  Procurement: ['Procurement templates (SharePoint)', 'Past tenders and RFQs', 'Vendor register'],
  Finance: ['Gold-layer finance data', 'Budget workbooks (OneDrive)', 'Invoice and PO records'],
  Legal: ['Contract repository', 'Aldar contract playbook', 'Obligation register'],
  Education: ['School handbooks and fee schedules', 'Admissions system', 'Inspection reports'],
  Facilities: ['O&M manuals', 'Work order system', 'Contractor register'],
  Projects: ['Weekly site reports', 'Project plans (SharePoint)', 'Contract documents'],
  Leasing: ['Lease register', 'Rent benchmarks', 'Service charge rules'],
  Sales: ['Project and unit availability', 'Payment plans', 'Broker guidelines'],
  Customer: ['Handover checklists', 'Snagging log', 'Warranty terms'],
  IT: ['IT knowledge base', 'Service desk tickets', 'Incident logs'],
  'Data & AI': ['Data catalogue', 'Gold-layer table documentation', 'Model monitoring dashboards'],
  Marketing: ['Brand guidelines (SharePoint)', 'Campaign performance reports', 'Approved copy library'],
  'Risk & Compliance': ['Enterprise risk register', 'Regulatory circulars', 'Policy exceptions log'],
}
export const TYPE_CAN: Record<string, string[]> = {
  Knowledge: ['Answers questions from approved Aldar documents', 'Cites the source of every answer', 'Replies in Arabic when you write in Arabic', 'Says so when it does not know'],
  Task: ['Drafts documents from Aldar templates', 'Checks your input against Aldar rules and flags gaps', 'Hands the result to you for approval', 'Exports to Word, Excel or PDF'],
  Data: ['Answers questions in plain language over Gold-layer data', 'Shows results as charts you can switch to tables', 'Explains how each figure was calculated', 'Lets you drill into the underlying data'],
  Workflow: ['Starts the process from a single request', 'Routes steps to the right owner for approval', 'Tracks progress and chases overdue items', 'Keeps an audit trail of what it did'],
  Conversational: ['Answers everyday questions in Arabic or English', 'Remembers the context within a chat', 'Raises a ticket or request when needed', 'Hands over to a person for anything sensitive'],
}
export const TYPE_PROMPTS: Record<string, string[]> = {
  Knowledge: ['Summarise the key points of the relevant policy', 'Where can I find the latest guidance on this?'],
  Task: ['Draft this for me and flag anything missing', 'What do you need from me to get started?'],
  Data: ['Show this as a chart by month', 'Which figures changed most since last quarter?'],
  Workflow: ['What is the status of my open requests?', 'Start the process and tell me what is needed'],
  Conversational: ['What can you help me with?', 'Answer this in Arabic'],
}
