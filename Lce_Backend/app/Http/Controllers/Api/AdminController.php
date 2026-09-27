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

    private function resolveTableName(string $tableName): string
    {
        if ($tableName === 'lce_non_working_days' && !Schema::hasTable('lce_non_working_days') && Schema::hasTable('lce_pickup_nonworking_days')) {
            return 'lce_pickup_nonworking_days';
        }
        return $tableName;
    }

    /**
     * Get table schema and paginated rows
     */
    public function getTableData(Request $request, $tableName)
    {
        $tableName = $this->resolveTableName($tableName);

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
                $targetUser = DB::table('lce_user_info')
                    ->where('id', $userIdFilter)
                    ->orWhere('user_id', $userIdFilter)
                    ->first(['id', 'user_id']);
                if ($targetUser) {
                    $uIds = array_unique(array_filter([(int) $targetUser->id, (int) $targetUser->user_id]));
                    $query->whereIn('user_id', $uIds);
                } else {
                    $query->where('user_id', $userIdFilter);
                }
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
            $isBulkTable = in_array($tableName, ['lce_prices', 'lce_pickup_zones', 'lce_zones', 'lce_pickup_nonworking_days']);
            $defaultPerPage = $isBulkTable ? 200 : 25;
            $maxPerPage = $isBulkTable ? 500 : 100;
            $perPage = min($maxPerPage, max(10, (int)$request->query('per_page', $defaultPerPage)));

            $total = $query->count();
            if ($tableName === 'lce_prices') {
                if (Schema::hasColumn($tableName, 'order')) {
                    $query->orderBy('order', 'asc');
                }
                $query->orderBy($primaryKey, 'asc');
            } else {
                $query->orderBy($primaryKey, 'desc');
            }

            $data = $query->offset(($page - 1) * $perPage)
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
        $tableName = $this->resolveTableName($tableName);

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
        $tableName = $this->resolveTableName($tableName);

        if (!Schema::hasTable($tableName)) {
            return response()->json(['error' => "Table '{$tableName}' does not exist."], 404);
        }

        try {
            // Discover primary key
            $columnsRaw = DB::select("SHOW COLUMNS FROM `{$tableName}`");
            $primaryKey = 'id';
            $validColumns = [];
            foreach ($columnsRaw as $col) {
                $validColumns[$col->Field] = true;
                if ($col->Key === 'PRI') {
                    $primaryKey = $col->Field;
                }
            }

            $input = $request->except(['_token', $primaryKey]);

            // Table-specific column alias mapping for lce_user_info
            if ($tableName === 'lce_user_info') {
                if (isset($input['price_list']) && isset($validColumns['price_list_id'])) {
                    $input['price_list_id'] = $input['price_list'];
                }
                if (isset($input['phone']) && isset($validColumns['phone_1'])) {
                    $input['phone_1'] = $input['phone'];
                }
                if (isset($input['phone_secondary']) && isset($validColumns['phone_2'])) {
                    $input['phone_2'] = $input['phone_secondary'];
                }
                if (isset($input['address']) && isset($validColumns['address_1'])) {
                    $input['address_1'] = $input['address'];
                }
                if (isset($input['apt_unit']) && isset($validColumns['address_2'])) {
                    $input['address_2'] = $input['apt_unit'];
                }
            }

            // Table-specific column alias mapping for lce_pickup_zones
            if (in_array($tableName, ['lce_pickup_zones', 'lce_zones'])) {
                if (isset($input['mon']) && isset($validColumns['day_monday'])) {
                    $input['day_monday'] = (int) $input['mon'];
                }
                if (isset($input['tue']) && isset($validColumns['day_tuesday'])) {
                    $input['day_tuesday'] = (int) $input['tue'];
                }
                if (isset($input['wed']) && isset($validColumns['day_wednesday'])) {
                    $input['day_wednesday'] = (int) $input['wed'];
                }
                if (isset($input['thu']) && isset($validColumns['day_thursday'])) {
                    $input['day_thursday'] = (int) $input['thu'];
                }
                if (isset($input['fri']) && isset($validColumns['day_friday'])) {
                    $input['day_friday'] = (int) $input['fri'];
                }
            }

            // Only update columns that actually exist in the table to prevent SQL errors
            $filteredInput = array_intersect_key($input, $validColumns);

            if (!empty($filteredInput)) {
                $updated = DB::table($tableName)
                    ->where($primaryKey, $id)
                    ->update($filteredInput);
            } else {
                $updated = 0;
            }

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
        $tableName = $this->resolveTableName($tableName);

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

            $actualUserId = $user->id;
            $userIds = array_unique(array_filter([(int) $user->id, (int) $user->user_id]));

            // Active subscription
            $activeSubscription = DB::table('lce_user_subscriptions')
                ->leftJoin('lce_subscription_plans', 'lce_user_subscriptions.plan_id', '=', 'lce_subscription_plans.id')
                ->whereIn('lce_user_subscriptions.user_id', $userIds)
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
                ->whereIn('lce_user_subscriptions.user_id', $userIds)
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
                ->whereIn('lce_user_subscriptions.user_id', $userIds)
                ->select(
                    'lce_user_subscriptions.*',
                    'lce_subscription_plans.name as plan_name'
                )
                ->orderBy('lce_user_subscriptions.id', 'desc')
                ->get();

            // Orders (pickups)
            $orders = DB::table('lce_user_pickup')
                ->whereIn('user_id', $userIds)
                ->orderBy('id', 'desc')
                ->get();

            // Invoices
            $invoices = DB::table('lce_user_invoice')
                ->whereIn('user_id', $userIds)
                ->orderBy('id', 'desc')
                ->get();

            // Transactions
            $transactions = DB::table('lce_user_transactions')
                ->whereIn('user_id', $userIds)
                ->orderBy('id', 'desc')
                ->get();

            // Credits
            $credits = [];
            if (Schema::hasTable('lce_user_credits')) {
                $credits = DB::table('lce_user_credits')->whereIn('user_id', $userIds)->orderBy('id', 'desc')->get();
            } elseif (Schema::hasTable('lce_credit')) {
                $credits = DB::table('lce_credit')->whereIn('user_id', $userIds)->orderBy('id', 'desc')->get();
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

    /**
     * Get dynamic price lists from lce_prices
     */
    public function getPriceLists()
    {
        try {
            $priceLists = [];
            $seenKeys = [];

            // 1. Fetch from database table lce_prices_lists
            if (Schema::hasTable('lce_prices_lists')) {
                $rows = DB::table('lce_prices_lists')->where('deleted', 'No')->get();
                foreach ($rows as $r) {
                    $val = (string)$r->id;
                    $name = $r->name;
                    $label = "{$name} (#{$val})";

                    $priceCol = "price_{$val}";
                    $rate = 0.0;
                    if (Schema::hasColumn('lce_prices', $priceCol)) {
                        $sample = DB::table('lce_prices')
                            ->where('deleted', 'No')
                            ->where('type', 'WF')
                            ->whereNotNull($priceCol)
                            ->first();
                        if ($sample) {
                            $rate = (float)$sample->$priceCol;
                        }
                    }

                    $priceLists[] = [
                        'value' => $val,
                        'label' => $label,
                        'rate' => $rate,
                        'sku' => "WF{$val}_1+",
                        'order' => (int)$val,
                    ];
                    $seenKeys[$val] = true;
                }
            }

            // Ensure price list 21 exists if used
            if (!isset($seenKeys['21']) && Schema::hasTable('lce_prices')) {
                $hasCol21 = Schema::hasColumn('lce_prices', 'price_21');
                $sample21 = $hasCol21 ? DB::table('lce_prices')->where('deleted', 'No')->where('type', 'WF')->whereNotNull('price_21')->first() : null;
                $rate21 = $sample21 ? (float)$sample21->price_21 : 2.99;
                $priceLists[] = [
                    'value' => '21',
                    'label' => 'WF21_1+ - $2.99',
                    'rate' => $rate21,
                    'sku' => 'WF21_1+',
                    'order' => 21,
                ];
            }

            // Sort: Institutional zone zip lists (ID >= 100) descending (198 down to 132), followed by retail/whls (1, 2, 3)
            usort($priceLists, function ($a, $b) {
                $idA = (int)$a['value'];
                $idB = (int)$b['value'];
                $isSpecialA = $idA >= 100;
                $isSpecialB = $idB >= 100;
                if ($isSpecialA && !$isSpecialB) return -1;
                if (!$isSpecialA && $isSpecialB) return 1;
                if ($isSpecialA && $isSpecialB) return $idB <=> $idA;
                return $idA <=> $idB;
            });

            return response()->json([
                'status' => 'success',
                'data' => $priceLists,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
                'data' => [
                    ['value' => '1', 'label' => 'WF1_1+ - $3.09', 'rate' => 3.09],
                    ['value' => '2', 'label' => 'WF2_1+ - $1.99', 'rate' => 1.99],
                    ['value' => '3', 'label' => 'WF3_1+ - $2.79', 'rate' => 2.79],
                    ['value' => '4', 'label' => 'WF4_1+ - $2.29', 'rate' => 2.29],
                    ['value' => '5', 'label' => 'WF5_1+ - $2.19', 'rate' => 2.19],
                    ['value' => '6', 'label' => 'WF6_1+ - $2.09', 'rate' => 2.09],
                    ['value' => '7', 'label' => 'WF7_1+ - $2.39', 'rate' => 2.39],
                    ['value' => '8', 'label' => 'WF8_1+ - $2.49', 'rate' => 2.49],
                    ['value' => '9', 'label' => 'WF9_1+ - $2.59', 'rate' => 2.59],
                    ['value' => '10', 'label' => 'WF10_1+ - $2.99', 'rate' => 2.99],
                    ['value' => '11', 'label' => 'WF11_1+ - $2.99', 'rate' => 2.99],
                    ['value' => '12', 'label' => 'WF12_1+ - $2.99', 'rate' => 2.99],
                    ['value' => '13', 'label' => 'WF13_1+ - $2.99', 'rate' => 2.99],
                    ['value' => '134', 'label' => '00005 (#134)', 'rate' => 0.00],
                ]
            ]);
        }
    }

    /**
     * Execute arbitrary raw SQL query in admin panel
     */
    public function executeSql(Request $request)
    {
        $request->validate([
            'sql' => 'required|string',
        ]);

        $rawSql = trim($request->input('sql'));

        if (empty($rawSql)) {
            return response()->json(['error' => 'SQL query cannot be empty.'], 400);
        }

        try {
            $startTime = microtime(true);
            $upper = strtoupper(ltrim($rawSql));

            // Check if query is read-only / tabular
            if (
                str_starts_with($upper, 'SELECT') ||
                str_starts_with($upper, 'SHOW') ||
                str_starts_with($upper, 'DESC') ||
                str_starts_with($upper, 'DESCRIBE') ||
                str_starts_with($upper, 'EXPLAIN')
            ) {
                $results = DB::select($rawSql);
                $duration = round((microtime(true) - $startTime) * 1000, 2);

                $columns = [];
                if (!empty($results)) {
                    $first = (array)$results[0];
                    $columns = array_keys($first);
                }

                return response()->json([
                    'status' => 'success',
                    'type' => 'select',
                    'columns' => $columns,
                    'rows' => $results,
                    'count' => count($results),
                    'duration_ms' => $duration,
                ]);
            }

            // Mutation or DDL query (INSERT, UPDATE, DELETE, ALTER, etc.)
            // Split by semicolon if multiple statements
            $statements = array_filter(
                array_map('trim', explode(';', $rawSql)),
                fn($stmt) => !empty($stmt)
            );

            $totalAffected = 0;
            foreach ($statements as $stmt) {
                $affected = DB::affectingStatement($stmt);
                $totalAffected += $affected;
            }

            $duration = round((microtime(true) - $startTime) * 1000, 2);

            return response()->json([
                'status' => 'success',
                'type' => 'execute',
                'affected_rows' => $totalAffected,
                'message' => "Query executed successfully ({$totalAffected} rows affected).",
                'duration_ms' => $duration,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}

