import { makeDeliveryStep } from "./_make-delivery-step.ts";

export const uxLeadStep = makeDeliveryStep({
  id: "ux-lead-step",
  description:
    "Creates the UI/UX design plan that grounds frontend, mobile, and QA in concrete design principles.",
  agentId: "ux-lead-agent",
  agentName: "ux_lead",
  role: "UX Lead Agent",
  artifactType: "ux_design_plan",
  instruction:
    "Create the UI/UX Design Plan. Include design goals, principles applied (each citing a named source — Nielsen heuristic by number+name, WCAG criterion by number, Fitts/Hick/Doherty/Miller, or a Gestalt principle), information architecture, primary user flows with numbered steps tied to screens, screen inventory with explicit state triggers (each empty/loading/error/success state names the condition that triggers it), component inventory, content/microcopy patterns, Section 8 Design System Strategy, design tokens as roles (no hex values, no pixel counts), per-screen WCAG 2.2 AA criteria, responsive behavior, and project-specific anti-patterns avoided. Section 8 must name a specific design-system stance (ADOPT / BUILD / HYBRID) and a specific library + license — 'use a design system' is forbidden. Forbidden adjectives: modern, clean, intuitive, beautiful, sleek, user-friendly, seamless, delightful, elegant, smooth, friction-less, polished, sophisticated, modernized, refined. If the project has no UI surface, say so in Section 1 and produce a minimal Admin/CLI UX plan instead of inventing screens.",
});
