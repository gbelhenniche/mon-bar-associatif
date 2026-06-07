<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class TypeAdherent extends Model
{
    use HasUlids;

    protected $table = 'types_adherent';
    protected $fillable = ['slug', 'nom', 'icone', 'couleur', 'ordre', 'autorisation'];
    protected $casts = ['ordre' => 'integer'];
}
