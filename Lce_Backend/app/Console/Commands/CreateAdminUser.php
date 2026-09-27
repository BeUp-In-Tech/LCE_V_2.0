<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class CreateAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:admin {email=admin@laundrycareexpress.com} {password=Admin12345!} {first_name=Admin} {last_name=User}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create or update an Admin user with is_admin = 1';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        $password = $this->argument('password');
        $firstName = $this->argument('first_name');
        $lastName = $this->argument('last_name');

        $this->info("Setting up Admin user for: {$email}");

        $existing = DB::table('lce_user_info')
            ->where('email', $email)
            ->first();

        $hashedPassword = Hash::make($password);

        if ($existing) {
            DB::table('lce_user_info')
                ->where('user_id', $existing->user_id)
                ->update([
                    'is_admin' => 1,
                    'password' => $hashedPassword,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                ]);

            $this->info("✓ Updated existing user #{$existing->user_id} to Admin (is_admin = 1).");
        } else {
            $insertData = [
                'email' => $email,
                'password' => $hashedPassword,
                'first_name' => $firstName,
                'last_name' => $lastName,
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

            $userId = DB::table('lce_user_info')->insertGetId($insertData);

            $this->info("✓ Created new Admin user #{$userId}.");
        }

        $this->table(
            ['Field', 'Value'],
            [
                ['Email', $email],
                ['Password', $password],
                ['Admin Status (is_admin)', '1'],
            ]
        );

        $this->info('Admin user created successfully! You can now log into the Admin Panel.');
        return 0;
    }
}
