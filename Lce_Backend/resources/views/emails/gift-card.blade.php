<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Laundry Care Express Gift Card</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: 
            margin: 0;
            padding: 20px;
            color: 
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .header {
            background: linear-gradient(135deg, 
            padding: 30px;
            text-align: center;
            color: white;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }

        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }

        .gift-card {
            background: linear-gradient(135deg, 
            margin: 30px;
            padding: 30px;
            border-radius: 16px;
            color: white;
            text-align: center;
            box-shadow: 0 8px 30px rgba(83, 54, 197, 0.3);
        }

        .gift-card .label {
            font-size: 14px;
            opacity: 0.8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .gift-card .code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 3px;
            margin: 15px 0;
            font-family: monospace;
            background: rgba(255, 255, 255, 0.15);
            padding: 15px 20px;
            border-radius: 8px;
        }

        .gift-card .amount {
            font-size: 48px;
            font-weight: bold;
            margin: 20px 0;
        }

        .gift-card .recipient {
            font-size: 18px;
            margin-top: 10px;
        }

        .content {
            padding: 30px;
            text-align: center;
        }

        .content h2 {
            color: 
            margin-bottom: 15px;
        }

        .content p {
            color: 
            line-height: 1.6;
        }

        .message-box {
            background: 
            border-left: 4px solid 
            padding: 15px 20px;
            margin: 20px 30px;
            font-style: italic;
            color: 
        }

        .cta-button {
            display: inline-block;
            background: 
            color: white;
            padding: 15px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
        }

        .footer {
            background: 
            padding: 20px 30px;
            text-align: center;
            font-size: 12px;
            color: 
        }

        .footer a {
            color: 
        }

        .instructions {
            background: 
            padding: 20px 30px;
            margin: 0;
        }

        .instructions h3 {
            color: 
            margin-top: 0;
        }

        .instructions ol {
            text-align: left;
            color: 
        }

        .instructions li {
            margin-bottom: 10px;
        }

        .expiry {
            color: 
            font-size: 13px;
            margin-top: 10px;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>🎁 You've Received a Gift!</h1>
            <p>from {{ $senderName }}</p>
        </div>

        <div class="gift-card">
            <div class="label">Laundry Care Express Gift Card</div>
            <div class="recipient">For: {{ $recipientName }}</div>
            <div class="amount">${{ number_format($amount, 2) }}</div>
            <div class="label">Your Gift Card Code</div>
            <div class="code">{{ $code }}</div>
        </div>

        @if($giftMessage)
            <div class="message-box">
                "{{ $giftMessage }}"
            </div>
        @endif

        <div class="content">
            <h2>Ready to use your gift?</h2>
            <p>
                Your gift card can be used for any Laundry Care Express service including
                Wash & Fold, Dry Cleaning, and more!
            </p>
            <a href="https://laundrycareexpress.com/gift-cards" class="cta-button">
                Redeem Your Gift Card
            </a>
            <p class="expiry">Valid until: {{ $expiresAt }}</p>
        </div>

        <div class="instructions">
            <h3>How to Redeem:</h3>
            <ol>
                <li>Visit <a href="https://laundrycareexpress.com/gift-cards">laundrycareexpress.com/gift-cards</a></li>
                <li>Enter your gift card code: <strong>{{ $code }}</strong></li>
                <li>Click "Redeem" to add the credit to your account</li>
                <li>The balance will be automatically applied to your next service!</li>
            </ol>
        </div>

        <div class="footer">
            <p>
                This is an automated email from Laundry Care Express.<br>
                If you have any questions, please contact us at
                <a href="mailto:support@laundrycareexpress.com">support@laundrycareexpress.com</a>
            </p>
            <p>© {{ date('Y') }} Laundry Care Express. All rights reserved.</p>
        </div>
    </div>
</body>

</html>