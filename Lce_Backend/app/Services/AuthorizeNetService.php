<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use net\authorize\api\contract\v1 as AnetAPI;
use net\authorize\api\controller as AnetController;

class AuthorizeNetService
{
    protected $merchantAuthentication;
    protected $environment;

    public function __construct()
    {
        $this->merchantAuthentication = new AnetAPI\MerchantAuthenticationType();
        $this->merchantAuthentication->setName(config('services.authorizenet.api_login_id'));
        $this->merchantAuthentication->setTransactionKey(config('services.authorizenet.transaction_key'));

        $this->environment = config('services.authorizenet.sandbox', true)
            ? \net\authorize\api\constants\ANetEnvironment::SANDBOX
            : \net\authorize\api\constants\ANetEnvironment::PRODUCTION;
    }

        public function createPaymentProfile(
        User $user,
        string $dataDescriptor,
        string $dataValue,
        array $billingAddress = []
    ): array {
        try {
            $profileId = $user->customerProfileId;

            
            if (!$profileId) {
                $profileResult = $this->createCustomerProfile($user);

                if (!$profileResult['success']) {
                    return $profileResult;
                }

                $profileId = $profileResult['customer_profile_id'];
                
                
                $user->customerProfileId = $profileId;
                $user->save();
            }

            
            return $this->addPaymentProfileToExisting(
                $profileId,
                $dataDescriptor,
                $dataValue,
                $billingAddress,
                $user
            );
        } catch (\Exception $e) {
            Log::error('Authorize.net error', ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'message' => 'Payment processing error: ' . $e->getMessage(),
            ];
        }
    }

        private function createCustomerProfile(User $user): array {
        $customerProfile = new AnetAPI\CustomerProfileType();
        $customerProfile->setDescription("Customer {$user->user_id}");
        $customerProfile->setMerchantCustomerId((string)$user->user_id);
        $customerProfile->setEmail($user->email);

        
        $request = new AnetAPI\CreateCustomerProfileRequest();
        $request->setMerchantAuthentication($this->merchantAuthentication);
        $request->setProfile($customerProfile);

        
        $controller = new AnetController\CreateCustomerProfileController($request);
                $response = $controller->executeWithApiResponse($this->environment);

        if ($response !== null && $response->getMessages()->getResultCode() === 'Ok') {
            return [
                'success' => true,
                'customer_profile_id' => $response->getCustomerProfileId(),
            ];
        }

        $errorMessages = $response->getMessages()->getMessage();
        $errorText = $errorMessages[0]->getText() ?? 'Unknown error';

        
        
        if (preg_match('/duplicate record with ID (\d+)/', $errorText, $matches)) {
            $existingProfileId = $matches[1];
            Log::info('Duplicate Authorize.net profile found. Using existing ID.', ['id' => $existingProfileId]);

            return [
                'success' => true,
                'customer_profile_id' => $existingProfileId,
            ];
        }

        return [
            'success' => false,
            'message' => $errorText,
        ];
    }

        private function addPaymentProfileToExisting(
        int $customerProfileId,
        string $dataDescriptor,
        string $dataValue,
        array $billingAddress,
        User $user
    ): array {
        
        $opaqueData = new AnetAPI\OpaqueDataType();
        $opaqueData->setDataDescriptor($dataDescriptor);
        $opaqueData->setDataValue($dataValue);

        $paymentType = new AnetAPI\PaymentType();
        $paymentType->setOpaqueData($opaqueData);

        
        $billTo = new AnetAPI\CustomerAddressType();
        $billTo->setFirstName($user->first_name);
        $billTo->setLastName($user->last_name);
        $billTo->setAddress($billingAddress['street'] ?? $user->address_1);
        $billTo->setCity($billingAddress['city'] ?? $user->city);
        $billTo->setState($billingAddress['state'] ?? $user->state);
        $billTo->setZip($billingAddress['zip'] ?? $user->zip);


        
        $paymentProfile = new AnetAPI\CustomerPaymentProfileType();
        $paymentProfile->setCustomerType('individual');
        $paymentProfile->setBillTo($billTo);
        $paymentProfile->setPayment($paymentType);

        
        $request = new AnetAPI\CreateCustomerPaymentProfileRequest();
        $request->setMerchantAuthentication($this->merchantAuthentication);
        $request->setCustomerProfileId($customerProfileId);
        $request->setPaymentProfile($paymentProfile);

        
        
        $controller = new AnetController\CreateCustomerPaymentProfileController($request);
                $response = $controller->executeWithApiResponse($this->environment);

        if ($response !== null && $response->getMessages()->getResultCode() === 'Ok') {
            return [
                'success' => true,
                'customer_profile_id' => $customerProfileId,
                'payment_profile_id' => $response->getCustomerPaymentProfileId(),
            ];
        }

        $errorMessages = $response->getMessages()->getMessage();
        return [
            'success' => false,
            'message' => $errorMessages[0]->getText() ?? 'Unknown error',
        ];
    }

