<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PickupConfirmationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $customerName;
    public string $pickupDate;
    public string $serviceType;
    public int $pickupId;
    public float $paymentAmount;
    public ?string $driverInstructions;

    public function __construct(
        string $customerName,
        string $pickupDate,
        string $serviceType,
        int $pickupId,
        float $paymentAmount = 0,
        ?string $driverInstructions = null
    ) {
        $this->customerName = $customerName;
        $this->pickupDate = $pickupDate;
        $this->serviceType = $serviceType;
        $this->pickupId = $pickupId;
        $this->paymentAmount = $paymentAmount;
        $this->driverInstructions = $driverInstructions;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Pickup Confirmed - #{$this->pickupId}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.pickup-confirmation',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
