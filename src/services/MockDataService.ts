// MockDataService.ts
// Temporary mock data service for Phase 1.
// Phase 2 will replace this with real Firestore reads.

export interface Job {
  id: string;
  title: string;
  company: string;
  department: string;
  location: string;
  type: string;
  salary: string;
  posted: string;
  deadline?: string;
  status: string;
  description: string;
  requirements: string[];
  logo: string;
  featured?: boolean;
}

const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'Autumhire Tech',
    department: 'Engineering',
    location: 'Nairobi, Kenya',
    type: 'Full-time',
    salary: 'KES 300,000 – 450,000',
    posted: 'Apr 1, 2026',
    deadline: 'Apr 30, 2026',
    status: 'Active',
    description:
      'We are looking for an experienced Senior Frontend Developer to join our engineering team. You will be responsible for building and maintaining high-quality web applications using React, TypeScript, and modern tooling.',
    requirements: [
      '5+ years of experience in frontend development',
      'Strong proficiency in React and TypeScript',
      'Experience with REST APIs and GraphQL',
      'Excellent understanding of UI/UX principles',
      'Strong communication and teamwork skills',
    ],
    logo: 'https://placehold.co/64x64/f97316/ffffff?text=AT',
    featured: true,
  },
  {
    id: '2',
    title: 'Product Manager',
    company: 'Autumhire Tech',
    department: 'Product',
    location: 'Nairobi, Kenya',
    type: 'Full-time',
    salary: 'KES 400,000 – 600,000',
    posted: 'Apr 3, 2026',
    deadline: 'May 15, 2026',
    status: 'Active',
    description:
      'We are seeking a driven Product Manager to lead our product strategy and roadmap. You will work closely with engineering, design, and business teams to deliver impactful features to our users.',
    requirements: [
      '4+ years of product management experience',
      'Strong analytical and problem-solving skills',
      'Experience with Agile/Scrum methodologies',
      'Excellent stakeholder management',
      'MBA or equivalent experience preferred',
    ],
    logo: 'https://placehold.co/64x64/6366f1/ffffff?text=AT',
    featured: true,
  },
  {
    id: '3',
    title: 'UX Designer',
    company: 'Autumhire Tech',
    department: 'Design',
    location: 'Remote',
    type: 'Contract',
    salary: 'KES 200,000 – 300,000',
    posted: 'Apr 5, 2026',
    status: 'Active',
    description:
      'We are looking for a talented UX Designer to craft beautiful and intuitive user experiences. You will own the design process from research to high-fidelity prototypes.',
    requirements: [
      '3+ years of UX/UI design experience',
      'Proficient in Figma or similar design tools',
      'Strong portfolio demonstrating user-centered design',
      'Experience conducting user research and usability testing',
    ],
    logo: 'https://placehold.co/64x64/10b981/ffffff?text=AT',
    featured: true,
  },
  {
    id: '4',
    title: 'Backend Engineer (Node.js)',
    company: 'Autumhire Tech',
    department: 'Engineering',
    location: 'Nairobi, Kenya',
    type: 'Full-time',
    salary: 'KES 280,000 – 420,000',
    posted: 'Apr 8, 2026',
    status: 'Active',
    description:
      'Join our backend team to build scalable APIs and services that power the Autumhire platform. You will work with Node.js, Firebase, and cloud infrastructure.',
    requirements: [
      '3+ years of backend development experience',
      'Strong Node.js and Express.js skills',
      'Experience with Firebase / Firestore',
      'Knowledge of RESTful API design',
      'Understanding of cloud infrastructure (GCP preferred)',
    ],
    logo: 'https://placehold.co/64x64/f59e0b/ffffff?text=AT',
    featured: false,
  },
  {
    id: '5',
    title: 'HR Business Partner',
    company: 'Autumhire Tech',
    department: 'Human Resources',
    location: 'Nairobi, Kenya',
    type: 'Full-time',
    salary: 'KES 180,000 – 250,000',
    posted: 'Apr 10, 2026',
    status: 'Active',
    description:
      'We are hiring an experienced HR Business Partner to support our growing team. You will work closely with leadership to attract, develop, and retain top talent.',
    requirements: [
      '5+ years of HR experience',
      'Knowledge of Kenyan labour laws and compliance',
      'Experience with ATS and HRIS systems',
      'Strong interpersonal and conflict resolution skills',
    ],
    logo: 'https://placehold.co/64x64/ec4899/ffffff?text=AT',
    featured: false,
  },
];

class MockDataServiceClass {
  getAllJobs(): Job[] {
    // Merge with any jobs created via localStorage (admin-created jobs)
    const localJobs: Job[] = JSON.parse(localStorage.getItem('mockJobs') || '[]');
    return [...localJobs.filter((j) => j.status === 'Active'), ...MOCK_JOBS.filter((j) => j.status === 'Active')];
  }

  getFeaturedJobs(): Job[] {
    return this.getAllJobs().filter((j) => j.featured !== false).slice(0, 6);
  }

  getJobById(id: string): Job | undefined {
    return this.getAllJobs().find((j) => j.id === id);
  }

  searchJobs(query: string, location?: string): Job[] {
    const q = query.toLowerCase();
    const loc = location?.toLowerCase() || '';
    return this.getAllJobs().filter((j) => {
      const matchQuery = !q || j.title.toLowerCase().includes(q) || j.department.toLowerCase().includes(q) || j.description.toLowerCase().includes(q);
      const matchLocation = !loc || j.location.toLowerCase().includes(loc);
      return matchQuery && matchLocation;
    });
  }
}

export const mockDataService = new MockDataServiceClass();
