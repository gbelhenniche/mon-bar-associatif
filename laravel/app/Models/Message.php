<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = ['type', 'contenu', 'frequence', 'actif', 'date_fin'];
    protected $casts = [
        'actif'    => 'boolean',
        'date_fin' => 'date:Y-m-d',
    ];
}
