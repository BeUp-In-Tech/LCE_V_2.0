<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use net\authorize\api\contract\v1 as AnetAPI;
use net\authorize\api\controller as AnetController;

class TestAuthorizeNet extends Command
{
    protected $signature = 'authorizenet:test';
    protected $description = 'Test Authorize.net API connection and run a test transaction';

    public function handle()
    {
        $this->info('🔐 Testing Authorize.net Connection...');
        $this->newLine();

        
        $apiLoginId = config('services.authorizenet.api_login_id');
        $transactionKey = config('services.authorizenet.transaction_key');
        $sandbox = config('services.authorizenet.sandbox', true);

        $this->table(['Setting', 'Value'], [
            ['API Login ID', $apiLoginId ? substr($apiLoginId, 0, 4) . '***' : '❌ NOT SET'],
            ['Transaction Key', $transactionKey ? substr($transactionKey, 0, 4) . '***' : '❌ NOT SET'],
            ['Environment', $sandbox ? 'SANDBOX' : 'PRODUCTION'],
        ]);

        if (!$apiLoginId || $apiLoginId === 'YOUR_API_LOGIN_ID') {
            $this->error('❌ API Login ID is not configured in .env');
            $this->info('Please set AUTHORIZENET_API_LOGIN_ID in your .env file');
            return 1;
        }

        if (!$transactionKey) {
            $this->error('❌ Transaction Key is not configured in .env');
            return 1;
        }

        $this->newLine();
        $this->info('Testing API Authentication...');

        try {
            
            $merchantAuthentication = new AnetAPI\MerchantAuthenticationType();
            $merchantAuthentication->setName($apiLoginId);
            $merchantAuthentication->setTransactionKey($transactionKey);

            $environment = $sandbox
                ? \net\authorize\api\constants\ANetEnvironment::SANDBOX
                : \net\authorize\api\constants\ANetEnvironment::PRODUCTION;

            
            $request = new AnetAPI\GetMerchantDetailsRequest();
            $request->setMerchantAuthentication($merchantAuthentication);

            $controller = new AnetController\GetMerchantDetailsController($request);
            $response = $controller->executeWithApiResponse($environment);

            if ($response !== null && $response->getMessages()->getResultCode() === 'Ok') {
                $this->info('✅ API Authentication Successful!');
                $this->newLine();

                
                $this->info('Merchant Details:');
                $this->table(['Property', 'Value'], [
                    ['Merchant Name', $response->getMerchantName() ?? 'N/A'],
                    ['Gateway ID', $response->getGatewayId() ?? 'N/A'],
                ]);

                
                if ($this->confirm('Would you like to run a $0.01 test transaction?', false)) {
                    return $this->runTestTransaction($merchantAuthentication, $environment);
                }

                return 0;
            } else {
                $errorMessages = $response->getMessages()->getMessage();
                $this->error('❌ API Authentication Failed!');
                $this->error('Error: ' . ($errorMessages[0]->getText() ?? 'Unknown error'));
                $this->error('Code: ' . ($errorMessages[0]->getCode() ?? 'N/A'));
                return 1;
            }
        } catch (\Exception $e) {
            $this->error('❌ Exception: ' . $e->getMessage());
            return 1;
        }
    }

    private function runTestTransaction($merchantAuthentication, $environment)
    {
        $this->newLine();
        $this->info('Running $0.01 test transaction with test card...');

        try {
            
            $creditCard = new AnetAPI\CreditCardType();
            $creditCard->setCardNumber('4111111111111111');
            $creditCard->setExpirationDate('2028-12');
            $creditCard->setCardCode('123');

            $paymentType = new AnetAPI\PaymentType();
            $paymentType->setCreditCard($creditCard);

            
            $billTo = new AnetAPI\CustomerAddressType();
            $billTo->setFirstName('Test');
            $billTo->setLastName('User');
            $billTo->setAddress('123 Test St');
            $billTo->setCity('San Francisco');
            $billTo->setState('CA');
            $billTo->setZip('94101');
            $billTo->setCountry('USA');

            
            $transactionRequestType = new AnetAPI\TransactionRequestType();
            $transactionRequestType->setTransactionType('authCaptureTransaction');
            $transactionRequestType->setAmount(120.99);
            $transactionRequestType->setPayment($paymentType);
            $transactionRequestType->setBillTo($billTo);

            
            $order = new AnetAPI\OrderType();
            $order->setInvoiceNumber('TEST-' . time());
            $order->setDescription('LCE API Test Transaction');
            $transactionRequestType->setOrder($order);

            $request = new AnetAPI\CreateTransactionRequest();
            $request->setMerchantAuthentication($merchantAuthentication);
            $request->setTransactionRequest($transactionRequestType);

            $controller = new AnetController\CreateTransactionController($request);
            $response = $controller->executeWithApiResponse($environment);

            if ($response !== null) {
                $tresponse = $response->getTransactionResponse();

                if ($tresponse !== null && $tresponse->getMessages() !== null) {
                    $this->newLine();
                    $this->info('✅ TEST TRANSACTION SUCCESSFUL!');
                    $this->table(['Property', 'Value'], [
                        ['Transaction ID', $tresponse->getTransId()],
                        ['Auth Code', $tresponse->getAuthCode()],
                        ['Response Code', $tresponse->getResponseCode()],
                        ['Amount', '$' . $transactionRequestType->getAmount()],
                        ['Card', '**** **** **** 1111'],
                    ]);

                    $this->newLine();
                    $this->warn('⚠️  Note: This was a real ' . '$' . $transactionRequestType->getAmount() . ' charge in sandbox mode.');
                    $this->info('Your Authorize.net integration is working correctly!');
                    return 0;
                } elseif ($tresponse !== null && $tresponse->getErrors() !== null) {
                    $this->error('❌ Transaction Failed!');
                    $errors = $tresponse->getErrors();
                    $this->error('Error: ' . $errors[0]->getErrorText());
                    $this->error('Code: ' . $errors[0]->getErrorCode());
                    return 1;
                }
            }

            $errorMessages = $response->getMessages()->getMessage();
            $this->error('❌ Transaction Failed!');
            $this->error('Error: ' . ($errorMessages[0]->getText() ?? 'Unknown error'));
            return 1;
        } catch (\Exception $e) {
            $this->error('❌ Exception: ' . $e->getMessage());
            return 1;
        }
    }
}
