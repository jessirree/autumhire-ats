import { useState } from 'react';
import { ArrowLeft, Upload, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface ApplicationFormProps {
  jobTitle: string;
  onBack: () => void;
  onSubmit: () => void;
}

import { mockDataService } from '../../services/MockDataService';

export function ApplicationForm({ jobTitle, onBack, onSubmit }: ApplicationFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    portfolio: '',
    experience: '',
    availability: '',
    expectedSalary: '',
    questionIntro: '',
    questionMotivation: '',
    questionExperience: '',
    consent: false,
  });

  const [resumeFile, setResumeFile] = useState<string | null>(null);
  const [coverLetterFile, setCoverLetterFile] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'coverLetter') => {
    if (e.target.files && e.target.files[0]) {
      const fileName = e.target.files[0].name;
      if (type === 'resume') setResumeFile(fileName);
      else setCoverLetterFile(fileName);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    mockDataService.submitApplication({
      candidateName: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      linkedin: formData.linkedin,
      portfolio: formData.portfolio,
      jobTitle: jobTitle,
      department: 'Engineering', // You might want to pass this as a prop
      experience: formData.experience,
      availability: formData.availability,
      expectedSalary: formData.expectedSalary,
      resume: resumeFile || undefined,
      coverLetter: coverLetterFile || undefined,
      screeningAnswers: [
        { question: 'Years of Professional Experience', answer: formData.experience },
        { question: 'Tell us about yourself and your background', answer: formData.questionIntro },
        { question: 'Why are you interested in this position?', answer: formData.questionMotivation },
        { question: 'Describe your relevant experience', answer: formData.questionExperience },
      ]
    });

    onSubmit();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <h1 className="text-3xl font-semibold mb-2">Apply for {jobTitle}</h1>
          <p className="text-gray-600">Please fill out all required fields to complete your application</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-8 space-y-8">
          {/* Personal Information */}
          <section>
            <h2 className="text-xl font-semibold mb-6">Personal Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-700 mb-2 block">
                  Current Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="City, State/Country"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">LinkedIn Profile</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 mb-2 block">Portfolio URL</label>
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200" />

          {/* Documents */}
          <section>
            <h2 className="text-xl font-semibold mb-6">Required Documents</h2>
            <div className="space-y-4">
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${resumeFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                {resumeFile ? (
                  <div className="text-green-700">
                    <CheckCircle2 className="size-8 mx-auto mb-3" />
                    <p className="font-medium">{resumeFile}</p>
                    <p className="text-sm text-green-600 mt-1">Resume uploaded successfully</p>
                  </div>
                ) : (
                  <>
                    <Upload className="size-8 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium mb-1">Upload Resume/CV <span className="text-red-500">*</span></p>
                    <p className="text-sm text-gray-500 mb-3">PDF, DOC, or DOCX (max 5MB)</p>
                    <div className="relative inline-block">
                      <Button type="button" variant="outline" size="sm" className="pointer-events-none">Choose File</Button>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        required
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(e, 'resume')}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${coverLetterFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
                {coverLetterFile ? (
                  <div className="text-green-700">
                    <CheckCircle2 className="size-8 mx-auto mb-3" />
                    <p className="font-medium">{coverLetterFile}</p>
                    <p className="text-sm text-green-600 mt-1">Cover letter uploaded successfully</p>
                  </div>
                ) : (
                  <>
                    <Upload className="size-8 text-gray-400 mx-auto mb-3" />
                    <p className="font-medium mb-1">Upload Cover Letter</p>
                    <p className="text-sm text-gray-500 mb-3">PDF, DOC, or DOCX (max 5MB)</p>
                    <div className="relative inline-block">
                      <Button type="button" variant="outline" size="sm" className="pointer-events-none">Choose File</Button>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(e, 'coverLetter')}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200" />

          {/* Pre-screening Questions */}
          <section>
            <h2 className="text-xl font-semibold mb-6">Pre-screening Questions</h2>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  Years of Professional Experience <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select experience level</option>
                  <option value="0-1">0-1 years</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  Tell us about yourself and your background <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.questionIntro}
                  onChange={(e) => setFormData({ ...formData, questionIntro: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Share your professional background and key achievements..."
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  Why are you interested in this position? <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.questionMotivation}
                  onChange={(e) => setFormData({ ...formData, questionMotivation: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Tell us what excites you about this opportunity..."
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  Describe your relevant experience for this role <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.questionExperience}
                  onChange={(e) => setFormData({ ...formData, questionExperience: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Highlight your most relevant skills and experiences..."
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  When are you available to start? <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select availability</option>
                  <option value="immediate">Immediate</option>
                  <option value="2-weeks">2 weeks notice</option>
                  <option value="1-month">1 month notice</option>
                  <option value="2-months">2 months notice</option>
                  <option value="negotiable">Negotiable</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-700 mb-2 block">
                  Expected Salary Range (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.expectedSalary}
                  onChange={(e) => setFormData({ ...formData, expectedSalary: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., $120,000 - $150,000"
                />
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200" />

          {/* Consent */}
          <section>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                required
                checked={formData.consent}
                onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                className="mt-1 size-4"
              />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Data Processing Consent <span className="text-red-500">*</span></p>
                <p className="text-gray-600">
                  I consent to the processing of my personal data for recruitment purposes. I understand that my information will be stored securely and used only for evaluating my application for this position.
                </p>
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="flex gap-4 pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-8"
              style={{ backgroundColor: 'var(--blue-accent)' }}
            >
              Submit Application
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

