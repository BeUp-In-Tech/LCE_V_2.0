<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderCompletedMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $customerName;
    public int $pickupId;
    public float $weightLbs;
    public float $ratePerLb;
    public float $wfAmount;
    public float $pndFee;
    public float $serviceFee;
    public float $totalCharged;
    public float $creditsUsed;
    public ?string $invoiceNumber;
    public ?string $transactionId;

    public function __construct(
        string $customerName,
        int $pickupId,
        float $weightLbs,
        float $ratePerLb,
        float $wfAmount,
        float $pndFee,
        float $serviceFee,
        float $totalCharged,
        float $creditsUsed = 0,
        ?string $invoiceNumber = null,
        ?string $transactionId = null
    ) {
        $this->customerName = $customerName;
        $this->pickupId = $pickupId;
        $this->weightLbs = $weightLbs;
        $this->ratePerLb = $ratePerLb;
        $this->wfAmount = $wfAmount;
        $this->pndFee = $pndFee;
        $this->serviceFee = $serviceFee;
        $this->totalCharged = $totalCharged;
        $this->creditsUsed = $creditsUsed;
        $this->invoiceNumber = $invoiceNumber;
        $this->transactionId = $transactionId;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Order Completed - \${$this->totalCharged}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.order-completed',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
