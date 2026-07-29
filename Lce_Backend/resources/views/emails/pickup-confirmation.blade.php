@extends('emails.layouts.base')

@section('title', 'Pickup Confirmed')
@section('header_title', '📦 Pickup Confirmed!')
@section('header_subtitle', 'Your laundry pickup has been scheduled')

@section('content')
    <h2>Hi {{ $customerName }},</h2>
    <p>Great news! Your pickup has been scheduled. Here are the details:</p>

    <div class="info-card">
        <div class="info-row">
            <span class="info-label">Pickup Date</span>
            <span class="info-value">{{ \Carbon\Carbon::parse($pickupDate)->format('l, F j, Y') }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Service Type</span>
            <span class="info-value">{{ $serviceType }}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Pickup ID</span>
            <span class="info-value">
        </div>
        @if($paymentAmount > 0)
        <div class="info-row">
            <span class="info-label">Payment</span>
            <span class="info-value">${{ number_format($paymentAmount, 2) }}</span>
        </div>
        @endif
    </div>

    @if($driverInstructions)
    <div class="info-card" style="border-left: 4px solid #00AEEF;">
        <p style="margin:0; color: #555;"><strong>Driver Instructions:</strong> {{ $driverInstructions }}</p>
    </div>
    @endif

    <p style="color: #888; font-size: 13px;">
        Please have your laundry ready by the pickup date. Our driver will arrive during business hours.
    </p>

    <div style="text-align: center;">
        <a href="{{ config('app.frontend_url', 'https://laundrycareexpress.com') }}/dashboard" class="cta-button">
            View Dashboard
        </a>
    </div>
@endsection
