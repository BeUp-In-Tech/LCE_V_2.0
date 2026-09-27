<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = 'admin@laundrycareexpress.com';
        $password = 'Admin12345!';

        // Ensure password and is_admin columns exist
        if (Schema::hasTable('lce_user_info')) {
            Schema::table('lce_user_info', function ($table) {
                if (!Schema::hasColumn('lce_user_info', 'password')) {
                    $table->string('password', 255)->nullable();
                }
                if (!Schema::hasColumn('lce_user_info', 'is_admin')) {
                    $table->tinyInteger('is_admin')->default(0);
                }
            });
        }

        $existing = DB::table('lce_user_info')
            ->where('email', $email)
            ->first();

        $hashedPassword = Hash::make($password);

        if ($existing) {
            $userIdVal = $existing->user_id ?? $existing->id;
            DB::table('lce_user_info')
                ->where('id', $existing->id)
                ->update([
                    'user_id' => $userIdVal,
                    'is_admin' => 1,
                    'password' => $hashedPassword,
                    'first_name' => 'Admin',
                    'last_name' => 'User',
                ]);
        } else {
            $nextId = (DB::table('lce_user_info')->max('id') ?? 0) + 1;
            $insertData = [
                'id' => $nextId,
                'user_id' => $nextId,
                'email' => $email,
                'password' => $hashedPassword,
                'first_name' => 'Admin',
                'last_name' => 'User',
                'is_admin' => 1,
                'user_md' => substr(md5($email . time()), 0, 10),
            ];

            try {
                $columns = DB::select("SHOW COLUMNS FROM `lce_user_info`");
                foreach ($columns as $col) {
                    $field = $col->Field;
                    if ($col->Null === 'NO' && $col->Default === null && !isset($insertData[$field]) && $col->Key !== 'PRI') {
                        $type = strtolower($col->Type);
                        if (
                            str_contains($type, 'int') ||
                            str_contains($type, 'decimal') ||
                            str_contains($type, 'float') ||
                            str_contains($type, 'double') ||
                            str_contains($type, 'numeric')
                        ) {
                            $insertData[$field] = 0;
                        } else {
                            $insertData[$field] = '';
                        }
                    }
                }
            } catch (\Exception $e) {
                $insertData['custom_minimum_charge'] = 0;
            }

            DB::table('lce_user_info')->insert($insertData);
        }
    }
}