        public function deletePaymentProfile(int $customerProfileId, int $paymentProfileId): bool
    {
        $request = new AnetAPI\DeleteCustomerPaymentProfileRequest();
        $request->setMerchantAuthentication($this->merchantAuthentication);
        $request->setCustomerProfileId($customerProfileId);
        $request->setCustomerPaymentProfileId($paymentProfileId);

        $controller = new AnetController\DeleteCustomerPaymentProfileController($request);
        $response = $controller->executeWithApiResponse($this->environment);

        return $response !== null && $response->getMessages()->getResultCode() === 'Ok';
    }

        public function chargeCustomer(
        int $customerProfileId,
        int $paymentProfileId,
        float $amount,
        string $description = '',
        ?string $customerEmail = null,
        ?string $clientIp = null
    ): array {
        $profileToCharge = new AnetAPI\CustomerProfilePaymentType();
        $profileToCharge->setCustomerProfileId($customerProfileId);

        $paymentProfile = new AnetAPI\PaymentProfileType();
        $paymentProfile->setPaymentProfileId($paymentProfileId);
        $profileToCharge->setPaymentProfile($paymentProfile);

        // Order information
        $order = new AnetAPI\OrderType();
        $order->setInvoiceNumber('LCE-' . uniqid());
        $order->setDescription(substr($description, 0, 255));

        $transactionRequestType = new AnetAPI\TransactionRequestType();
        $transactionRequestType->setTransactionType('authCaptureTransaction');
        $transactionRequestType->setAmount($amount);
        $transactionRequestType->setProfile($profileToCharge);
        $transactionRequestType->setOrder($order);

        if ($clientIp) {
            $transactionRequestType->setCustomerIP($clientIp);
        }

        
        $emailReceiptSetting = new AnetAPI\SettingType();
        $emailReceiptSetting->setSettingName('emailCustomer');
        $emailReceiptSetting->setSettingValue($customerEmail ? 'true' : 'false');

        
        $headerEmailReceipt = new AnetAPI\SettingType();
        $headerEmailReceipt->setSettingName('headerEmailReceipt');
        $headerEmailReceipt->setSettingValue('Thank you for your order with Laundry Care Express!');

        
        $footerEmailReceipt = new AnetAPI\SettingType();
        $footerEmailReceipt->setSettingName('footerEmailReceipt');
        $footerEmailReceipt->setSettingValue('Questions? Contact us at support@laundrycareexpress.com');

        $transactionRequestType->setTransactionSettings([
            $emailReceiptSetting,
            $headerEmailReceipt,
            $footerEmailReceipt,
        ]);

        
        if ($customerEmail) {
            $customer = new AnetAPI\CustomerDataType();
            $customer->setEmail($customerEmail);
            $transactionRequestType->setCustomer($customer);
        }

        $request = new AnetAPI\CreateTransactionRequest();
        $request->setMerchantAuthentication($this->merchantAuthentication);
        $request->setTransactionRequest($transactionRequestType);

        $controller = new AnetController\CreateTransactionController($request);
                $response = $controller->executeWithApiResponse($this->environment);

        if ($response !== null) {
            $tresponse = $response->getTransactionResponse();

            
            \Log::info('Authorize.Net charge response', [
                'resultCode' => $response->getMessages()->getResultCode(),
                'transId' => $tresponse ? $tresponse->getTransId() : null,
                'responseCode' => $tresponse ? $tresponse->getResponseCode() : null,
            ]);

            if ($tresponse !== null && $tresponse->getMessages() !== null) {
                return [
                    'success' => true,
                    'transaction_id' => $tresponse->getTransId(),
                    'auth_code' => $tresponse->getAuthCode(),
                ];
            }

            if ($tresponse !== null && $tresponse->getErrors() !== null) {
                $errors = $tresponse->getErrors();
                \Log::error('Authorize.Net transaction error', [
                    'errorCode' => $errors[0]->getErrorCode(),
                    'errorText' => $errors[0]->getErrorText(),
                ]);
                return [
                    'success' => false,
                    'message' => $errors[0]->getErrorText(),
                ];
            }

            
            $messages = $response->getMessages()->getMessage();
            $errorMsg = $messages ? $messages[0]->getText() : 'Unknown error';
            \Log::error('Authorize.Net response without transaction', [
                'messageCode' => $messages ? $messages[0]->getCode() : null,
                'messageText' => $errorMsg,
            ]);
            return [
                'success' => false,
                'message' => $errorMsg,
            ];
        }

        \Log::error('Authorize.Net returned null response - possible network/config issue');

        return [
            'success' => false,
            'message' => 'Transaction failed',
        ];
    }


}
