import React from 'react';
import { motion } from 'framer-motion';
import { 
  Award, 
  UserCheck, 
  Calendar, 
  Truck, 
  Package, 
  CheckCircle, 
  Bike 
} from 'lucide-react';

const DeliveryTimeline = ({ status, deliveryStatus, pickupDate }) => {

  /* ------------------------------------------------------------------
   * STRICT DELIVERY FLOW (FINAL — do not modify)
   * ------------------------------------------------------------------*/
  const steps = [
    { key: 'accepted', label: 'Delivery Accepted', icon: UserCheck, description: 'You confirmed your delivery details.' },
    { key: 'pickup_scheduled', label: 'Pickup Scheduled', icon: Calendar, description: 'Admin has scheduled pickup for your item.' },
    { key: 'in_transit', label: 'In Transit', icon: Truck, description: 'Your item is being transported.' },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: Bike, description: 'Your item is on the final route to you.' },
    { key: 'delivered', label: 'Delivered', icon: Package, description: 'Your item has been delivered.' },
    { key: 'completed', label: 'Completed', icon: CheckCircle, description: 'Transaction completed. Enjoy your item!' }
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
        {/* Main Progress Line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200">
          <div
            className="bg-green-500 transition-all duration-500 ease-in-out"
            style={{
              height:
                currentIndex >= 0
                  ? `${(currentIndex / (steps.length - 1)) * 100}%`
                  : '0%'
            }}
          />
        </div>

        <div className="space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07 }}
                className="flex items-start gap-4 relative"
              >
                {/* Step Dot */}
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${
                      isCompleted
                        ? 'bg-green-500 border-green-600 text-white scale-110'
                        : isCurrent
                        ? 'bg-blue-500 border-blue-600 text-white shadow-lg scale-110'
                        : 'bg-white border-gray-300 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>

                  {/* Status Label */}
                  <div
                    className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white
                    ${
                      isCompleted
                        ? 'bg-green-500'
                        : isCurrent
                        ? 'bg-blue-500'
                        : 'bg-gray-400'
                    }`}
                  >
                    {isCompleted ? '✓ Done' : isCurrent ? '● Current' : '○ Upcoming'}
                  </div>
                </div>

                {/* Step Text */}
                <div
                  className={`flex-1 min-w-0 pb-6 ${
                    index < steps.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <p
                      className={`font-semibold text-lg ${
                        isCompleted
                          ? 'text-green-700'
                          : isCurrent
                          ? 'text-blue-700'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </p>

                    {isCurrent && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                        In Progress
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600">{step.description}</p>

                  {/* Pickup Scheduled Date */}
                  {isCurrent && step.key === 'pickup_scheduled' && pickupDate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                      <p className="text-blue-700 text-sm font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        📅 Pickup on {new Date(pickupDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Out for Delivery */}
                  {isCurrent && step.key === 'out_for_delivery' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                      <p className="text-yellow-700 text-sm font-medium flex items-center gap-2">
                        <Bike className="w-4 h-4" />
                        🚴 Item is on the final route to your address
                      </p>
                    </div>
                  )}

                  {/* In Transit */}
                  {isCurrent && step.key === 'in_transit' && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2">
                      <p className="text-purple-700 text-sm font-medium flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        🚚 Item is being transported
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer Progress Bar */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-700 font-medium text-sm">
              Progress: {currentIndex + 1} of {steps.length}
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
