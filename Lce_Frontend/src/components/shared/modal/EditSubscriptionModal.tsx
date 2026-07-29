import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Calculator,
  CreditCard,
  X,
  Clock,
} from "lucide-react";
import { subscriptionAPI, type UserSubscription } from "../../../services/api";
import {
  parseDateSafe,
  getPTDate,
  formatDateObj,
} from "../../../utils/dateHelpers";
import { useToast } from "../../../components/Toast";
import { useAuth } from "../../../context/useAuth";
import { useNavigate } from "react-router-dom";


interface APIPlan {
  id: number;
  billing_cycle: string;
  bags_per_month: number;
  price_per_bag: number;
  annual_savings?: number;
}

interface PricingOption {
  id: number;
  bags: number;
  pricePerBag: number;
  yearlySavings: number;
  recommended?: boolean;
}

interface EditSubscriptionModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  subscription: UserSubscription;
  onUpdated: () => void;
}

const EditSubscriptionModal: React.FC<EditSubscriptionModalProps> = ({
  isOpen,
  setIsOpen,
  subscription,
  onUpdated,
}) => {
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<
    "edit" | "confirm_change" | "cancel_confirm" | "cancel_success"
  >("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  const [selectedId, setSelectedId] = useState<number | null>(
    subscription.plan.id,
  );
  const [allPlans, setAllPlans] = useState<APIPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    subscription.billing_cycle as "monthly" | "annual",
  );
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
  const pricingOptions: PricingOption[] = allPlans
    .filter((p) => p.billing_cycle === billingCycle)
    .map((plan) => ({
      id: plan.id,
      bags: plan.bags_per_month,
      pricePerBag: Math.round(plan.price_per_bag),
      yearlySavings: Math.round(plan.annual_savings || 0),
      recommended: plan.bags_per_month === 4,
    }))
    .sort((a, b) => a.bags - b.bags);

  
  const [cancelResult, setCancelResult] = useState<{
    effectiveDate: string;
  } | null>(null);

  
  useEffect(() => {
    if (isOpen) {
      setViewMode("edit");
      setError(null);
      setCancelResult(null);
      setSelectedId(subscription.plan.id);
      fetchPlans();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen, subscription.plan.id]);

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      const response = await subscriptionAPI.getPlans();
      const plans = response.data.plans || [];
      setAllPlans(plans);

      
    } catch (err) {
      console.error("Failed to fetch subscription plans:", err);
      setError("Failed to load plans. Please try again.");
    } finally {
      setPlansLoading(false);
    }
  };

  if (!isOpen || !subscription) return null;

  const isAnnual = subscription.billing_cycle === "annual";
  const startDate = parseDateSafe(subscription.start_date);
  const now = getPTDate();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isInCoolingOff = diffDays <= 5;

  
  const determineChangeType = (): "upgrade" | "downgrade" | "same" => {
    const currentPlan = allPlans.find((p) => p.id === subscription.plan.id);
    const newPlan = allPlans.find((p) => p.id === selectedId);
    if (!currentPlan || !newPlan) return "same";
    const oldMonthly = currentPlan.price_per_bag * currentPlan.bags_per_month;
    const newMonthly = newPlan.price_per_bag * newPlan.bags_per_month;
    if (newMonthly > oldMonthly) return "upgrade";
    if (
      newMonthly === oldMonthly &&
      billingCycle === "annual" &&
      subscription.billing_cycle === "monthly"
    )
      return "upgrade";
    if (newMonthly < oldMonthly) return "downgrade";
    return "same";
  };

  const changeType = determineChangeType();

  const handleReviewChange = () => {
    if (
      selectedId === subscription.plan.id &&
      billingCycle === subscription.billing_cycle
    ) {
      setIsOpen(false);
      return;
    }
    if (selectedId === null) {
      setError("Please select a valid plan.");
      return;
    }
    setError(null);
    setViewMode("confirm_change");
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedId) return;

    if (changeType === "upgrade" && !user?.payment?.card_last_four) {
      setIsOpen(false);
      navigate("/dashboard/payment");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await subscriptionAPI.update(subscription.id, {
        plan_id: selectedId,
        billing_cycle: billingCycle,
      });
      toast.showSuccess(
        "Your plan change has been scheduled. It will take effect as described.",
      );
      setIsOpen(false);
      onUpdated();
    } catch (err: unknown) {
      console.error("Failed to update subscription", err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update subscription.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await subscriptionAPI.cancel(subscription.id);
      const data = response.data;
      setCancelResult({
        effectiveDate: data.effective_date ?? subscription.end_date,
      });
      setViewMode("cancel_success");
      onUpdated();
    } catch (err: unknown) {
      console.error("Failed to cancel subscription", err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to cancel subscription.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  

  const renderConfirmChange = () => {
    const selectedOption = pricingOptions.find((o) => o.id === selectedId);
    if (!selectedOption) return null;

    const totalCharge =
      billingCycle === "annual"
        ? selectedOption.pricePerBag * selectedOption.bags * 12 -
          selectedOption.yearlySavings
        : selectedOption.pricePerBag * selectedOption.bags;
    const isUpgrade = changeType === "upgrade";

    return (
      <div
        className="flex flex-col items-center text-center p-6 w-full max-w-md bg-white rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setViewMode("edit")}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        {}
        <div
          className={`p-3 rounded-full mb-4 ${isUpgrade ? "bg-emerald-100" : "bg-blue-100"}`}
        >
          {isUpgrade ? (
            <ArrowUp className="text-emerald-600 w-8 h-8" />
          ) : (
            <ArrowDown className="text-blue-600 w-8 h-8" />
          )}
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Confirm Plan {isUpgrade ? "Upgrade" : "Downgrade"}
        </h2>

        {}
        {isUpgrade ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mb-5 w-full text-left">
            <div className="flex items-start gap-2.5">
              <ArrowUp className="text-emerald-600 shrink-0 mt-0.5" size={16} />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Upgrade takes effect at midnight
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Your new plan activates tonight. Any remaining balance from
                  your current plan will be credited automatically.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 w-full text-center">
            <Clock className="text-blue-600 mx-auto mb-2" size={20} />
            <p className="text-sm font-semibold text-blue-800">
              Downgrade on next cycle
            </p>
            <p className="text-xs text-blue-700 mt-1">
              You'll keep your current bag limits until:
            </p>
            <div className="mt-2">
              <span className="inline-block px-4 py-1.5 bg-blue-100/50 text-blue-900 font-bold rounded-full text-sm border border-blue-200/50 shadow-sm">
                {subscription.next_cron_date ? new Date(subscription.next_cron_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
              </span>
            </div>
          </div>
        )}

        {/* Plan details */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-5 w-full text-left">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">New Plan</span>
            <span className="font-medium text-[#2F393D]">
              {selectedOption.bags} Bag{selectedOption.bags > 1 ? "s" : ""} /
              month
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Billing Cycle</span>
            <span className="font-medium text-[#2F393D] capitalize">
              {billingCycle}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Price per bag</span>
            <span className="font-medium text-[#2F393D]">
              ${selectedOption.pricePerBag}
            </span>
          </div>
          {billingCycle === "annual" && selectedOption.yearlySavings > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Annual Savings</span>
              <span className="font-medium text-green-600">
                ${selectedOption.yearlySavings}
              </span>
            </div>
          )}
          <hr className="border-slate-200" />
          <div className="flex justify-between text-base">
            <span className="font-semibold text-[#2F393D]">
              {isUpgrade
                ? billingCycle === "annual"
                  ? "Annual Total"
                  : "Monthly Total"
                : "New Rate"}
            </span>
            <span className="font-bold text-[#2F393D]">
              ${totalCharge.toLocaleString()}
              {!isUpgrade ? (billingCycle === "annual" ? "/yr" : "/mo") : ""}
            </span>
          </div>
        </div>

        {/* Payment card info (upgrades only) */}
        {isUpgrade &&
          (user?.payment?.card_last_four ? (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5 w-full text-left">
              <CreditCard className="text-blue-500 shrink-0" size={20} />
              <div className="text-sm">
                <span className="text-slate-600">
                  Will charge card ending in{" "}
                </span>
                <span className="font-semibold text-[#2F393D]">
                  {user.payment.card_last_four}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 w-full text-left">
              <CreditCard className="text-amber-500 shrink-0" size={20} />
              <div className="text-sm text-amber-800">
                Please add a payment method before upgrading.
              </div>
            </div>
          ))}

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-xl w-full">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 w-full">
          <button
            onClick={() => setViewMode("edit")}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Back
          </button>
          <button
            onClick={handleConfirmPlanChange}
            disabled={isSubmitting}
            className={`flex-1 py-2.5 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              isUpgrade
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-[#00aeef] hover:bg-[#0096ce]"
            }`}
          >
            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
            {isUpgrade
              ? user?.payment?.card_last_four
                ? "Confirm Upgrade"
                : "Add Payment Method"
              : "Confirm Downgrade"}
          </button>
        </div>
      </div>
    );
  };

  const renderCancelSuccess = () => (
    <div
      className="flex flex-col items-center text-center p-6 w-full max-w-md bg-white rounded-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-amber-100 p-3 rounded-full mb-4">
        <Clock className="text-amber-600 w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Cancellation Scheduled
      </h2>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 w-full mb-6 text-left">
        <div className="space-y-2 text-sm text-amber-900">
          {isAnnual ? (
            <p>
              Your subscription will remain active until the end of the busness day.<br/>
              You can undo this at any time before that date.
            </p>
          ) : (
            <>
              <p>
                Your subscription will remain <strong>fully active</strong> until:
              </p>
              <p className="text-lg font-bold text-amber-800 text-center">
                {cancelResult ? formatDateObj(parseDateSafe(cancelResult.effectiveDate)) : ''}
              </p>
              <p className="text-xs text-amber-700 mt-2 italic">
                You can undo this cancellation at any time before this date from your subscription settings.
              </p>
            </>
          )}
        </div>
      </div>

      <button
        onClick={handleClose}
        className="w-full py-3 rounded-xl font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors"
      >
        Close
      </button>
    </div>
  );

  const renderCancelConfirm = () => (
    <div
      className="flex flex-col items-center text-center p-6 w-full max-w-md bg-white rounded-2xl relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setViewMode("edit")}
        className="absolute left-4 top-4 text-gray-400 hover:text-gray-800"
      >
        &larr; Back
      </button>
      <div className="bg-red-100 p-3 rounded-full mb-4 mt-4">
        <AlertTriangle className="text-red-600 w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        Cancel Subscription?
      </h2>
      <p className="text-gray-600 mb-6">
        Are you sure you want to cancel your <br />{" "}
        <strong>{subscription.plan.name}</strong>?
      </p>

      {isAnnual ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full mb-6 text-left text-sm text-gray-600">
          Your subscription will remain active until the end of the busness day.  You can undo this at any time before that date.
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 w-full mb-6 text-left text-sm text-gray-600">
          Your subscription will remain active until the end of the current billing period ({formatDateObj(parseDateSafe(subscription.end_date))}). You can undo this at any time before that date.
        </div>
      )}

      {error && (
        <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-xl w-full">
          {error}
        </div>
      )}

      <div className="flex gap-3 w-full">
        <button
          onClick={() => setViewMode("edit")}
          className="flex-1 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors border"
          disabled={isSubmitting}
        >
          Keep Plan
        </button>
        <button
          onClick={handleConfirmCancel}
          className="flex-1 py-3 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : (
            "Confirm Cancel"
          )}
        </button>
      </div>
    </div>
  );

  const renderEdit = () => (
    <div
      className="w-full sm:max-w-2xl max-h-[90vh] bg-gray-50 rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-6 relative">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Edit Subscription
        </h2>
        <p className="text-gray-600 mb-6">
          Choose a new plan or manage your current subscription.
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Current Plan
          </p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold text-[#2F393D]">
                {subscription.plan.name}
              </p>
              <p className="text-sm text-gray-500">
                {subscription.plan.bags_per_month} Bags / Month (
                {subscription.billing_cycle})
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#2F393D]">
                ${Math.round(subscription.plan.price_per_bag)}/bag
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Available Plans
        </h3>

        {}
        <div className="flex bg-slate-200/60 p-1 rounded-xl mb-4 mx-auto w-full sm:w-fit justify-between">
          <button
            type="button"
            onClick={() => {
              setBillingCycle("monthly");
              const currentPlan = allPlans.find((p) => p.id === selectedId);
              const bags = currentPlan ? currentPlan.bags_per_month : 1;
              const newPlan = allPlans.find(
                (p) =>
                  p.billing_cycle === "monthly" && p.bags_per_month === bags,
              );
              if (newPlan) {
                setSelectedId(newPlan.id);
              } else {
                const fallback = allPlans.find(
                  (p) =>
                    p.billing_cycle === "monthly" && p.bags_per_month === 1,
                );
                if (fallback) setSelectedId(fallback.id);
              }
            }}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              billingCycle === "monthly"
                ? "bg-white text-sky-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => {
              setBillingCycle("annual");
              const currentPlan = allPlans.find((p) => p.id === selectedId);
              const bags = currentPlan ? currentPlan.bags_per_month : 1;
              const newPlan = allPlans.find(
                (p) =>
                  p.billing_cycle === "annual" && p.bags_per_month === bags,
              );
              if (newPlan) {
                setSelectedId(newPlan.id);
              } else {
                const fallback = allPlans.find(
                  (p) => p.billing_cycle === "annual" && p.bags_per_month === 1,
                );
                if (fallback) setSelectedId(fallback.id);
              }
            }}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              billingCycle === "annual"
                ? "bg-white text-sky-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Annual{" "}
            <span className="hidden sm:inline-block bg-[#4CAF50]/10 text-[#4CAF50] border border-[#4CAF50]/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
              Save up to 15%
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {plansLoading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse border rounded-xl p-4 border-gray-200"
              >
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/4"></div>
              </div>
            ))
          ) : pricingOptions.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-white rounded-xl border border-gray-200">
              No alternative plans found.
            </div>
          ) : (
            pricingOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => setSelectedId(option.id)}
                className={`cursor-pointer border rounded-2xl p-4 transition-all
                            ${
                              selectedId === option.id
                                ? "border-sky-500 bg-sky-50/50 ring-1 ring-sky-500"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-3 items-center">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center
                                        ${
                                          selectedId === option.id
                                            ? "border-sky-500"
                                            : "border-slate-300"
                                        }`}
                    >
                      {selectedId === option.id && (
                        <div className="w-3 h-3 bg-sky-500 rounded-full" />
                      )}
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-[#2F393D]">
                        {option.bags} Bag
                      </span>
                      <span className="text-slate-500 text-xs font-semibold">
                        / month
                      </span>
                    </div>
                  </div>

                  {option.recommended && (
                    <span className="bg-[#6F48C7] text-white text-[11px] px-3 py-1 rounded-full font-medium tracking-wide">
                      Recommended
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-end pl-8">
                  <div className="min-h-[36px] flex flex-col justify-end">
                    {billingCycle === "annual" ? (
                      <>
                        <div className="text-xs text-slate-500">
                          Paid annually
                        </div>
                        <div className="text-xs text-[#4CAF50] font-medium mt-0.5">
                          saves ${option.yearlySavings}/yr
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500">Paid monthly</div>
                    )}
                  </div>

                  <div className="text-right flex items-baseline gap-1">
                    <span className="text-xl font-bold text-[#2F393D]">
                      ${option.pricePerBag}
                    </span>
                    <span className="text-sm font-semibold text-[#2F393D]">
                      / bag
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {error && (
          <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleReviewChange}
            disabled={isSubmitting}
            className="w-full text-lg font-medium py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 bg-[#00aeef] hover:bg-[#0096ce] text-white active:scale-[0.98]"
          >
            Review Change
          </button>

          <button
            type="button"
            onClick={() => setViewMode("cancel_confirm")}
            className="w-full text-gray-500 hover:text-gray-700 font-medium py-2 transition-colors underline"
          >
            Cancel Subscription
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      {viewMode === "edit" && renderEdit()}
      {viewMode === "confirm_change" && renderConfirmChange()}
      {viewMode === "cancel_confirm" && renderCancelConfirm()}
      {viewMode === "cancel_success" && renderCancelSuccess()}
    </div>,
    document.body,
  );
};

export default EditSubscriptionModal;
