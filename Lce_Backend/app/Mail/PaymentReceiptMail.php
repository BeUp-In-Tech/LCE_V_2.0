<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Helpers\DateHelper;

class PaymentReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $customerName;
    public float $amount;
    public string $description;
    public ?string $transactionId;
    public ?string $invoiceNumber;
    public string $paymentDate;
    public ?string $cardLastFour;

    public function __construct(
        string $customerName,
        float $amount,
        string $description,
        ?string $transactionId = null,
        ?string $invoiceNumber = null,
        ?string $paymentDate = null,
        ?string $cardLastFour = null
    ) {
        $this->customerName = $customerName;
        $this->amount = $amount;
        $this->description = $description;
        $this->transactionId = $transactionId;
        $this->invoiceNumber = $invoiceNumber;
        $this->paymentDate = $paymentDate ?? DateHelper::now()->format('F j, Y g:i A');
        $this->cardLastFour = $cardLastFour;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Payment Receipt - \${$this->amount}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payment-receipt',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
