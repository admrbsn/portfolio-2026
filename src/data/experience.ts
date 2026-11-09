/**
 * Work history, shared by the home résumé section (`Experience.astro`) and the
 * detailed timeline on /about. Single source of truth so the two never drift.
 * Ordered most-recent first; `period` uses en dashes for ranges. Points are the
 * résumé PDF's bullets verbatim — the PDF is generated from this file by
 * `bun run make:resume`, so edit here and regenerate.
 */
export interface Job {
  period: string;
  role: string;
  company: string;
  /** Résumé PDF only (scripts/make-resume.ts); the site doesn't show it. */
  location: string;
  /** Detail bullets — shown on /about, omitted from the compact home list. */
  points: string[];
}

/**
 * A point that opens with a short label ("Droplr: Built…") splits into the
 * label and the rest, so it can be set bold the way the résumé PDF sets it.
 */
export function splitLead(point: string): { lead: string | null; rest: string } {
  const m = /^([A-Z][\w .&'-]{1,24}):\s(.*)$/.exec(point);
  return m ? { lead: m[1], rest: m[2] } : { lead: null, rest: point };
}

export const experience: Job[] = [
  {
    period: '2021–Present',
    role: 'Head of Product Design',
    company: 'Tribute',
    location: 'Remote',
    points: [
      'Led a cross-functional team of six designers and engineers through a full redesign and rebuild of Tribute’s platform, remaining hands-on across product strategy, complex workflows, and prototyping while delivering a scalable product that supported 20x growth in two years.',
      'Established the design system, critique rituals, and standards the team built against; mentored designers, converted designs into production-ready TypeScript, and directed engineering partners to ship reliably, making UX quality a shared responsibility.',
      'Integrated customer interviews, usability testing, A/B testing, and analytics into the design process, improving core funnels and lifting key conversion metrics by up to 50%.',
      'Directed the integration of an acquisition in six months, resolving critical issues across system compatibility and UX while reducing operational costs by nearly 50%.',
      'Drove the design and partnered with engineering to ship two native iOS apps and AI-enabled product experiences from concept to release, including conversational workflows, human-in-the-loop controls, error recovery, and iterative evaluation.',
    ],
  },
  {
    period: '2015–2021',
    role: 'Sr. Manager, UX/UI Design & Frontend Development',
    company: "Peterson's",
    location: 'Denver, CO',
    points: [
      'Led a team of four designers and frontend developers across web and mobile, introducing research-driven practices and a scalable design system that improved development speed and product consistency.',
      'Built and launched a mobile app from concept to App Store release in six months, earning a 4.6-star rating, 90%+ positive reviews, and 10,000+ downloads.',
      'Redesigned core LMS workflows through usability testing and iterative prototyping, simplifying critical tasks and reducing friction across the experience.',
    ],
  },
  {
    period: '2014–2020',
    role: 'Product Design & Development Consultant',
    company: 'Droplr, ETHDenver, Inspirato',
    location: 'Remote',
    points: [
      'Droplr: Built a custom WordPress Multisite platform, brand guide, and design system, increasing organic traffic by 115% and raising Lighthouse scores to 98/100.',
      'ETHDenver: Achieved 96% CSAT by leading design and development across the event platform, integrating promotional sites, forms, scheduling tools, and social media.',
      'Inspirato: Drove acquisition of 4,000+ members for the Inspirato x Amex joint venture, with 25% converting in the first six months, and launched the brand’s blog and content platform.',
    ],
  },
  {
    period: '2011–2014',
    role: 'Staff Designer / Engineer',
    company: 'Webolutions',
    location: 'Denver, CO',
    points: [
      'Delivered 15+ client websites using user-centered, responsive design, earning 2 Communicator Awards for excellence in visual design and engagement.',
      'Managed simultaneous projects across multiple client accounts, balancing frequent stakeholder meetings, shifting priorities, and tight deadlines in a fast-moving agency environment.',
    ],
  },
  {
    period: '2006–2011',
    role: 'Lead Interactive Designer',
    company: 'Miles Partnership',
    location: 'Denver, CO',
    points: [
      'Led interactive design for over 10 major tourism brands, overseeing high-traffic websites and mobile experiences with tens of millions of annual pageviews.',
      'Directed key digital projects, including the Colorado.com redesign and the award-winning 5-Minute Meeting Planner.',
    ],
  },
  {
    period: '2007–2009',
    role: 'Technical Specialist',
    company: 'Apple',
    location: 'Lone Tree, CO',
    points: [
      'Provided technical consultation on Apple products, troubleshooting hardware and software issues and translating complex technical concepts for non-technical customers.',
    ],
  },
];
