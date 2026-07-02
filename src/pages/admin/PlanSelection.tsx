import { Check, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface PlanProps {
    name: string;
    price: string;
    features: string[];
    isPopular?: boolean;
    onSelect: () => void;
    buttonText?: string;
}

const PlanCard = ({ name, price, features, isPopular, onSelect, buttonText = "Choose Plan" }: PlanProps) => (
    <div className={`relative bg-white rounded-2xl shadow-sm border ${isPopular ? 'border-[var(--pumpkin-orange)] shadow-lg scale-105 z-10' : 'border-gray-200'} p-8 flex flex-col`}>
        {isPopular && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--pumpkin-orange)] text-white text-xs font-bold uppercase tracking-wide py-1 px-3 rounded-full">
                Most Popular
            </div>
        )}
        <h3 className="text-xl font-bold text-gray-900 mb-2">{name}</h3>
        <div className="flex items-baseline gap-1 mb-6">
            <span className="text-4xl font-bold text-gray-900">{price}</span>
            {price !== 'Free' && <span className="text-gray-500">/job</span>}
        </div>

        <ul className="space-y-4 mb-8 flex-1">
            {features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-600 text-sm">
                    <Check className="size-5 text-green-500 shrink-0" />
                    <span>{feature}</span>
                </li>
            ))}
        </ul>

        <Button
            onClick={onSelect}
            className={`w-full ${isPopular ? 'bg-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/90 text-white' : ''}`}
            variant={isPopular ? 'default' : 'outline'}
        >
            {buttonText} {isPopular && <ArrowRight className="size-4 ml-2" />}
        </Button>
    </div>
);

export function PlanSelection({ onSelectPlan }: { onSelectPlan: (planId: string) => void }) {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Choose a plan for your job posting
                    </h2>
                    <p className="mt-4 text-xl text-gray-600">
                        Select the best option to reach your ideal candidates.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <PlanCard
                        name="Free"
                        price="Free"
                        features={[
                            "Standard job post visibility",
                            "Active for 30 days",
                            "Basic candidate management",
                            "Email support"
                        ]}
                        onSelect={() => onSelectPlan('free')}
                    />

                    <PlanCard
                        name="Standard"
                        price="$99"
                        isPopular
                        features={[
                            "Everything in Free",
                            "Highlighted post on job board",
                            "Active for 60 days",
                            "Access to candidate database",
                            "Priority email support",
                            "Social media sharing"
                        ]}
                        onSelect={() => onSelectPlan('standard')}
                    />

                    <PlanCard
                        name="Premium"
                        price="$249"
                        features={[
                            "Everything in Standard",
                            "Top placement on job board",
                            "Active for 90 days",
                            "Dedicated account manager",
                            "Advanced analytics reports",
                            "AI-powered candidate screening"
                        ]}
                        onSelect={() => onSelectPlan('premium')}
                    />
                </div>
            </div>
        </div>
    );
}

