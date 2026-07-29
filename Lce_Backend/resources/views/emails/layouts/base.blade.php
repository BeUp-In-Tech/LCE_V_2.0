<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Laundry Care Express')</title>
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
            font-size: 14px;
        }

        .body-content {
            padding: 30px;
        }

        .body-content h2 {
            color: 
            margin-top: 0;
            margin-bottom: 15px;
            font-size: 20px;
        }

        .body-content p {
            color: 
            line-height: 1.6;
            margin-bottom: 12px;
        }

        .info-card {
            background: 
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid 
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .info-label {
            color: 
            font-size: 13px;
        }

        .info-value {
            font-weight: 600;
            color: 
            font-size: 14px;
        }

        .highlight-box {
            background: linear-gradient(135deg, 
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 20px 0;
        }

        .highlight-box .big-number {
            font-size: 36px;
            font-weight: bold;
            margin: 5px 0;
        }

        .highlight-box .label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.85;
        }

        .cta-button {
            display: inline-block;
            background: 
            color: white;
            padding: 14px 36px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 15px 0;
            font-size: 14px;
        }

        .divider {
            height: 1px;
            background: 
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
            text-decoration: none;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge-success {
            background: 
            color: 
        }

        .badge-info {
            background: 
            color: 
        }

        .badge-warning {
            background: 
            color: 
        }

        table.line-items {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }

        table.line-items th {
            text-align: left;
            padding: 10px 8px;
            border-bottom: 2px solid 
            color: 
            font-size: 12px;
            text-transform: uppercase;
        }

        table.line-items td {
            padding: 10px 8px;
            border-bottom: 1px solid 
            font-size: 14px;
        }

        table.line-items tr.total-row td {
            border-top: 2px solid 
            font-weight: bold;
            font-size: 16px;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>@yield('header_title', '🧺 Laundry Care Express')</h1>
            <p>@yield('header_subtitle', '')</p>
        </div>

        <div class="body-content">
            @yield('content')
        </div>

        <div class="footer">
            <p>
                This is an automated email from Laundry Care Express.<br>
                Questions? Contact us at
                <a href="mailto:support@laundrycareexpress.com">support@laundrycareexpress.com</a>
            </p>
            <p>© {{ date('Y') }} Laundry Care Express. All rights reserved.</p>
        </div>
    </div>
</body>

</html>
