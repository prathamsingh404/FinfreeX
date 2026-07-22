export const navLinks = [
  { label: "What we fix", href: "#problem" },
  { label: "Systems", href: "#systems" },
  { label: "Method", href: "#method" },
  { label: "Use cases", href: "#use-cases" },
  { label: "Contact", href: "#contact" },
];

export const channels = [
  { icon: "simple-icons:whatsapp", label: "WhatsApp" },
  { icon: "solar:phone-rounded-linear", label: "Missed call" },
  { icon: "solar:document-add-linear", label: "Website form" },
  { icon: "simple-icons:instagram", label: "Instagram DM" },
  { icon: "solar:letter-linear", label: "Email" },
];

export const flowSteps = [
  "Lead captured",
  "Response assigned",
  "Follow-up scheduled",
  "Outcome measured",
];

export const problems = [
  {
    icon: "solar:inbox-linear",
    title: "Missed leads",
    desc: "A form arrives, a message is buried, a call is missed. The opportunity cools before anyone owns it.",
  },
  {
    icon: "solar:hourglass-line-linear",
    title: "Weak follow-up",
    desc: "Interested clients are not lost immediately. They disappear when the next step is unclear.",
  },
  {
    icon: "solar:calendar-linear",
    title: "Empty agenda and no-shows",
    desc: "Bookings, confirmations, reminders, and reactivations need a system — not memory.",
  },
  {
    icon: "solar:gallery-wide-linear",
    title: "Scattered tasks and evidence",
    desc: "Photos, notes, reports, documents, and pending work become risk when they live in too many places.",
  },
];

export const mechanismSteps = [
  "Capture",
  "Route",
  "Respond",
  "Follow up",
  "Schedule",
  "Document",
  "Measure",
];

export const systems = [
  {
    icon: "solar:graph-up-linear",
    tag: "System 01",
    title: "Revenue Recovery OS",
    for: "For clinics and appointment-based services.",
    fixes:
      "Website, WhatsApp, forms, response, qualification, confirmation, follow-up, reactivation.",
    changes:
      "Faster response, fewer missed leads, fewer no-shows, more booked appointments.",
  },
  {
    icon: "solar:wrench-linear",
    tag: "System 02",
    title: "Field Operations OS",
    for: "For maintenance, HVAC, facilities, field service, property management.",
    fixes:
      "Requests, tickets, scheduling, photos, reports, pending tasks, handoff.",
    changes:
      "Cleaner dispatch, traceable evidence, fewer return visits, faster billing.",
  },
  {
    icon: "solar:document-text-linear",
    tag: "System 03",
    title: "Evidence / Data Room OS",
    for: "For B2B suppliers and documentation-heavy SMEs.",
    fixes:
      "Reusable documents, evidence, expiry tracking, audit trail, faster responses.",
    changes:
      "Less rework, faster client and bank responses, audit-ready operations.",
  },
];

export const methodSteps = [
  {
    n: "01",
    title: "Map leakage",
    desc: "We identify where leads, time, evidence, and margin are being lost.",
  },
  {
    n: "02",
    title: "Prioritize quick wins",
    desc: "We focus first on the fixes with the highest operational and commercial impact.",
  },
  {
    n: "03",
    title: "Install the system",
    desc: "We configure simple workflows for capture, response, follow-up, scheduling, documentation, and reporting.",
  },
  {
    n: "04",
    title: "Measure and improve",
    desc: "We track what changes and keep improving the system with the business.",
  },
];

