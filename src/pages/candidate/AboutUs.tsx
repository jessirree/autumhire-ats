import { CandidateHeader } from '../../components/ats/CandidateHeader';

interface AboutUsProps {
    onLoginClick: () => void;
    onHomeClick: () => void;
    onJobListingsClick: () => void;
    isLoggedIn?: boolean;
    userProfile?: { name: string; avatar?: string };
    onLogout?: () => void;
}

export function AboutUs({
    onLoginClick,
    onHomeClick,
    onJobListingsClick,
    isLoggedIn,
    userProfile,
    onLogout
}: AboutUsProps) {
    return (
        <div className="about-us-container min-h-screen">
            <CandidateHeader
                onLoginClick={onLoginClick}
                onAboutClick={() => { }}
                onHomeClick={onHomeClick}
                onJobListingsClick={onJobListingsClick}
                activePage="about"
                isLoggedIn={isLoggedIn}
                userProfile={userProfile}
                onLogout={onLogout}
            />

            <main className="container py-12 space-y-16">

                {/* Intro Section */}
                <section className="text-center max-w-4xl mx-auto">
                    <h1 className="text-4xl text-center mb-6">About Us</h1>
                    <p className="intro-lead">
                        At Autumhire Solutions, we go beyond traditional recruitment. As a forward-thinking Human Resource partner, we blend aggressive talent strategies, cutting-edge technology, and deep industry insight to deliver exceptional results for businesses and professionals alike. Whether you're a growing company seeking top-tier talent, flexible workforce solutions, or a skilled professional ready for your next challenge, we're here to make meaningful, lasting connections.
                    </p>
                </section>

                {/* Who We Are & Mission/Vision */}
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="mission-vision-card">
                        <h2 className="section-title">Who We Are</h2>
                        <p className="section-content mb-6">
                            Autumhire solutions is a proactive Human resource firm specializing in Strategic resourcing systems, learning and development systems, compensation and benefits and Team building.
                        </p>
                        <p className="section-content">
                            We champion the best Human Resource practice and integrate it with innovation and modern technology for the benefit of our clients.
                        </p>
                    </div>
                    <div className="space-y-8">
                        <div className="mission-vision-card">
                            <h2 className="section-title">Our Mission</h2>
                            <p className="section-content">
                                To combine aggressive strategic talent acquisition with quality products and services through innovation and modern technology for the best talent acquisition value of consumers.
                            </p>
                        </div>
                        <div className="mission-vision-card">
                            <h2 className="section-title">Our Vision</h2>
                            <p className="section-content">Talent acquisition practices into the global village through innovation and modern technology.</p>
                        </div>
                    </div>
                </div>

                {/* Core Values */}
                <section>
                    <h2 className="section-title text-center">Our Core Values</h2>
                    <div className="offer-grid">
                        <div className="value-card">
                            <h3>Innovation</h3>
                            <p>We continually improve to meet the evolving job market.</p>
                        </div>
                        <div className="value-card">
                            <h3>Integrity</h3>
                            <p>We maintain the highest standards of honesty and ethics.</p>
                        </div>
                        <div className="value-card">
                            <h3>Excellence</h3>
                            <p>We strive for excellence in everything we do.</p>
                        </div>
                    </div>
                </section>

                {/* Services */}
                <section>
                    <h2 className="section-title text-center">Our Services</h2>
                    <div className="offer-grid">

                        {/* Service 1 */}
                        <div className="service-card">
                            <h3>Strategic Talent Acquisition & Recruitment</h3>
                            <p>We don't just fill positions — we build high-performing teams that drive your business forward.</p>
                            <ul className="service-list">
                                <li><strong className="text-[#4A4A4A]">Executive & Leadership Search:</strong> Discreet, targeted headhunting for C-suite and strategic roles</li>
                                <li><strong>Permanent Recruitment:</strong> Comprehensive sourcing and placement for critical long-term hires</li>
                                <li><strong>Volume & Mass Recruitment:</strong> Scalable campaigns for high-turnover scenarios</li>
                                <li><strong>Specialized Industry Hiring:</strong> Tailored pipelines for tech, finance, healthcare, and more</li>
                                <li><strong>Passive Candidate Engagement:</strong> Reaching the best talent not actively looking</li>
                            </ul>
                        </div>

                        {/* Service 2 */}
                        <div className="service-card">
                            <h3>Casual & Temporary Staffing Outsourcing</h3>
                            <p>Need flexible, on-demand workforce solutions without the long-term commitment?</p>
                            <ul className="service-list">
                                <li>Rapid placement of casual, temp, and contract workers</li>
                                <li>Flexible staffing models: daily, weekly, or project-based</li>
                                <li>Managed outsourcing for high-volume needs</li>
                                <li>Full compliance handling (labor laws, insurance, payroll)</li>
                            </ul>
                        </div>

                        {/* Service 3 */}
                        <div className="service-card">
                            <h3>Technology-Driven HR Solutions</h3>
                            <p>Innovation is at our core. We leverage modern tools to make the talent journey faster and smarter.</p>
                            <ul className="service-list">
                                <li>AI-powered candidate matching and screening</li>
                                <li>Automated recruitment workflows and applicant tracking</li>
                                <li>Virtual assessment centers and video interviewing</li>
                                <li>Data analytics for recruitment insights</li>
                                <li>Mobile-first job matching for candidates</li>
                            </ul>
                        </div>

                        {/* Service 4 */}
                        <div className="service-card">
                            <h3>Learning & Development Systems</h3>
                            <p>Investing in people is investing in performance. We design customized upskilling programs.</p>
                            <ul className="service-list">
                                <li>Tailored training workshops and certification programs</li>
                                <li>Leadership development & succession planning</li>
                                <li>Soft skills, technical skills, and compliance training</li>
                                <li>Employee onboarding & induction optimization</li>
                                <li>Performance coaching and career path development</li>
                            </ul>
                        </div>

                        {/* Service 5 */}
                        <div className="service-card">
                            <h3>Compensation & Benefits Advisory</h3>
                            <p>Attract and retain top talent with competitive, cost-effective reward strategies.</p>
                            <ul className="service-list">
                                <li>Design market-competitive salary structures</li>
                                <li>Develop attractive benefits packages</li>
                                <li>Implement performance-based incentive schemes</li>
                                <li>Conduct salary benchmarking and total reward audits</li>
                                <li>Ensure compliance with local labor laws</li>
                            </ul>
                        </div>

                        {/* Service 6 */}
                        <div className="service-card">
                            <h3>Team Building & Organizational Development</h3>
                            <p>Strong teams deliver exceptional results. We facilitate powerful experiences.</p>
                            <ul className="service-list">
                                <li>Custom team-building workshops and offsites</li>
                                <li>Culture assessment & transformation programs</li>
                                <li>Conflict resolution and team dynamics interventions</li>
                                <li>Employee engagement surveys & action planning</li>
                                <li>Change management support during restructuring</li>
                            </ul>
                        </div>

                    </div>
                </section>

                {/* Why Partner */}
                <div className="partner-section">
                    <h2 className="section-title text-center">Why partner with Autumhire?</h2>
                    <p className="section-content mb-4 text-lg">
                        Because we combine the aggression of a boutique search firm, the scale of a large agency, and the innovation of a tech-driven HR partner — all delivered with integrity, excellence, and a genuine passion for people.
                    </p>
                    <p className="font-medium text-[#595C5F]">
                        We're not just filling roles. We're shaping futures, building legacies, and powering organizations to thrive in today's dynamic world with flexible, reliable talent solutions.
                    </p>
                </div>

                {/* Objectives */}
                <section>
                    <h2 className="section-title text-center">Objectives</h2>
                    <div className="offer-grid">
                        <div className="offer-item">
                            <h3 className="font-bold text-[#F76C5E] mb-2">Quality Practice</h3>
                            <p>To be a partner of choice in providing quality Talent acquisition practice</p>
                        </div>
                        <div className="offer-item">
                            <h3 className="font-bold text-[#F76C5E] mb-2">Advocacy</h3>
                            <p>To advocate for the best Human Resource practice</p>
                        </div>
                        <div className="offer-item">
                            <h3 className="font-bold text-[#F76C5E] mb-2">Tech Leadership</h3>
                            <p>To lead in the innovation and technology of Talent acquisition systems, tools and strategies</p>
                        </div>
                    </div>
                </section>

                {/* Why Choose Us */}
                <section>
                    <h2 className="section-title text-center">Why Choose Us?</h2>
                    <div className="offer-grid">
                        <div className="offer-item">
                            <h3 className="text-lg font-bold text-[#F76C5E] mb-2">Interface</h3>
                            <p>Clean, distraction-free interface.</p>
                        </div>
                        <div className="offer-item">
                            <h3 className="text-lg font-bold text-[#F76C5E] mb-2">Reach</h3>
                            <p>Localized job opportunities and growing reach.</p>
                        </div>
                        <div className="offer-item">
                            <h3 className="text-lg font-bold text-[#F76C5E] mb-2">Support</h3>
                            <p>Dedicated support for both seekers and recruiters.</p>
                        </div>
                    </div>
                </section>

                {/* Contact CTA */}
                <section className="text-center py-12">
                    <h2 className="section-title">Get in Touch</h2>
                    <p className="section-content mb-4">Have questions or feedback? We'd love to hear from you.</p>
                    <p className="text-xl font-bold text-[#595C5F]">
                        Ready to transform your talent strategy? Contact us today — let's create something extraordinary together.
                    </p>
                </section>

            </main>
        </div>
    );
}

