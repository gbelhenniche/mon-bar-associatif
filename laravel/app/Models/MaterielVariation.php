<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterielVariation extends Model
{
    protected $fillable = ['materiel_id', 'variation'];

    protected $casts = ['variation' => 'integer'];

    public function materiel()
    {
        return $this->belongsTo(Materiel::class);
    }
}