export const useCases = [
  {
    id: "clinics",
    label: "Private clinics & aesthetics",
    desc: "Leads from Instagram, WhatsApp, and forms become structured booking flows. Confirmations, reminders, and reactivation become measurable steps.",
    threads: [
      { icon: "solar:user-rounded-linear", text: "Lead captured from form, DM, or call" },
      { icon: "solar:dialog-2-linear", text: "Owned, qualified, replied within minutes" },
      { icon: "solar:calendar-mark-linear", text: "Appointment confirmed and reminded" },
      { icon: "solar:refresh-linear", text: "Reactivation of cooled opportunities" },
    ],
  },
  {
    id: "dental",
    label: "Dental & physiotherapy",
    desc: "Recurring care, treatment plans, and pending follow-ups become a clear operating list — not a memory exercise for the front desk.",
    threads: [
      { icon: "solar:checklist-minimalistic-linear", text: "Treatment plan tracked through stages" },
      { icon: "solar:bell-linear", text: "Confirmations and reminders automated" },
      { icon: "solar:phone-calling-linear", text: "Recall lists for inactive patients" },
      { icon: "solar:chart-2-linear", text: "Visibility on no-shows and recovery" },
    ],
  },
  {
    id: "field",
    label: "Field-service teams",
    desc: "Requests stop living inside WhatsApp. Tickets, photos, and reports flow through one operating layer — from request to handoff.",
    threads: [
      { icon: "solar:inbox-linear", text: "Requests captured into structured tickets" },
      { icon: "solar:user-id-linear", text: "Routing and ownership made explicit" },
      { icon: "solar:camera-linear", text: "Photos and evidence attached at source" },
      { icon: "solar:check-square-linear", text: "Pending tasks closed with proof" },
    ],
  },
  {
    id: "property",
    label: "Property management",
    desc: "Tenants, vendors, schedules, and recurring maintenance become a coordinated stream — visible to owners and operators.",
    threads: [
      { icon: "solar:home-2-linear", text: "Unit-level requests and history" },
      { icon: "solar:calendar-linear", text: "Recurring maintenance scheduled" },
      { icon: "solar:document-linear", text: "Vendor and tenant documentation" },
      { icon: "solar:chart-square-linear", text: "Reporting for owners and stakeholders" },
    ],
  },
  {
    id: "b2b",
    label: "B2B suppliers",
    desc: "Documents, certifications, and evidence stop being recreated for every client request. Responses become reusable, traceable, and fast.",
    threads: [
      { icon: "solar:folder-with-files-linear", text: "Reusable evidence and documents" },
      { icon: "solar:clock-circle-linear", text: "Expiry and renewal tracking" },
      { icon: "solar:shield-check-linear", text: "Audit trail across operations" },
      { icon: "solar:bolt-linear", text: "Faster replies to clients and banks" },
    ],
  },
];

export const metrics = [
  { label: "Leads received", fill: 78 },
  { label: "Leads answered", fill: 84 },
  { label: "Response time", fill: 62 },
  { label: "Follow-ups completed", fill: 71 },
  { label: "Appointments booked", fill: 88 },
  { label: "No-shows", fill: 28 },
  { label: "Reactivated opportunities", fill: 45 },
  { label: "Tickets closed", fill: 92 },
  { label: "Time saved", fill: 67 },
  { label: "Documents reused", fill: 54 },
];

export const trust = [
  {
    icon: "solar:user-check-linear",
    title: "Human-supervised automation",
    desc: "Automation supports judgment. It does not replace it.",
  },
  {
    icon: "solar:target-linear",
    title: "Scope-limited systems",
    desc: "Each workflow has a defined boundary and a clear owner.",
  },
  {
    icon: "solar:transfer-horizontal-linear",
    title: "Clear handoff",
    desc: "Every step has a next owner and a measurable outcome.",
  },
  {
    icon: "solar:notebook-linear",
    title: "Basic logs",
    desc: "Decisions, actions, and changes leave a simple audit trail.",
  },
  {
    icon: "solar:lock-keyhole-linear",
    title: "No sensitive decisions automated",
    desc: "Clinical, legal, and financial calls remain with humans.",
  },
  {
    icon: "solar:shield-check-linear",
    title: "GDPR-conscious workflows",
    desc: "Data handling designed with European privacy standards in mind.",
  },
  {
    icon: "solar:scale-linear",
    title: "Built for SMEs",
    desc: "Calibrated for service businesses, not enterprise complexity.",
  },
  {
    icon: "solar:settings-linear",
    title: "Simple by design",
    desc: "We remove tools, not add more. The system is the value.",
  },
];