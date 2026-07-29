@extends('emails.layouts.base')

@section('title', 'Payment Receipt')
@section('header_title', '💳 Payment Receipt')
@section('header_subtitle', 'Thank you for your payment')

@section('content')
    <h2>Hi {{ $customerName }},</h2>
    <p>We've received your payment. Here's your receipt:</p>

    <div class="highlight-box">
        <div class="label">Amount Paid</div>
        <div class="big-number">${{ number_format($amount, 2) }}</div>
        <div class="label"><span class="badge badge-success">Paid</span></div>
    </div>

    <div class="info-card">
        <div class="info-row">
            <span class="info-label">Description</span>
            <span class="info-value">{{ $description }}</span>
        </div>
        @if($transactionId)
        <div class="info-row">
            <span class="info-label">Transaction ID</span>
            <span class="info-value">{{ $transactionId }}</span>
        </div>
        @endif
        @if($invoiceNumber)
        <div class="info-row">
            <span class="info-label">Invoice</span>
            <span class="info-value">
        </div>
        @endif
        <div class="info-row">
            <span class="info-label">Date</span>
            <span class="info-value">{{ $paymentDate }}</span>
        </div>
        @if($cardLastFour)
        <div class="info-row">
            <span class="info-label">Payment Method</span>
            <span class="info-value">•••• {{ $cardLastFour }}</span>
        </div>
        @endif
    </div>

    <div style="text-align: center;">
        <a href="{{ config('app.frontend_url', 'https://laundrycareexpress.com') }}/dashboard" class="cta-button">
            View Account
        </a>
    </div>
@endsection
