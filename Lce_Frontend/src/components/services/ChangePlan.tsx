import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Truck, CreditCard, RotateCcw, Check, Loader2 } from 'lucide-react';
import { useSubscriptionPlans, type SubscriptionPlan } from '../../hooks/useSubscriptionPlans';

interface PlanDisplay {
  id: string;
  bags: number;
  price: number;
  savings: number;
  recommended?: boolean;
}

export const ChangePlan = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const { data: apiPlans, isLoading } = useSubscriptionPlans();

  
  const plans: PlanDisplay[] = React.useMemo(() => {
    if (!apiPlans || apiPlans.length === 0) return [];

    
    const bagsMap = new Map<number, SubscriptionPlan>();
    apiPlans.forEach((p) => {
      if (p.billing_cycle === 'annual') {
        bagsMap.set(p.bags_per_month, p);
      }
    });

    return Array.from(bagsMap.values())
      .sort((a, b) => a.bags_per_month - b.bags_per_month)
      .map((plan) => ({
        id: String(plan.id),
        bags: plan.bags_per_month,
        price: Math.round(plan.price_per_bag),
        savings: Math.round(plan.annual_savings),
        recommended: plan.bags_per_month === 4,
      }));
  }, [apiPlans]);

  const [selectedPlan, setSelectedPlan] = React.useState<string>('');

  // Auto-select recommended plan (4 bags) once plans load
  React.useEffect(() => {
    if (plans.length > 0 && !selectedPlan) {
      const recommended = plans.find(p => p.recommended);
      setSelectedPlan(recommended?.id || plans[0].id);
    }
  }, [plans, selectedPlan]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden p-8 md:p-12"
          >
            <button 
              onClick={onClose}
              className="absolute right-6 top-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
              {}
              <div className="md:col-span-2 space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-4">Wash & Fold - Subscribe & Save</h2>
                  <p className="text-slate-500 leading-relaxed">
                    Get our all-inclusive Wash & Fold subscription! Pay by the bag, not by the pound, and save up to 15% compared to Pay-As-You-Go.
                  </p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-6">
                  <Benefit icon={<Calendar size={20} className="text-sky-500" />} text="Reschedule or cancel anytime" />
                  <Benefit icon={<Truck size={20} className="text-sky-500" />} text="$9.99 pickup & delivery" strikethrough />
                  <Benefit icon={<CreditCard size={20} className="text-sky-500" />} text="$5.00 service fee" strikethrough />
                  <Benefit icon={<RotateCcw size={20} className="text-sky-500" />} text="Pickups & Deliveries 8am - 5pm" />
                </div>
              </div>

              {}
              <div className="md:col-span-3 space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin text-sky-500" size={32} />
                  </div>
                ) : plans.length === 0 ? (
                  <p className="text-center text-slate-400 py-16">No plans available</p>
                ) : (
                  plans.map((plan) => (
                    <PlanOption 
                      key={plan.id}
                      plan={plan}
                      isSelected={selectedPlan === plan.id}
                      onSelect={() => setSelectedPlan(plan.id)}
                    />
                  ))
                )}

                <button className="w-full mt-6 py-4 bg-[#00AEEF] hover:bg-[#0096ce] text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]">
                  Confirm Choice
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


const Benefit = ({ icon, text, strikethrough }: { icon: React.ReactNode, text: string, strikethrough?: boolean }) => (
  <div className="flex items-center gap-4">
    <div className="bg-white p-2 rounded-full shadow-sm">{icon}</div>
    <span className={`text-slate-600 font-medium ${strikethrough ? 'line-through opacity-50' : ''}`}>
      {text}
    </span>
  </div>
);

const PlanOption = ({ plan, isSelected, onSelect }: { plan: PlanDisplay, isSelected: boolean, onSelect: () => void }) => (
  <div 
    onClick={onSelect}
    className={`relative flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${
      isSelected ? 'border-[#00AEEF] bg-sky-50/30' : 'border-slate-100 hover:border-slate-200'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
        isSelected ? 'border-[#00AEEF] bg-[#00AEEF]' : 'border-slate-300'
      }`}>
        {isSelected && <Check size={14} className="text-white" />}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-slate-800">{plan.bags} Bag</span>
          <span className="text-slate-400">/ month</span>
          {plan.recommended && (
            <span className="bg-indigo-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full ml-2">
              Recommended
            </span>
          )}
        </div>
        <div className="text-sm text-slate-400 mt-1">
          Paid annually <br />
          <span className="text-green-500 font-semibold">saves ${plan.savings}/ yr</span>
        </div>
      </div>
    </div>
    <div className="text-right">
      <span className="text-2xl font-bold text-slate-800">${plan.price}</span>
      <span className="text-slate-400 font-medium">/ bag</span>
    </div>
  </div>
);