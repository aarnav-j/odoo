export default function StatusStepper({ currentStatus }) {
  const steps = [
    { key: 'draft', label: 'Draft' },
    { key: 'in_transit', label: 'In Transit' },
    { key: 'completed', label: 'Completed' }
  ];
  
  const statusOrder = ['draft', 'in_transit', 'completed'];
  const currentIndex = statusOrder.indexOf(currentStatus);
  
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => {
        const stepIndex = statusOrder.indexOf(step.key);
        const isCompleted = stepIndex < currentIndex;
        const isCurrent = stepIndex === currentIndex;
        const isUpcoming = stepIndex > currentIndex;
        
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                    ? 'bg-blue-500 text-white ring-4 ring-blue-500/20'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isCompleted || isCurrent
                    ? 'text-slate-200'
                    : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-gray-600'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

