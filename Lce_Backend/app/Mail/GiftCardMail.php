<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Helpers\DateHelper;

class GiftCardMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $code;
    public float $amount;
    public string $recipientName;
    public string $senderName;
    public ?string $giftMessage;
    public string $expiresAt;

        public function __construct(
        string $code,
        float $amount,
        string $recipientName,
        string $senderName,
        ?string $giftMessage = null,
        ?string $expiresAt = null
    ) {
        $this->code = $code;
        $this->amount = $amount;
        $this->recipientName = $recipientName;
        $this->senderName = $senderName;
        $this->giftMessage = $giftMessage;
        $this->expiresAt = $expiresAt ?? DateHelper::now()->addYear()->format('F j, Y');
    }

        public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You've received a Laundry Care Express Gift Card!",
        );
    }

        public function content(): Content
    {
        return new Content(
            view: 'emails.gift-card',
        );
    }

        public function attachments(): array
    {
        return [];
    }
}
