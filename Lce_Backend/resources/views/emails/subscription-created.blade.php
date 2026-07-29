@extends('emails.layouts.base')

@section('title', 'Subscription Confirmed')
@section('header_title', '🎉 Welcome to Subscribe & Save!')
@section('header_subtitle', 'Your subscription is now active')

@section('content')
    <h2>Hi {{ $customerName }},</h2>
    <p>You've successfully subscribed to our <strong>{{ $planName }}</strong> plan. Here are your details:</p>

    <div class="highlight-box" style="background: linear-gradient(135deg, #5336c5 0%, #6b4ada 100%);">
        <div class="label">Your Plan</div>
        <div class="big-number">{{ $bagsPerMonth }} Bags/mo</div>
        <div class="label">${{ number_format($pricePerBag, 2) }} per bag</div>
    </div>

    <div class="info-card">
        <div class="info-row">
            <span class="info-label">Plan</span>
            <span class="info-value">{{ $planName }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Billing Cycle</span>
            <span class="info-value"><span class="badge badge-info">{{ ucfirst($billingCycle) }}</span></span>
        </div>
        <div class="info-row">
            <span class="info-label">Start Date</span>
            <span class="info-value">{{ \Carbon\Carbon::parse($startDate)->format('F j, Y') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Next Renewal</span>
            <span class="info-value">{{ \Carbon\Carbon::parse($endDate)->format('F j, Y') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Amount Charged</span>
            <span class="info-value">${{ number_format($amountCharged, 2) }}</span>
        </div>
        @if($discount > 0)
        <div class="info-row">
            <span class="info-label">Annual Discount</span>
            <span class="info-value" style="color: #28a745;">{{ $discount }}% off</span>
        </div>
        @endif
    </div>

    <div class="info-card" style="background: #e8f5e9; border-left: 4px solid #28a745;">
        <p style="margin:0; color: #2e7d32; font-size: 14px;">
            <strong>What's included:</strong> {{ $bagsPerMonth }} bags per month (~21 lbs each). Unused bags carry over to the next month!
        </p>
    </div>

    <div style="text-align: center;">
        <a href="{{ config('app.frontend_url', 'https://laundrycareexpress.com') }}/dashboard" class="cta-button">
            Schedule Your First Pickup
        </a>
    </div>
@endsection
