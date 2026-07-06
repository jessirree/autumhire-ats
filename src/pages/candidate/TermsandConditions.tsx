import { CandidateHeader } from '../../components/ats/CandidateHeader';

interface TermsandConditionsProps {
    onLoginClick: () => void;
    onHomeClick: () => void;
    onJobListingsClick: () => void;
    onAboutClick: () => void;
    isLoggedIn?: boolean;
    userProfile?: { name: string; avatar?: string };
    onLogout?: () => void;
}

export function TermsandConditions({
    onLoginClick,
    onHomeClick,
    onJobListingsClick,
    onAboutClick,
    isLoggedIn,
    userProfile,
    onLogout
}: TermsandConditionsProps) {
    return (
        <div className="min-h-screen bg-background font-sans">
            <CandidateHeader
                onLoginClick={onLoginClick}
                onAboutClick={onAboutClick}
                onHomeClick={onHomeClick}
                onJobListingsClick={onJobListingsClick}
                activePage="terms"
                isLoggedIn={isLoggedIn}
                userProfile={userProfile}
                onLogout={onLogout}
            />
            <div className="terms-container py-12 px-6">
                <div className="terms-card p-8 bg-white">
                    <div className="terms-content">
                        <h2 className="mb-4">Terms of Reference</h2>
                        <ol className="list-decimal pl-6 space-y-2 mb-6">
                            <li>Our HR firm does not permit job postings from organizations or individuals who request payment or any form of compensation from applicants in connection with their job applications.</li>
                            <li>Our HR firm reserves the right to terminate a customer's subscription at its sole discretion with immediate effect.</li>
                            <li>While our HR firm takes reasonable steps to verify the legitimacy of job vacancies posted on our website, we do not assume liability for the authenticity or accuracy of such listings.</li>
                            <li>All job postings must comply with applicable local, national, and international labor laws and regulations.</li>
                            <li>Our HR firm prohibits the posting of discriminatory or offensive content, including but not limited to material that discriminates based on race, gender, age, religion, or disability.</li>
                            <li>Customers are responsible for ensuring that their job postings contain accurate and up-to-date information, including job descriptions, requirements, and application deadlines.</li>
                            <li>Our HR firm may remove or suspend any job posting that violates our terms, policies, or applicable laws without prior notice.</li>
                            <li>Users of our website agree to provide truthful and accurate information when registering or submitting job applications through our platform.</li>
                            <li>Our HR firm is not responsible for any interactions, agreements, or disputes between employers and job applicants that occur outside of our platform.</li>
                            <li>We reserve the right to modify these Terms of Reference at any time, with changes taking effect immediately upon posting on our website.</li>
                            <li>Customers must not use our platform for any purpose other than advertising legitimate job opportunities, such as promotional or marketing activities unrelated to employment.</li>
                            <li>Our HR firm does not guarantee job placements or the suitability of applicants for any advertised position.</li>
                            <li>Any personal data collected through our website will be handled in accordance with our Privacy Policy and applicable data protection laws.</li>
                        </ol>
                        <p className="mb-8"><strong>Effective Date:</strong> June 10, 2025</p>

                        <h2 className="mb-4 mt-5">Privacy Policy</h2>
                        <p className="mb-4">At Autumhire ("we," "us," or "our"), we are committed to safeguarding your privacy and handling your personal information securely and responsibly. This Privacy Policy explains how we collect, use, and protect your personal information in compliance with applicable data protection laws, including the General Data Protection Regulation ("GDPR") and the California Consumer Privacy Act ("CCPA"). By using our job advertising website, you agree to the terms of this Privacy Policy. If you do not agree, please refrain from using our website.</p>

                        <h4 className="font-bold text-lg mb-2">1. Information We Collect</h4>
                        <p className="mb-2">We collect personal information you provide directly and information gathered automatically when you use our website.</p>
                        <strong className="block mb-1">A. Personal Information You Provide</strong>
                        <ul className="list-disc pl-6 space-y-1 mb-4">
                            <li><strong>Account and Profile Information:</strong> Your name, email address, phone number, profile picture, job preferences, and other details provided during registration or use of our website.</li>
                            <li><strong>Job and Career Information:</strong> Your resume, CV, work experience, skills, qualifications, education, and other job-related details.</li>
                            <li><strong>Communication Data:</strong> Messages or interactions within the website, such as communications between job seekers and recruiters.</li>
                        </ul>
                        <strong className="block mb-1">B. Automatically Collected Information</strong>
                        <ul className="list-disc pl-6 space-y-1 mb-4">
                            <li><strong>Device Information:</strong> Details about the device used to access our website, including IP address, browser type, and operating system.</li>
                            <li><strong>Usage Information:</strong> Data on your interactions with the website, such as pages visited, links clicked, job searches, and other activities.</li>
                        </ul>
                        <strong className="block mb-1">C. Sensitive Data</strong>
                        <p className="mb-6">With your explicit consent, we may collect sensitive information, such as diversity-related data or health information, where relevant to job applications.</p>

                        <h4 className="font-bold text-lg mb-2">2. How We Use Your Information</h4>
                        <ul className="list-disc pl-6 space-y-1 mb-6">
                            <li><strong>To Provide Services:</strong> To manage your account, connect job seekers with recruiters, and recommend relevant job opportunities.</li>
                            <li><strong>To Improve Our Website:</strong> To analyze and enhance the website's functionality, performance, and user experience.</li>
                            <li><strong>Communication:</strong> To contact you regarding your account, job applications, website updates, or customer support inquiries.</li>
                            <li><strong>Legal Compliance:</strong> To meet applicable legal, regulatory, or reporting obligations.</li>
                        </ul>

                        <h4 className="font-bold text-lg mb-2">3. Legal Basis for Processing (GDPR)</h4>
                        <p className="mb-2">For users in the European Union, we process personal data based on:</p>
                        <ul className="list-disc pl-6 space-y-1 mb-6">
                            <li><strong>Consent:</strong> When you explicitly agree to data processing (e.g., submitting a resume).</li>
                            <li><strong>Contractual Necessity:</strong> When processing is required to fulfill a contract (e.g., facilitating job applications).</li>
                            <li><strong>Legitimate Interests:</strong> To support our business interests, such as improving the website or marketing our services.</li>
                            <li><strong>Legal Obligation:</strong> To comply with legal requirements, such as tax or employment reporting.</li>
                        </ul>

                        <h4 className="font-bold text-lg mb-2">4. Your Rights (GDPR and CCPA)</h4>
                        <p className="mb-2">Depending on your location, you have the following rights regarding your personal data:</p>
                        <strong className="block mb-1">A. GDPR Rights (EU Residents)</strong>
                        <ul className="list-disc pl-6 space-y-1 mb-4">
                            <li><strong>Right to Access:</strong> Request a copy of your personal data.</li>
                            <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data.</li>
                            <li><strong>Right to Erasure:</strong> Request deletion of your data in certain cases (e.g., when it is no longer needed).</li>
                            <li><strong>Right to Restrict Processing:</strong> Limit how we process your data under specific conditions.</li>
                            <li><strong>Right to Data Portability:</strong> Receive your data in a structured, commonly used format for transfer to another provider.</li>
                            <li><strong>Right to Object:</strong> Object to data processing, including for marketing purposes.</li>
                        </ul>
                        <strong className="block mb-1">B. CCPA Rights (California Residents)</strong>
                        <ul className="list-disc pl-6 space-y-1 mb-4">
                            <li><strong>Right to Know:</strong> Request details about the personal information we collect, including sources, purposes, and third parties it is shared with.</li>
                            <li><strong>Right to Delete:</strong> Request deletion of your personal data, subject to exceptions.</li>
                            <li><strong>Right to Opt-Out:</strong> Opt out of the sale of your personal data (we do not sell your data).</li>
                            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.</li>
                        </ul>
                        <p className="mb-6">To exercise these rights, contact us using the details below. We may verify your identity before processing requests.</p>

                        <h4 className="font-bold text-lg mb-2">5. How We Share Your Information</h4>
                        <ul className="list-disc pl-6 space-y-1 mb-6">
                            <li><strong>With Recruiters and Employers:</strong> When you apply for a job or make your profile visible, we share relevant information with recruiters or employers.</li>
                            <li><strong>With Service Providers:</strong> We share data with third-party vendors (e.g., for data hosting, analytics, or support) who are contractually obligated to secure your data.</li>
                            <li><strong>Legal Requirements:</strong> We may disclose data if required by law, such as in response to a subpoena or investigation.</li>
                        </ul>

                        <h4 className="font-bold text-lg mb-2">6. Data Retention</h4>
                        <p className="mb-6">We retain your personal information only as long as needed for the purposes outlined in this policy or to comply with legal, accounting, or reporting requirements. You may request account or data deletion by emailing privacy@autumhire.com. We will delete your data unless retention is required for legitimate business or legal purposes.</p>

                        <h4 className="font-bold text-lg mb-2">7. Data Security</h4>
                        <p className="mb-6">We implement reasonable security measures to protect your data from unauthorized access, loss, or misuse. However, no data transmission or storage method is completely secure, and we cannot guarantee absolute security.</p>

                        <h4 className="font-bold text-lg mb-2">8. International Data Transfers</h4>
                        <p className="mb-6">If you are outside the European Economic Area (EEA) or California, your data may be transferred to and processed in countries with different data protection laws. We use safeguards, such as standard contractual clauses, to protect your data during such transfers.</p>

                        <h4 className="font-bold text-lg mb-2">9. Children's Privacy</h4>
                        <p className="mb-6">Our website is not intended for individuals under 13. We do not knowingly collect personal information from children under 13. If we discover such data, we will promptly delete it.</p>

                        <h4 className="font-bold text-lg mb-2">10. Changes to This Privacy Policy</h4>
                        <p className="mb-6">We may update this Privacy Policy periodically. Changes will be posted on this page with an updated "Effective Date." Please review this policy regularly to stay informed.</p>

                        <h4 className="font-bold text-lg mb-2">11. Contact Us</h4>
                        <p className="mb-2">For questions, concerns, or to exercise your GDPR or CCPA rights, contact us at:</p>
                        <ul className="list-none mb-6">
                            <li><strong>Email:</strong> support@autumhire.com</li>
                            <li><strong>Address:</strong> Nairobi, Kenya</li>
                            <li><strong>Phone Number:</strong></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

