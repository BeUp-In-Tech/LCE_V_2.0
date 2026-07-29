<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SubscriptionCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $customerName;
    public string $planName;
    public int $bagsPerMonth;
    public float $pricePerBag;
    public string $billingCycle;
    public string $startDate;
    public string $endDate;
    public float $amountCharged;
    public float $discount;

    public function __construct(
        string $customerName,
        string $planName,
        int $bagsPerMonth,
        float $pricePerBag,
        string $billingCycle,
        string $startDate,
        string $endDate,
        float $amountCharged,
        float $discount = 0
    ) {
        $this->customerName = $customerName;
        $this->planName = $planName;
        $this->bagsPerMonth = $bagsPerMonth;
        $this->pricePerBag = $pricePerBag;
        $this->billingCycle = $billingCycle;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
        $this->amountCharged = $amountCharged;
        $this->discount = $discount;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Welcome to {$this->planName}!",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.subscription-created',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
