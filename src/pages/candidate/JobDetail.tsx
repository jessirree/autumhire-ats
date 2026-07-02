import { ArrowLeft, MapPin, Briefcase, Clock, DollarSign, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface JobDetailProps {
  jobId: string;
  onBack: () => void;
  onApply: () => void;
}

export function JobDetail({ jobId, onBack, onApply }: JobDetailProps) {
  // Mock job data
  const job = {
    id: jobId,
    title: 'Senior Frontend Developer',
    department: 'Engineering',
    location: 'San Francisco, CA',
    type: 'Full-time',
    salary: '$120k - $160k',
    posted: '2 days ago',
    applicants: 45,
    description: `We are seeking an experienced Senior Frontend Developer to join our growing team. You will be responsible for building and maintaining high-quality web applications using modern technologies.`,
    responsibilities: [
      'Develop new user-facing features using React and TypeScript',
      'Build reusable components and front-end libraries for future use',
      'Optimize applications for maximum speed and scalability',
      'Collaborate with back-end developers and designers to improve usability',
      'Mentor junior developers and contribute to technical documentation',
    ],
    requirements: [
      '5+ years of experience in frontend development',
      'Strong proficiency in JavaScript, TypeScript, and React',
      'Experience with modern frontend build tools and workflows',
      'Excellent understanding of responsive design and cross-browser compatibility',
      'Strong problem-solving skills and attention to detail',
    ],
    benefits: [
      'Competitive salary and equity package',
      'Comprehensive health, dental, and vision insurance',
      'Unlimited PTO and flexible work arrangements',
      '401(k) matching',
      'Professional development budget',
      'Modern office with free lunch and snacks',
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="size-4" />
            Back to Jobs
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Job Header Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-semibold mb-4">{job.title}</h1>
          
          <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-6">
            <span className="flex items-center gap-2">
              <Briefcase className="size-5" />
              {job.department}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="size-5" />
              {job.location}
            </span>
            <span className="flex items-center gap-2">
              <DollarSign className="size-5" />
              {job.salary}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="size-5" />
              {job.type}
            </span>
            <span className="flex items-center gap-2">
              <Users className="size-5" />
              {job.applicants} applicants
            </span>
          </div>

          <Button
            size="lg"
            className="px-8"
            onClick={onApply}
            style={{ backgroundColor: 'var(--blue-accent)' }}
          >
            Apply for This Position
          </Button>
        </div>

        {/* Job Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">About the Role</h2>
            <p className="text-gray-700 leading-relaxed">{job.description}</p>
          </section>

          <div className="border-t border-gray-200" />

          <section>
            <h2 className="text-xl font-semibold mb-4">Key Responsibilities</h2>
            <ul className="space-y-3">
              {job.responsibilities.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="size-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="border-t border-gray-200" />

          <section>
            <h2 className="text-xl font-semibold mb-4">Requirements</h2>
            <ul className="space-y-3">
              {job.requirements.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="size-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="border-t border-gray-200" />

          <section>
            <h2 className="text-xl font-semibold mb-4">Benefits</h2>
            <ul className="space-y-3">
              {job.benefits.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="size-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="border-t border-gray-200" />

          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              className="px-12"
              onClick={onApply}
              style={{ backgroundColor: 'var(--blue-accent)' }}
            >
              Apply Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

