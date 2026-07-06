import { useState } from 'react';
import { Mail, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { CandidateHeader } from '../../components/ats/CandidateHeader';

interface ContactUsProps {
    onLoginClick: () => void;
    onHomeClick: () => void;
    onJobListingsClick: () => void;
    onAboutClick: () => void;
    isLoggedIn?: boolean;
    userProfile?: { name: string; avatar?: string };
    onLogout?: () => void;
}

export function ContactUs({
    onLoginClick,
    onHomeClick,
    onJobListingsClick,
    onAboutClick,
    isLoggedIn,
    userProfile,
    onLogout
}: ContactUsProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Success simulation
            setSuccess(true);
            setFormData({
                name: '',
                email: '',
                subject: '',
                message: ''
            });
        } catch (err: any) {
            console.error('Error sending contact message:', err);
            setError('Failed to send message. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <CandidateHeader
                onLoginClick={onLoginClick}
                onAboutClick={onAboutClick}
                onHomeClick={onHomeClick}
                onJobListingsClick={onJobListingsClick}
                activePage="contact"
                isLoggedIn={isLoggedIn}
                userProfile={userProfile}
                onLogout={onLogout}
            />

            <main className="container py-12">
                <h1 className="text-center text-4xl font-bold mb-12 text-[#2F5233]">Contact Us</h1>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Contact Info Card */}
                    <div className="md:col-span-1">
                        <div className="contact-info-card h-full">
                            <h3 className="text-xl font-bold mb-6 text-[#2F5233]">Get in Touch</h3>

                            <div className="contact-item mb-6">
                                <Mail className="contact-icon size-6 text-[#F76C5E]" />
                                <div>
                                    <h5 className="font-bold text-[#4A4A4A] mb-1">Email</h5>
                                    <p className="text-[#4A4A4A]">info@autumhire.com</p>
                                </div>
                            </div>

                            <div className="contact-item">
                                <MapPin className="contact-icon size-6 text-[#F76C5E]" />
                                <div>
                                    <h5 className="font-bold text-[#4A4A4A] mb-1">Location</h5>
                                    <p className="text-[#4A4A4A]">Nairobi, Kenya</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form Card */}
                    <div className="md:col-span-2">
                        <div className="contact-form-card">
                            <h3 className="text-xl font-bold mb-6 text-[#2F5233]">Send us a Message</h3>

                            {success && (
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 relative">
                                    <span className="block sm:inline">Thanks for reaching out — your message has been received and our team will get back to you as soon as possible.</span>
                                    <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setSuccess(false)}>
                                        <span className="text-green-500">&times;</span>
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 relative">
                                    <span className="block sm:inline">{error}</span>
                                    <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError('')}>
                                        <span className="text-red-500">&times;</span>
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#F76C5E] focus:border-transparent outline-none transition-all"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#F76C5E] focus:border-transparent outline-none transition-all"
                                            placeholder="Enter your email"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#F76C5E] focus:border-transparent outline-none transition-all"
                                        placeholder="Enter message subject"
                                    />
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        rows={5}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#F76C5E] focus:border-transparent outline-none transition-all"
                                        placeholder="Enter your message"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="bg-[#F76C5E] hover:bg-[#E05A4D] text-white font-bold py-3 px-8 rounded-md transition-all duration-300 w-full md:w-auto"
                                    disabled={loading}
                                >
                                    {loading ? 'Sending...' : 'Send Message'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

