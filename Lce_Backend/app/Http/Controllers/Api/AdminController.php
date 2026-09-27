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

        // Check if user is admin (is_admin == 1)
        if (!isset($userInfo->is_admin) || (int)$userInfo->is_admin !== 1) {
            return response()->json(['error' => 'Access denied. Account is not registered as an Admin.'], 403);
        }

        // Attempt JWT authentication via User model
        $token = JWTAuth::attempt($credentials);
        if (!$token) {
            // Check legacy password match or bcrypt
            $userModel = User::where('email', $request->email)->first();
            if ($userModel && Hash::check($request->password, $userModel->password)) {
                $token = JWTAuth::fromUser($userModel);
            } else {
                return response()->json(['error' => 'Invalid email or password.'], 401);
            }
        }

        return response()->json([
            'status' => 'success',
            'token' => $token,
            'user' => [
                'user_id' => $userInfo->user_id,
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
            $totalUsers = DB::table('lce_user_info')->count();
            $totalPickups = Schema::hasTable('lce_user_pickup') ? DB::table('lce_user_pickup')->count() : 0;
            $pendingPickups = Schema::hasTable('lce_user_pickup') ? DB::table('lce_user_pickup')->where('status', 'Scheduled')->count() : 0;
            $activeSubscriptions = Schema::hasTable('lce_user_subscriptions') ? DB::table('lce_user_subscriptions')->where('status', 'Active')->count() : 0;
            $totalRevenue = Schema::hasTable('lce_user_invoice') ? DB::table('lce_user_invoice')->sum('amount') : 0;

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
            $query = DB::table($tableName);

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
}
