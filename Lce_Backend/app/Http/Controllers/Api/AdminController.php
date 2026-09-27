<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;
use Tymon\JWTAuth\Facades\JWTAuth;
use App\Models\User;

class AdminController extends Controller
{
    /**
     * Admin Login via Email and Password
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $credentials = $request->only('email', 'password');

        // Find user by email in lce_user_info
        $userInfo = DB::table('lce_user_info')
            ->where('email', $request->email)
            ->first();

        if (!$userInfo) {
            return response()->json(['error' => 'Invalid email or password.'], 401);
        }

        // Auto-fix user_id if NULL
        if (isset($userInfo->id) && (empty($userInfo->user_id) || $userInfo->user_id === null)) {
            DB::table('lce_user_info')
                ->where('id', $userInfo->id)
                ->update(['user_id' => $userInfo->id]);
            $userInfo->user_id = $userInfo->id;
        }

        // Check if user is admin (is_admin == 1)
        if (!isset($userInfo->is_admin) || (int)$userInfo->is_admin !== 1) {
            return response()->json(['error' => 'Access denied. Account is not registered as an Admin.'], 403);
        }

        // Check password against lce_user_info directly
        $passwordValid = false;
        if (isset($userInfo->password) && Hash::check($request->password, $userInfo->password)) {
            $passwordValid = true;
        } elseif (isset($userInfo->password) && $request->password === $userInfo->password) {
            $passwordValid = true;
        }

        if (!$passwordValid) {
            return response()->json(['error' => 'Invalid email or password.'], 401);
        }

        // Generate JWT token from User model or userInfo ID
        $userModel = User::where('email', $request->email)->first();
        if (!$userModel && isset($userInfo->user_id)) {
            $userModel = User::where('user_id', $userInfo->user_id)->first();
        }

        if ($userModel) {
            $token = JWTAuth::fromUser($userModel);
        } else {
            // Fallback attempt
            $token = JWTAuth::attempt($credentials);
            if (!$token) {
                return response()->json(['error' => 'Failed to generate access token.'], 500);
            }
        }

        return response()->json([
            'status' => 'success',
            'token' => $token,
            'user' => [
                'user_id' => $userInfo->user_id ?? 1,
                'email' => $userInfo->email,
                'first_name' => $userInfo->first_name ?? '',
                'last_name' => $userInfo->last_name ?? '',
                'is_admin' => 1
            ]
        ]);
    }


    /**
     * Get system aggregate statistics
     */
    public function getStats()
    {
        try {
            $totalUsers = Schema::hasTable('lce_user_info') ? DB::table('lce_user_info')->count() : 0;
            $totalPickups = Schema::hasTable('lce_user_pickup') ? DB::table('lce_user_pickup')->count() : 0;

            $pendingPickups = 0;
            if (Schema::hasTable('lce_user_pickup') && Schema::hasColumn('lce_user_pickup', 'status')) {
                $pendingPickups = DB::table('lce_user_pickup')->where('status', 'Scheduled')->count();
            }

            $activeSubscriptions = 0;
            if (Schema::hasTable('lce_user_subscriptions') && Schema::hasColumn('lce_user_subscriptions', 'status')) {
                $activeSubscriptions = DB::table('lce_user_subscriptions')->where('status', 'Active')->count();
            }

            $totalRevenue = 0;
            if (Schema::hasTable('lce_user_invoice')) {
                if (Schema::hasColumn('lce_user_invoice', 'amount')) {
                    $totalRevenue = DB::table('lce_user_invoice')->sum('amount');
                } elseif (Schema::hasColumn('lce_user_invoice', 'total')) {
                    $totalRevenue = DB::table('lce_user_invoice')->sum('total');
                } elseif (Schema::hasColumn('lce_user_invoice', 'total_amount')) {
                    $totalRevenue = DB::table('lce_user_invoice')->sum('total_amount');
                } elseif (Schema::hasColumn('lce_user_invoice', 'price')) {
                    $totalRevenue = DB::table('lce_user_invoice')->sum('price');
                }
            }

            return response()->json([
                'total_users' => $totalUsers,
                'total_pickups' => $totalPickups,
                'pending_pickups' => $pendingPickups,
                'active_subscriptions' => $activeSubscriptions,
                'total_revenue' => round((float)$totalRevenue, 2),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }


    /**
     * Get list of all database tables with row counts
     */
    public function getTables()
    {
        try {
            $tablesRaw = DB::select('SHOW TABLES');
            $dbName = DB::getDatabaseName();
            $tableKey = "Tables_in_{$dbName}";

            $tables = [];
            foreach ($tablesRaw as $t) {
                $tableName = $t->$tableKey ?? current((array)$t);
                if ($tableName && str_starts_with($tableName, 'lce_')) {
                    $count = DB::table($tableName)->count();
                    $tables[] = [
                        'name' => $tableName,
                        'count' => $count
                    ];
                }
            }

            // Sort alphabetically
            usort($tables, fn($a, $b) => strcmp($a['name'], $b['name']));

            return response()->json(['tables' => $tables]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get table schema and paginated rows
     */
    public function getTableData(Request $request, $tableName)
    {
        if (!Schema::hasTable($tableName)) {
            return response()->json(['error' => "Table '{$tableName}' does not exist."], 404);
        }

        try {
            // Get columns metadata
            $columnsRaw = DB::select("SHOW COLUMNS FROM `{$tableName}`");
            $columns = [];
            $primaryKey = 'id';

            foreach ($columnsRaw as $col) {
                $isPk = ($col->Key === 'PRI');
                if ($isPk) {
                    $primaryKey = $col->Field;
                }

                // Detect foreign key hint
                $foreignKeyRef = null;
                if (str_ends_with($col->Field, '_id')) {
                    if ($col->Field === 'user_id') {
                        $foreignKeyRef = ['table' => 'lce_user_info', 'column' => 'user_id', 'label_column' => 'email'];
                    } elseif ($col->Field === 'pickup_id') {
                        $foreignKeyRef = ['table' => 'lce_user_pickup', 'column' => 'pickup_id', 'label_column' => 'status'];
                    } elseif ($col->Field === 'plan_id') {
                        $foreignKeyRef = ['table' => 'lce_subscription_plans', 'column' => 'id', 'label_column' => 'title'];
                    }
                }

                $columns[] = [
                    'name' => $col->Field,
                    'type' => $col->Type,
                    'nullable' => $col->Null === 'YES',
                    'key' => $col->Key,
                    'default' => $col->Default,
                    'is_primary' => $isPk,
                    'foreign_key' => $foreignKeyRef
                ];
            }

            // Search query filter
            $search = $request->query('search');
            $userIdFilter = $request->query('user_id');
            $query = DB::table($tableName);

            if ($userIdFilter && Schema::hasColumn($tableName, 'user_id')) {
                $query->where('user_id', $userIdFilter);
            }

            if ($search) {
                $query->where(function ($q) use ($columns, $search) {
                    foreach ($columns as $col) {
                        $q->orWhere($col['name'], 'LIKE', "%{$search}%");
                    }
                });
            }

            // Pagination
            $page = max(1, (int)$request->query('page', 1));
            $perPage = min(100, max(10, (int)$request->query('per_page', 25)));

            $total = $query->count();
            $data = $query->orderBy($primaryKey, 'desc')
                ->offset(($page - 1) * $perPage)
                ->limit($perPage)
                ->get();

            return response()->json([
                'table' => $tableName,
                'primary_key' => $primaryKey,
                'columns' => $columns,
                'total' => $total,
                'page' => $page,
                'per_page' => $perPage,
                'last_page' => ceil($total / $perPage),
                'data' => $data
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create a record in specified table
     */
    public function createRecord(Request $request, $tableName)
    {
        if (!Schema::hasTable($tableName)) {
            return response()->json(['error' => "Table '{$tableName}' does not exist."], 404);
        }

        try {
            $input = $request->except(['_token']);
            $id = DB::table($tableName)->insertGetId($input);

            return response()->json([
                'status' => 'success',
                'message' => "Record inserted into {$tableName} successfully.",
                'inserted_id' => $id
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Update a record in specified table
     */
    public function updateRecord(Request $request, $tableName, $id)
    {
        if (!Schema::hasTable($tableName)) {
            return response()->json(['error' => "Table '{$tableName}' does not exist."], 404);
        }

        try {
            // Discover primary key
            $columnsRaw = DB::select("SHOW COLUMNS FROM `{$tableName}`");
            $primaryKey = 'id';
            foreach ($columnsRaw as $col) {
                if ($col->Key === 'PRI') {
                    $primaryKey = $col->Field;
                    break;
                }
            }

            $input = $request->except(['_token', $primaryKey]);
            $updated = DB::table($tableName)
                ->where($primaryKey, $id)
                ->update($input);

            return response()->json([
                'status' => 'success',
                'message' => "Record {$id} in {$tableName} updated successfully.",
                'affected_rows' => $updated
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Delete a record with foreign key check & cascade support
     */
    public function deleteRecord(Request $request, $tableName, $id)
    {
        if (!Schema::hasTable($tableName)) {
            return response()->json(['error' => "Table '{$tableName}' does not exist."], 404);
        }

        try {
            // Discover primary key
            $columnsRaw = DB::select("SHOW COLUMNS FROM `{$tableName}`");
            $primaryKey = 'id';
            foreach ($columnsRaw as $col) {
                if ($col->Key === 'PRI') {
                    $primaryKey = $col->Field;
                    break;
                }
            }

            $force = $request->boolean('force', false);

            if ($force) {
                DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            }

            $deleted = DB::table($tableName)
                ->where($primaryKey, $id)
                ->delete();

            if ($force) {
                DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            }

            return response()->json([
                'status' => 'success',
                'message' => "Record {$id} deleted from {$tableName}.",
                'affected_rows' => $deleted
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => "Cannot delete record: " . $e->getMessage(),
                'has_relations' => true,
                'suggestion' => "This record has child relations in other tables. You can select 'Force Delete' to cascade."
            ], 409);
        }
    }

    /**
     * Quick pickup status updater
     */
    public function updatePickupStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string',
        ]);

        try {
            DB::table('lce_user_pickup')
                ->where('pickup_id', $id)
                ->update([
                    'status' => $request->status,
                    'updated_at' => now()
                ]);

            return response()->json([
                'status' => 'success',
                'message' => "Pickup #{$id} status updated to {$request->status}."
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get comprehensive user details for Admin User Inspector
     */
    public function getUserDetails(Request $request, $userId)
    {
        try {
            $user = DB::table('lce_user_info')->where('user_id', $userId)->first();
            if (!$user) {
                $user = DB::table('lce_user_info')->where('id', $userId)->first();
            }

            if (!$user) {
                return response()->json(['error' => 'User not found.'], 404);
            }

            $actualUserId = $user->user_id ?? $user->id;

            // Active subscription
            $activeSubscription = DB::table('lce_user_subscriptions')
                ->leftJoin('lce_subscription_plans', 'lce_user_subscriptions.plan_id', '=', 'lce_subscription_plans.id')
                ->where('lce_user_subscriptions.user_id', $actualUserId)
                ->whereIn('lce_user_subscriptions.status', ['active', 'cancelled_pending'])
                ->select(
                    'lce_user_subscriptions.*',
                    'lce_subscription_plans.name as plan_name',
                    'lce_subscription_plans.price_per_bag',
                    'lce_subscription_plans.bags_per_month',
                    'lce_subscription_plans.annual_discount'
                )
                ->first();

            // Pending subscription (upgrade/downgrade)
            $pendingSubscription = DB::table('lce_user_subscriptions')
                ->leftJoin('lce_subscription_plans', 'lce_user_subscriptions.plan_id', '=', 'lce_subscription_plans.id')
                ->where('lce_user_subscriptions.user_id', $actualUserId)
                ->where('lce_user_subscriptions.status', 'pending')
                ->select(
                    'lce_user_subscriptions.*',
                    'lce_subscription_plans.name as plan_name',
                    'lce_subscription_plans.price_per_bag',
                    'lce_subscription_plans.bags_per_month'
                )
                ->first();

            // All subscription history
            $subscriptions = DB::table('lce_user_subscriptions')
                ->leftJoin('lce_subscription_plans', 'lce_user_subscriptions.plan_id', '=', 'lce_subscription_plans.id')
                ->where('lce_user_subscriptions.user_id', $actualUserId)
                ->select(
                    'lce_user_subscriptions.*',
                    'lce_subscription_plans.name as plan_name'
                )
                ->orderBy('lce_user_subscriptions.id', 'desc')
                ->get();

            // Orders (pickups)
            $orders = DB::table('lce_user_pickup')
                ->where('user_id', $actualUserId)
                ->orderBy('id', 'desc')
                ->get();

            // Invoices
            $invoices = DB::table('lce_user_invoice')
                ->where('user_id', $actualUserId)
                ->orderBy('id', 'desc')
                ->get();

            // Transactions
            $transactions = DB::table('lce_user_transactions')
                ->where('user_id', $actualUserId)
                ->orderBy('id', 'desc')
                ->get();

            // Credits
            $credits = [];
            if (Schema::hasTable('lce_user_credits')) {
                $credits = DB::table('lce_user_credits')->where('user_id', $actualUserId)->orderBy('id', 'desc')->get();
            } elseif (Schema::hasTable('lce_credit')) {
                $credits = DB::table('lce_credit')->where('user_id', $actualUserId)->orderBy('id', 'desc')->get();
            }

            return response()->json([
                'user' => $user,
                'user_id' => $actualUserId,
                'active_subscription' => $activeSubscription,
                'pending_subscription' => $pendingSubscription,
                'subscriptions' => $subscriptions,
                'orders' => $orders,
                'invoices' => $invoices,
                'transactions' => $transactions,
                'credits' => $credits,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
