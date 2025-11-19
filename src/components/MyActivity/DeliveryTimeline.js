import React from 'react';
import { motion } from 'framer-motion';
import { Award, UserCheck, Calendar, Truck, Package, CheckCircle } from 'lucide-react';

const DeliveryTimeline = ({ status, deliveryStatus, pickupDate }) => {
  const steps = [
    { key: 'awarded', label: 'Item Awarded', icon: Award, description: 'You won the item!' },
    { key: 'accepted', label: 'Delivery Accepted', icon: UserCheck, description: 'You confirmed delivery' },
    { key: 'pickup_scheduled', label: 'Pickup Scheduled', icon: Calendar, description: 'Pickup date set' },
    { key: 'delivery_processing', label: 'In Transit', icon: Truck, description: 'Item is on the way' },
    { key: 'delivered', label: 'Delivered', icon: Package, description: 'Item received' },
    { key: 'completed', label: 'Completed', icon: CheckCircle, description: 'Transaction finished' }
  ];

  const currentStatus = deliveryStatus || status;
  const currentIndex = steps.findIndex(step => step.key === currentStatus);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h4 className="font-semibold text-gray-900 text-lg mb-6 flex items-center gap-3">
        <Truck className="w-5 h-5 text-blue-600" />
        Delivery Progress
      </h4>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200">
          <div 
            className="bg-green-500 transition-all duration-500 ease-in-out"
            style={{ 
              height: currentIndex >= 0 ? `${(currentIndex / (steps.length - 1)) * 100}%` : '0%' 
            }}
          />
        </div>

        <div className="space-y-8">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isUpcoming = index > currentIndex;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-4 relative"
              >
                {/* Step Indicator */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-600 text-white shadow-lg scale-110' 
                      : isCurrent 
                      ? 'bg-blue-500 border-blue-600 text-white shadow-lg scale-110 pulse-current'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  
                  {/* Status Tag */}
                  <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white ${
                    isCompleted ? 'bg-green-500' :
                    isCurrent ? 'bg-blue-500' :
                    'bg-gray-400'
                  }`}>
                    {isCompleted ? '✓ Done' : isCurrent ? '● Current' : '○ Upcoming'}
                  </div>
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 pb-6 ${
                  index < steps.length - 1 ? 'border-b border-gray-100' : ''
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <p className={`font-semibold text-lg ${
                      isCompleted ? 'text-green-700' :
                      isCurrent ? 'text-blue-700' :
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    
                    {/* Progress Indicator */}
                    {isCurrent && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                        In Progress
                      </span>
                    )}
                    {isCompleted && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                        Completed
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{step.description}</p>
                  
                  {isCurrent && step.key === 'pickup_scheduled' && pickupDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                      <p className="text-blue-700 text-sm font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        📅 Pickup Scheduled for {new Date(pickupDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {isCurrent && step.key === 'delivery_processing' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                      <p className="text-orange-700 text-sm font-medium flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        🚚 Your item is on the way to you
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-700 font-medium text-sm">
              Progress: {currentIndex + 1} of {steps.length} steps
            </p>
            <p className="text-blue-600 text-xs">
              {currentIndex === steps.length - 1 ? 'Completed! 🎉' : 'Keep going!'}
            </p>
          </div>
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryTimeline;