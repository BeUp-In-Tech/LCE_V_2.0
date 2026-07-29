<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProcessingSiteController extends Controller
{
        public function index()
    {
        $sites = DB::table('lce_processing_sites')
            ->orderBy('name')
            ->get();

        return response()->json([
            'processing_sites' => $sites->map(fn($site) => [
                'id' => $site->id,
                'name' => $site->name,
                'address' => $site->address_1,
                'address_2' => $site->address_2,
                'city' => $site->city,
                'zip' => $site->zip,
                'area' => $site->area,
                'phone' => $site->phone_1,
                'email' => $site->email,
                'wf' => (bool) $site->wf,
                'dc' => (bool) $site->dc,
            ]),
        ]);
    }
}
