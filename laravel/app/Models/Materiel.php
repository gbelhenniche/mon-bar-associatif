<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Materiel extends Model
{
    protected $fillable = [
        'nom',
        'type',
        'fournisseur',
        'seuil_alerte',
        'note',
        'visible',
        'quantite',
    ];

    protected $casts = [
        'visible' => 'boolean',
        'seuil_alerte' => 'integer',
        'quantite' => 'integer',
    ];

    public function variations()
    {
        return $this->hasMany(MaterielVariation::class);
    }
}
