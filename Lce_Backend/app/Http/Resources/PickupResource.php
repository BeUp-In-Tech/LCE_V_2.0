<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PickupResource extends JsonResource
{
        public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pickup_date' => $this->pickup_date,
            'pickup_type' => $this->pickup_type,
            'status' => $this->status,
            'pickup_time' => $this->pickup_time,
            'delivery_time' => $this->delivery_time,
            'wf_items' => $this->wf_items,
            'wf_bags_items' => $this->wf_bags_items,
            'wf_hanger_items' => $this->wf_hanger_items,
            'wf_weight' => $this->wf_weight,
            'dc_items' => $this->dc_items,
            'dc_bags_items' => $this->dc_bags_items,
            'dc_hanger_items' => $this->dc_hanger_items,
            'invoice_id' => $this->invoice_id,
            'hold_time' => $this->hold_time,
            'unhold_time' => $this->unhold_time,
            'cancelled_time' => $this->cancelled_time,
            'on_vacation' => (bool) $this->on_vacation,
            'skipped_pickup' => (bool) $this->skipped_pickup,
            'driver_instructions' => $this->driver_instructions ?? null,
            'created_at' => $this->cdate,
        ];
    }
}
