import { useState } from 'react';
import { CreditCard, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function PaymentPage({ planId, onPay, onBack }: { planId: string, onPay: () => void, onBack: () => void }) {
    const [isProcessing, setIsProcessing] = useState(false);

    const planDetails = {
        'standard': { name: 'Standard Plan', price: '$99.00' },
        'premium': { name: 'Premium Plan', price: '$249.00' }
    }[planId] || { name: 'Unknown Plan', price: '$0.00' };

    const handlePay = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        // Simulate API call
        setTimeout(() => {
            setIsProcessing(false);
            onPay();
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="text-center text-3xl font-extrabold text-gray-900">
                    Checkout
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl flex flex-col md:flex-row gap-8 px-4">

                {/* Order Summary */}
                <div className="flex-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="text-gray-600">{planDetails.name}</span>
                        <span className="font-medium text-gray-900">{planDetails.price}</span>
                    </div>
                    <div className="flex justify-between py-3 border-b border-gray-100">
                        <span className="text-gray-600">Tax estimates</span>
                        <span className="font-medium text-gray-900">$0.00</span>
                    </div>
                    <div className="flex justify-between py-4 text-lg font-bold text-gray-900">
                        <span>Total</span>
                        <span>{planDetails.price}</span>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center gap-3 text-sm text-gray-500">
                        <Lock className="size-4" />
                        Secure checkout powered by Stripe
                    </div>
                </div>

                {/* Payment Form */}
                <div className="flex-[2] bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
                    <form className="space-y-6" onSubmit={handlePay}>

                        <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>

                        <div>
                            <label htmlFor="card-number" className="block text-sm font-medium text-gray-700">
                                Card number
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <CreditCard className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    type="text"
                                    name="card-number"
                                    id="card-number"
                                    autoComplete="cc-number"
                                    className="focus:ring-[var(--pumpkin-orange)] focus:border-[var(--pumpkin-orange)] block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 border"
                                    placeholder="0000 0000 0000 0000"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="card-expiry" className="block text-sm font-medium text-gray-700">
                                    Expiration date (MM/YY)
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="card-expiry"
                                        id="card-expiry"
                                        autoComplete="cc-exp"
                                        className="focus:ring-[var(--pumpkin-orange)] focus:border-[var(--pumpkin-orange)] block w-full sm:text-sm border-gray-300 rounded-md py-2 border"
                                        placeholder="MM / YY"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="card-cvc" className="block text-sm font-medium text-gray-700">
                                    CVC
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        name="card-cvc"
                                        id="card-cvc"
                                        autoComplete="csc"
                                        className="focus:ring-[var(--pumpkin-orange)] focus:border-[var(--pumpkin-orange)] block w-full sm:text-sm border-gray-300 rounded-md py-2 border"
                                        placeholder="123"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="name-on-card" className="block text-sm font-medium text-gray-700">
                                Name on card
                            </label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="name-on-card"
                                    id="name-on-card"
                                    autoComplete="cc-name"
                                    className="focus:ring-[var(--pumpkin-orange)] focus:border-[var(--pumpkin-orange)] block w-full sm:text-sm border-gray-300 rounded-md py-2 border"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="billing-address" className="block text-sm font-medium text-gray-700">
                                Billing Address
                            </label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="billing-address"
                                    id="billing-address"
                                    autoComplete="street-address"
                                    className="focus:ring-[var(--pumpkin-orange)] focus:border-[var(--pumpkin-orange)] block w-full sm:text-sm border-gray-300 rounded-md py-2 border"
                                    placeholder="123 Main St, New York, NY"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4">
                            <Button type="button" variant="ghost" onClick={onBack}>
                                <ArrowLeft className="size-4 mr-2" /> Back
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[var(--pumpkin-orange)] hover:bg-[var(--pumpkin-orange)]/90 text-white w-full sm:w-auto px-8"
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Processing...' : `Pay ${planDetails.price}`}
                            </Button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}

