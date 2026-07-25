/**
 * Work history, shared by the home résumé section (`Experience.astro`) and the
 * detailed timeline on /about. Single source of truth so the two never drift.
 * Ordered most-recent first; `period` uses en dashes for ranges.
 */
export interface Job {
  period: string;
  role: string;
  company: string;
  /** Detail bullets — shown on /about, omitted from the compact home list. */
  points: string[];
}

export const experience: Job[] = [
  {
    period: '2021–Present',
    role: 'Head of Product Design',
    company: 'Tribute',
    points: [
      'Led the platform redesign behind 20× growth in two years',
      'Built a tokenized design system and shipped TypeScript applications',
      'Folded research, A/B testing and analytics into the loop, up to 30% conversion gains',
      'Ran a six-month acquisition integration',
      'Built and launched two native iOS apps',
      'Consolidated three PM systems into one workflow',
    ],
  },
  {
    period: '2015–2021',
    role: 'Sr. Manager, UX/UI Design & Frontend Development',
    company: "Peterson's",
    points: [
      'Led design and frontend across web and mobile products',
      'Launched a mobile app: 4.6 stars, 10,000+ downloads, 90%+ positive reviews',
      'Redesigned LMS workflows off the back of usability testing',
    ],
  },
  {
    period: 'Dec 2019–Mar 2020',
    role: 'Product Design & Development Consultant',
    company: 'Droplr',
    points: ['Grew organic traffic 115%', 'Hit a 98/100 Lighthouse score on a custom WordPress Multisite'],
  },
  {
    period: '2017–2019',
    role: 'Product Design & Development Consultant',
    company: 'ETHDenver',
    points: ['96% CSAT across the event platform'],
  },
  {
    period: '2014–2017',
    role: 'Product Design & Development Consultant',
    company: 'Inspirato',
    points: ['Acquired 4,000+ members for the Amex joint venture'],
  },
  {
    period: '2011–2014',
    role: 'Staff Designer / Engineer',
    company: 'Webolutions',
    points: ['Delivered 15+ client websites', 'Two Communicator Awards'],
  },
  {
    period: '2006–2011',
    role: 'Lead Interactive Designer',
    company: 'Miles Partnership',
    points: ['Led interactive design for 10+ tourism brands', 'Directed the Colorado.com redesign'],
  },
  {
    period: '2007–2009',
    role: 'Technical Specialist',
    company: 'Apple',
    points: ['Hardware and software consultation'],
  },
];
