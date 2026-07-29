<?php

namespace App\Http\Controllers;

use App\Models\User;

abstract class Controller
{
        protected function user(): User
    {
                $user = request()->user();
        return $user;
    }
}
