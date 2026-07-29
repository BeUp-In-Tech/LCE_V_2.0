<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Requests\VacationHold\StoreVacationHoldRequest;
use App\Helpers\DateHelper;

class VacationHoldController extends Controller
{
        public function index()
    {
        $user = $this->user();

        $holds = DB::table('lce_users_vacation_logs')
            ->where('user_id', $user->user_id)
            ->orderBy('start_date', 'desc')
            ->get();

        return response()->json([
            'vacation_holds' => $holds->map(fn($h) => [
                'id' => $h->id,
                'start_date' => $h->start_date,
                'end_date' => $h->end_date,
                'is_active' => $h->status == 1 && $h->start_date <= DateHelper::today() && $h->end_date >= DateHelper::today(),
                'status' => $h->status == 1 ? 'active' : 'cancelled',
            ]),
        ]);
    }

        public function store(StoreVacationHoldRequest $request)
    {
        

        $user = $this->user();

        
        $overlap = DB::table('lce_users_vacation_logs')
            ->where('user_id', $user->user_id)
            ->where('status', 1)
            ->where(function ($query) use ($request) {
                $query->whereBetween('start_date', [$request->start_date, $request->end_date])
                    ->orWhereBetween('end_date', [$request->start_date, $request->end_date])
                    ->orWhere(function ($q) use ($request) {
                        $q->where('start_date', '<=', $request->start_date)
                            ->where('end_date', '>=', $request->end_date);
                    });
            })
            ->exists();

        if ($overlap) {
            return response()->json([
                'error' => 'You already have a vacation hold during this period',
            ], 400);
        }

        
        $holdId = DB::table('lce_users_vacation_logs')->insertGetId([
            'user_id' => $user->user_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'status' => 1,
        ]);

        
        if ($request->start_date <= DateHelper::today()) {
            $user->hold_date = $request->end_date;
            $user->save();
        }

        Log::info('Vacation hold created', [
            'user_id' => $user->user_id,
            'hold_id' => $holdId,
            'start' => $request->start_date,
            'end' => $request->end_date,
        ]);

        return response()->json([
            'message' => 'Vacation hold created successfully',
            'vacation_hold' => [
                'id' => $holdId,
                'start_date' => $request->start_date,
                'end_date' => $request->end_date,
            ],
        ], 201);
    }

        public function destroy($id)
    {
        $user = $this->user();

        $hold = DB::table('lce_users_vacation_logs')
            ->where('id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$hold) {
            return response()->json(['error' => 'Vacation hold not found'], 404);
        }

        
        DB::table('lce_users_vacation_logs')
            ->where('id', $id)
            ->update(['status' => 0]);

        
        if ($hold->status == 1) {
            try {
                $user->hold_date = null;
                $user->save();
            } catch (\Exception $e) {
                Log::warning('Failed to clear user hold_date', ['user_id' => $user->user_id, 'error' => $e->getMessage()]);
            }
        }

        Log::info('Vacation hold cancelled', ['user_id' => $user->user_id, 'hold_id' => $id]);

        return response()->json(['message' => 'Vacation hold cancelled successfully']);
    }
}
