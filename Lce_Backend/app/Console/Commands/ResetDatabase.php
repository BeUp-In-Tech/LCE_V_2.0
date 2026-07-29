<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ResetDatabase extends Command
{
    protected $signature = 'db:reset-import {--file= : Path to SQL file}';
    protected $description = 'Drop all tables and import from SQL file';

    public function handle()
    {
        $this->warn('Dropping all tables...');

        
        DB::statement('SET FOREIGN_KEY_CHECKS=0');

        
        $tables = DB::select('SHOW TABLES');
        $dbName = config('database.connections.mysql.database');
        $key = "Tables_in_{$dbName}";

        foreach ($tables as $table) {
            $tableName = $table->$key;
            DB::statement("DROP TABLE IF EXISTS `{$tableName}`");
            $this->line("Dropped: {$tableName}");
        }

        
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        $this->info('All tables dropped!');

        
        $file = $this->option('file');
        if ($file && file_exists($file)) {
            $this->info("Importing from: {$file}");
            $sql = file_get_contents($file);

            
            DB::unprepared($sql);

            $this->info('Import complete!');
        } else {
            $this->warn('No file provided or file not found. Only tables were dropped.');
        }

        return 0;
    }
}
