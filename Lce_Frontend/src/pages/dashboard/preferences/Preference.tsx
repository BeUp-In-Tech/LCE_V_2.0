import { useState, useEffect } from 'react';
import { Beaker, Shirt, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { SelectionCard } from './SelectionCard';
import { preferencesAPI, communicationAPI } from '../../../services/api';
import type { PreferencesData, CommunicationSettings } from '../../../services/api';
import { usePreferences, useCommunicationSettings, queryKeys } from '../../../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { PreferenceSkeleton } from '../../../components/ui/Skeleton';


const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`w-12 h-6 rounded-full relative transition-colors ${checked ? 'bg-[#00A7EE]' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <div
      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${checked ? 'left-7' : 'left-1'
        }`}
    />
  </button>
);


const RadioCircle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <div
    onClick={onChange}
    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer ${checked ? 'border-[#00A7EE]' : 'border-gray-300'
      }`}
  >
    {checked && <div className="w-2.5 h-2.5 bg-[#00A7EE] rounded-full" />}
  </div>
);

const LaundryPreferences = () => {
  const { data: prefsData, isLoading: prefsLoading } = usePreferences();
  const { data: commData, isLoading: commLoading } = useCommunicationSettings();
  const qc = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [detergent, setDetergent] = useState('unscented');
  const [useFabricSoftener, setUseFabricSoftener] = useState(true);
  const [useBleach, setUseBleach] = useState(false);
  const [foldPref, setFoldPref] = useState('hang');
  const [starchLevel, setStarchLevel] = useState('None');

  const [washInstruction, setWashInstruction] = useState('');
  const [dryCleaningInstruction, setDryCleaningInstruction] = useState('');
  const [driverInstruction, setDriverInstruction] = useState('');
  const [searchValue, setSearchValue] = useState('');

  const [communications, setCommunications] = useState<CommunicationSettings>({
    pickup_confirm_email: true,
    picked_up_email: true,
    delivered_email: true,
    pickup_confirm_sms: true,
    picked_up_sms: true,
    delivered_sms: true,
    payment_sms: true,
  });

  const starchOptions = ['None', 'Light', 'Medium', 'Heavy'];
  const maxChars = 120;

  
  useEffect(() => {
    const prefs = prefsData?.preferences;
    if (prefs) {
      setDetergent((prefs.detergent || 'unscented').toLowerCase());
      setUseFabricSoftener(prefs.softener === 'Yes');
      setUseBleach(prefs.bleach === 'Yes');
      setFoldPref(prefs.hanging === 'Hang_and_Fold' ? 'hang' : 'fold');
      setStarchLevel(prefs.starch || 'None');
      setWashInstruction(prefs.wash_fold_instructions || '');
      setDryCleaningInstruction(prefs.laundry_instructions || '');
      setDriverInstruction(prefs.driver_instructions || '');
    }
  }, [prefsData]);

  useEffect(() => {
    const comm = commData?.settings;
    if (comm) {
      const toBoolean = (val: string | boolean | undefined | null): boolean => val === undefined || val === null ? true : (val === 'Yes' || val === true || val === 'on');
      setCommunications({
        pickup_confirm_email: toBoolean(comm.pickup_confirm_email),
        picked_up_email: toBoolean(comm.picked_up_email),
        delivered_email: toBoolean(comm.delivered_email),
        pickup_confirm_sms: toBoolean(comm.pickup_confirm_sms),
        picked_up_sms: toBoolean(comm.picked_up_sms),
        delivered_sms: toBoolean(comm.delivered_sms),
        payment_sms: toBoolean(comm.payment_sms),
      });
    }
  }, [commData]);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const prefsData: PreferencesData = {
        detergent: detergent === 'scented' ? 'Scented' : 'Unscented',
        softener: useFabricSoftener ? 'Yes' : 'No',
        bleach: useBleach ? 'Yes' : 'No',
        hanging: foldPref === 'hang' ? 'Hang_and_Fold' : 'Fold_Only',
        starch: starchLevel,
        wash_fold_instructions: washInstruction,
        laundry_instructions: dryCleaningInstruction,
        driver_instructions: driverInstruction,
      };

      
      const toYesNo = (val: boolean | string | undefined): string => val === true || val === 'Yes' ? 'Yes' : 'No';

      const commData = {
        pickup_confirm_email: toYesNo(communications.pickup_confirm_email),
        picked_up_email: toYesNo(communications.picked_up_email),
        delivered_email: toYesNo(communications.delivered_email),
        pickup_confirm_sms: toYesNo(communications.pickup_confirm_sms),
        picked_up_sms: toYesNo(communications.picked_up_sms),
        delivered_sms: toYesNo(communications.delivered_sms),
        payment_sms: toYesNo(communications.payment_sms),
      };

      await Promise.all([
        preferencesAPI.update(prefsData),
        communicationAPI.update(commData)
      ]);

      
      qc.invalidateQueries({ queryKey: queryKeys.preferences });
      qc.invalidateQueries({ queryKey: queryKeys.communications });

      setSuccessMessage('Preferences saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCommunicationChange = (key: keyof CommunicationSettings, value: boolean) => {
    setCommunications(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (prefsLoading || commLoading) {
    return <PreferenceSkeleton />;
  }

  return (
    <div className="min-h-screen max-w-6xl px-2 sm:px-4 lg:px-6">
      <main className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {}
        <div className="lg:col-span-1">
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#2F393D]">
            Your Preferences
          </h1>
          <p className="mt-3 text-[#4B5457] text-sm leading-[150%] roboto-flex">
            Please tell us your preferences. Then we'll do your Wash & Fold Laundry and Dry cleaning/Launder & Press your way! You can come back and change your preferences any time.
          </p>
        </div>

        {}
        <div className="lg:col-span-3 pb-16 space-y-6">

          {}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {successMessage}
            </div>
          )}

          {}
          <section>
            <h2 className="text-xl font-medium text-[#4B5457] mb-4">Detergent</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <SelectionCard
                label="Unscented"
                isSelected={detergent === 'unscented'}
                onClick={() => setDetergent('unscented')}
                icon={<Beaker className="w-7 h-7 text-gray-500" />}
              />
              <SelectionCard
                label="Scented"
                isSelected={detergent === 'scented'}
                onClick={() => setDetergent('scented')}
                icon={<Beaker className="w-7 h-7 text-gray-500" />}
              />
            </div>
          </section>

          {}
          <section>
            <h2 className="text-xl font-medium text-[#4B5457] mb-4">Fabric Softener</h2>
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <Shirt className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-[#4B5457] text-base">Use Fabric Softener</span>
                </div>
                <Toggle checked={useFabricSoftener} onChange={() => setUseFabricSoftener(!useFabricSoftener)} disabled={isSaving} />
              </div>
              {useFabricSoftener && (
                <>
                  <div className="h-px bg-gray-100 my-3" />
                  <div className="flex items-center justify-end gap-2 text-[#4B5457] text-sm">
                    <AlertTriangle className="w-4 h-4" /> This adds scent.
                  </div>
                </>
              )}
            </div>
          </section>

          {}
          <section>
            <h2 className="text-xl font-medium text-[#4B5457] mb-4">Use Bleaching</h2>
            <div className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <Sparkles className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-[#4B5457] text-base">Bleach White as Needed</span>
                </div>
                <Toggle checked={useBleach} onChange={() => setUseBleach(!useBleach)} disabled={isSaving} />
              </div>
            </div>
          </section>

          {}
          <section>
            <h2 className="text-xl font-medium text-[#4B5457] mb-4">Fold clothes</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <SelectionCard
                label="Hang some items"
                description="(e.g., slacks, button-front shirts) and fold the rest"
                isSelected={foldPref === 'hang'}
                onClick={() => setFoldPref('hang')}
                icon={<Shirt className="w-7 h-7 text-gray-500" />}
              />
              <SelectionCard
                label="Fold everything you can"
                isSelected={foldPref === 'fold'}
                onClick={() => setFoldPref('fold')}
                icon={<Shirt className="w-7 h-7 text-gray-500" />}
              />
            </div>
          </section>

          {}
          <section>
            <h2 className="text-xl font-medium text-[#4B5457] mb-4">Starch Level</h2>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg">
                  <Shirt className="text-gray-400 w-5 h-5" />
                </div>
                <input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search for dress shirts"
                  className="flex-1 outline-none text-gray-600"
                />
              </div>

              <div className="h-px bg-gray-100 my-4" />

              {}
              <div className="flex flex-wrap gap-6 pl-2">
                {starchOptions.map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <RadioCircle checked={starchLevel === option} onChange={() => setStarchLevel(option)} />
                    <span className="text-gray-600 text-sm">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {}
          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-[#4B5457]">Special Instructions</h2>

            {}
            <div>
              <label className="block text-base text-[#4B5457] mb-2">
                Wash & fold laundry instructions:
              </label>
              <textarea
                value={washInstruction}
                onChange={(e) => setWashInstruction(e.target.value.slice(0, maxChars))}
                placeholder="Type instructions here..."
                className="w-full h-20 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-400 resize-none text-sm"
                disabled={isSaving}
              />
              <p className="text-right text-xs text-gray-400 mt-1">{maxChars - washInstruction.length} characters left</p>
            </div>

            {}
            <div>
              <label className="block text-base text-[#4B5457] mb-2">
                Dry cleaning/shirt laundry instructions:
              </label>
              <textarea
                value={dryCleaningInstruction}
                onChange={(e) => setDryCleaningInstruction(e.target.value.slice(0, maxChars))}
                placeholder="Type instructions here..."
                className="w-full h-20 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-400 resize-none text-sm"
                disabled={isSaving}
              />
              <p className="text-right text-xs text-gray-400 mt-1">{maxChars - dryCleaningInstruction.length} characters left</p>
            </div>

            {}
            <div>
              <label className="block text-base text-[#4B5457] mb-2">
                Driver Instructions <span className="text-gray-400">(e.g. laundry at back door)</span>
              </label>
              <textarea
                value={driverInstruction}
                onChange={(e) => setDriverInstruction(e.target.value.slice(0, maxChars))}
                placeholder="Type instructions here..."
                className="w-full h-20 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-400 resize-none text-sm"
                disabled={isSaving}
              />
              <p className="text-right text-xs text-gray-400 mt-1">{maxChars - driverInstruction.length} characters left</p>
            </div>
          </section>

          {}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-[#4B5457]">Communications Choices</h2>
              <p className="text-xs text-gray-500 mt-1">
                You are in control of how (emails and text messages) and when we communicate with you. You can change your choices at any time.
              </p>
            </div>

            <div className="space-y-4">
              {}
              <div className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-base text-[#2F393D] mb-4">Pickup scheduled confirmations</h3>
                <div className="h-px bg-gray-100 mb-4" />
                <div className="flex items-center justify-between sm:justify-start sm:gap-40">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <RadioCircle
                      checked={!!communications.pickup_confirm_email}
                      onChange={() => handleCommunicationChange('pickup_confirm_email', !communications.pickup_confirm_email)}
                    />
                    <span className="text-gray-600">Email</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <RadioCircle
                      checked={!!communications.pickup_confirm_sms}
                      onChange={() => handleCommunicationChange('pickup_confirm_sms', !communications.pickup_confirm_sms)}
                    />
                    <span className="text-gray-600">Text Message</span>
                  </label>
                </div>
              </div>

              {}
              <div className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-base text-[#2F393D] mb-4">Laundry picked up</h3>
                <div className="h-px bg-gray-100 mb-4" />
                <div className="flex items-center justify-between sm:justify-start sm:gap-40">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <RadioCircle
                      checked={!!communications.picked_up_email}
                      onChange={() => handleCommunicationChange('picked_up_email', !communications.picked_up_email)}
                    />
                    <span className="text-gray-600">Email</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <RadioCircle
                      checked={!!communications.picked_up_sms}
                      onChange={() => handleCommunicationChange('picked_up_sms', !communications.picked_up_sms)}
                    />
                    <span className="text-gray-600">Text Message</span>
                  </label>
                </div>
              </div>

              {}
              <div className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-base text-[#2F393D] mb-4">Laundry delivered</h3>
                <div className="h-px bg-gray-100 mb-4" />
                <div className="flex items-center justify-between sm:justify-start sm:gap-40">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <RadioCircle
                      checked={!!communications.delivered_email}
                      onChange={() => handleCommunicationChange('delivered_email', !communications.delivered_email)}
                    />
                    <span className="text-gray-600">Email</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <RadioCircle
                      checked={!!communications.delivered_sms}
                      onChange={() => handleCommunicationChange('delivered_sms', !communications.delivered_sms)}
                    />
                    <span className="text-gray-600">Text Message</span>
                  </label>
                </div>
              </div>

              {}
              <div className="border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold text-base text-[#2F393D] mb-4">Card charged notification</h3>
                <div className="h-px bg-gray-100 mb-4" />
                <div className="flex items-center justify-between sm:justify-start sm:gap-40">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <RadioCircle
                      checked={!!communications.payment_sms}
                      onChange={() => handleCommunicationChange('payment_sms', !communications.payment_sms)}
                    />
                    <span className="text-gray-600">Email</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-3">Receive a Email notification each time your card is charged for a pickup.</p>
              </div>
            </div>
          </section>

          {}
          <button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="w-full bg-[#00A7EE] py-4 rounded-l-full rounded-r-full text-lg font-semibold text-white hover:bg-[#0099d3] transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default LaundryPreferences;
