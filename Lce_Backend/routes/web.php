<?php

use Illuminate\Support\Facades\Route;


Route::get('/', function () {
    $path = public_path('index.html');
    if (file_exists($path)) {
        return response(file_get_contents($path), 200)
            ->header('Content-Type', 'text/html');
    }
    return "Frontend not built. Please run 'npm run build' and copy dist/ to public/.";
});



Route::get('/{any}', function () {
    $path = public_path('index.html');
    if (file_exists($path)) {
        return response(file_get_contents($path), 200)
            ->header('Content-Type', 'text/html');
    }
    return "Frontend not built. Please run 'npm run build' and copy dist/ to public/.";
})->where('any', '.*');
