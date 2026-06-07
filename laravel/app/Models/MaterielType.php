<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterielType extends Model
{
    protected $fillable = ['nom', 'couleur', 'icone', 'ordre'];
}
