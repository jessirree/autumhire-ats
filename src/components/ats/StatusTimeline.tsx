import { Check } from 'lucide-react';

interface TimelineStep {
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  date?: string;
}

interface StatusTimelineProps {
  steps: TimelineStep[];
}

export function StatusTimeline({ steps }: StatusTimelineProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="relative flex items-center w-full">
              {index > 0 && (
                <div
                  className={`flex-1 h-0.5 ${
                    steps[index - 1].status === 'completed' ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              )}
              <div
                className={`size-8 rounded-full flex items-center justify-center border-2 ${
                  step.status === 'completed'
                    ? 'bg-blue-500 border-blue-500'
                    : step.status === 'current'
                    ? 'bg-white border-blue-500'
                    : 'bg-white border-gray-200'
                }`}
              >
                {step.status === 'completed' ? (
                  <Check className="size-4 text-white" />
                ) : step.status === 'current' ? (
                  <div className="size-3 rounded-full bg-blue-500" />
                ) : (
                  <div className="size-3 rounded-full bg-gray-200" />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 ${
                    step.status === 'completed' ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
            <div className="mt-3 text-center">
              <p
                className={`text-xs font-medium ${
                  step.status !== 'upcoming' ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-gray-500 mt-1">{step.date}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

