@extends('emails.layouts.base')

@section('title', 'Order Completed')
@section('header_title', '✅ Order Completed')
@section('header_subtitle', 'Your laundry is done!')

@section('content')
    <h2>Hi {{ $customerName }},</h2>
    <p>Your order has been completed and charged successfully. Here's your receipt:</p>

    <div class="highlight-box">
        <div class="label">Total Charged</div>
        <div class="big-number">${{ number_format($totalCharged, 2) }}</div>
        @if($creditsUsed > 0)
            <div class="label" style="margin-top: 5px;">Credits Applied: -${{ number_format($creditsUsed, 2) }}</div>
        @endif
    </div>

    <div class="info-card">
        <div class="info-row">
            <span class="info-label">Pickup ID</span>
            <span class="info-value">
        </div>
        <div class="info-row">
            <span class="info-label">Weight</span>
            <span class="info-value">{{ $weightLbs }} lbs</span>
        </div>
        <div class="info-row">
            <span class="info-label">Rate</span>
            <span class="info-value">${{ number_format($ratePerLb, 2) }}/lb</span>
        </div>
        @if($invoiceNumber)
        <div class="info-row">
            <span class="info-label">Invoice</span>
            <span class="info-value">
        </div>
        @endif
        @if($transactionId)
        <div class="info-row">
            <span class="info-label">Transaction</span>
            <span class="info-value">{{ $transactionId }}</span>
        </div>
        @endif
    </div>

    <table class="line-items">
        <thead>
            <tr>
                <th>Service</th>
                <th style="text-align:right">Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Wash & Fold ({{ $weightLbs }} lbs)</td>
                <td style="text-align:right">${{ number_format($wfAmount, 2) }}</td>
            </tr>
            <tr>
                <td>Pickup & Delivery Fee</td>
                <td style="text-align:right">${{ number_format($pndFee, 2) }}</td>
            </tr>
            <tr>
                <td>Service Fee</td>
                <td style="text-align:right">${{ number_format($serviceFee, 2) }}</td>
            </tr>
            @if($creditsUsed > 0)
            <tr>
                <td>Credits Applied</td>
                <td style="text-align:right; color: #28a745;">-${{ number_format($creditsUsed, 2) }}</td>
            </tr>
            @endif
            <tr class="total-row">
                <td>Total</td>
                <td style="text-align:right">${{ number_format($totalCharged, 2) }}</td>
            </tr>
        </tbody>
    </table>

    <div style="text-align: center;">
        <a href="{{ config('app.frontend_url', 'https://laundrycareexpress.com') }}/dashboard" class="cta-button">
            View Invoice
        </a>
    </div>
@endsection
