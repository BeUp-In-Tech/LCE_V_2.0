<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Http\Requests\Group\StoreGroupRequest;
use App\Http\Requests\Group\JoinGroupRequest;
use App\Helpers\DateHelper;

class GroupController extends Controller
{
        public function store(StoreGroupRequest $request)
    {
        

        $user = $this->user();

        
        $existingAdmin = DB::table('lce_user_group_admin')
            ->where('user_id', $user->user_id)
            ->where('published', 1)
            ->first();

        if ($existingAdmin) {
            return response()->json([
                'error' => 'You are already an admin of a group',
            ], 400);
        }

        
        $groupCode = strtoupper(Str::random(8));

        
        $groupId = DB::table('lce_user_group_admin')->insertGetId([
            'user_id' => $user->user_id,
            'group_name' => $request->group_name,
            'group_code' => $groupCode,
            'group_type' => $request->group_type,
            'is_admin' => 1,
            'date_added' => DateHelper::today(),
            'published' => 1,
        ]);

        
        DB::table('lce_user_group_members')->insert([
            'group_id' => $groupId,
            'admin_user_id' => $user->user_id,
            'user_id' => $user->user_id,
            'group_code' => $groupCode,
            'monthly_transaction_limit' => 0,
            'monthly_wf_limit' => 0,
            'monthly_dc_limit' => 0,
            'monthly_wf_dc_limit' => 0,
            'department' => 'Admin',
            'approved' => 1,
            'date_added' => now()->format('Y-m-d'),
            'published' => 1,
            'current_status' => 1,
        ]);

        Log::info('Group created', ['user_id' => $user->user_id, 'group_id' => $groupId]);

        return response()->json([
            'message' => 'Group created successfully',
            'group' => [
                'id' => $groupId,
                'name' => $request->group_name,
                'code' => $groupCode,
                'type' => $request->group_type,
            ],
        ], 201);
    }

        public function me()
    {
        $user = $this->user();

        
        $membership = DB::table('lce_user_group_members')
            ->where('user_id', $user->user_id)
            ->where('published', 1)
            ->first();

        if (!$membership) {
            return response()->json(['group' => null]);
        }

        
        $group = DB::table('lce_user_group_admin')
            ->where('group_id', $membership->group_id)
            ->first();

        
        $admin = DB::table('lce_user_info')
            ->where('id', $group->user_id)
            ->select('id', 'first_name', 'last_name', 'email')
            ->first();

        return response()->json([
            'group' => [
                'id' => $group->group_id,
                'name' => $group->group_name,
                'code' => $group->group_code,
                'type' => $group->group_type,
                'admin' => [
                    'id' => $admin->id,
                    'name' => trim("{$admin->first_name} {$admin->last_name}"),
                    'email' => $admin->email,
                ],
                'is_admin' => $group->user_id === $user->user_id,
            ],
            'membership' => [
                'approved' => (bool) $membership->approved,
                'department' => $membership->department,
                'limits' => [
                    'monthly_transaction' => (float) $membership->monthly_transaction_limit,
                    'monthly_wf' => $membership->monthly_wf_limit,
                    'monthly_dc' => $membership->monthly_dc_limit,
                ],
            ],
        ]);
    }

        public function join(JoinGroupRequest $request)
    {
        

        $user = $this->user();
        $code = strtoupper(trim($request->group_code));

        
        $group = DB::table('lce_user_group_admin')
            ->where('group_code', $code)
            ->where('published', 1)
            ->first();

        if (!$group) {
            return response()->json(['error' => 'Invalid group code'], 404);
        }

        
        $exists = DB::table('lce_user_group_members')
            ->where('group_id', $group->group_id)
            ->where('user_id', $user->user_id)
            ->exists();

        if ($exists) {
            return response()->json(['error' => 'You are already a member of this group'], 400);
        }

        
        DB::table('lce_user_group_members')->insert([
            'group_id' => $group->group_id,
            'admin_user_id' => $group->user_id,
            'user_id' => $user->user_id,
            'group_code' => $code,
            'monthly_transaction_limit' => 0,
            'monthly_wf_limit' => 0,
            'monthly_dc_limit' => 0,
            'monthly_wf_dc_limit' => 0,
            'department' => '',
            'approved' => 0, 
            'date_added' => DateHelper::today(),
            'published' => 1,
            'current_status' => 0,
        ]);

        Log::info('Group join request', ['user_id' => $user->user_id, 'group_id' => $group->group_id]);

        return response()->json([
            'message' => 'Join request submitted. Awaiting admin approval.',
            'group' => [
                'id' => $group->group_id,
                'name' => $group->group_name,
            ],
        ]);
    }

        public function members($id)
    {
        $user = $this->user();

        
        $membership = DB::table('lce_user_group_members')
            ->where('group_id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$membership) {
            return response()->json(['error' => 'You are not a member of this group'], 403);
        }

        $members = DB::table('lce_user_group_members')
            ->join('lce_user_info', 'lce_user_group_members.user_id', '=', 'lce_user_info.id')
            ->where('group_id', $id)
            ->where('lce_user_group_members.published', 1)
            ->select(
                'lce_user_group_members.*',
                'lce_user_info.first_name',
                'lce_user_info.last_name',
                'lce_user_info.email'
            )
            ->get();

        return response()->json([
            'members' => $members->map(fn($m) => [
                'id' => $m->intid,
                'user_id' => $m->user_id,
                'name' => trim("{$m->first_name} {$m->last_name}"),
                'email' => $m->email,
                'department' => $m->department,
                'approved' => (bool) $m->approved,
                'is_admin' => $m->user_id === $membership->admin_user_id,
                'joined_at' => $m->date_added,
            ]),
        ]);
    }

        public function update(Request $request, $id)
    {
        $user = $this->user();

        
        $group = DB::table('lce_user_group_admin')
            ->where('group_id', $id)
            ->where('user_id', $user->user_id)
            ->first();

        if (!$group) {
            return response()->json(['error' => 'Only group admin can update settings'], 403);
        }

        $request->validate([
            'group_name' => 'sometimes|string|max:255',
            'group_type' => 'sometimes|string|in:Independent,InHouse',
        ]);

        $updateData = [];
        if ($request->has('group_name')) {
            $updateData['group_name'] = $request->group_name;
        }
        if ($request->has('group_type')) {
            $updateData['group_type'] = $request->group_type;
        }

        if (!empty($updateData)) {
            DB::table('lce_user_group_admin')
                ->where('group_id', $id)
                ->update($updateData);
        }

        $group = DB::table('lce_user_group_admin')->where('group_id', $id)->first();

        return response()->json([
            'message' => 'Group updated successfully',
            'group' => [
                'id' => $group->group_id,
                'name' => $group->group_name,
                'type' => $group->group_type,
                'code' => $group->group_code,
            ],
        ]);
    }
}
