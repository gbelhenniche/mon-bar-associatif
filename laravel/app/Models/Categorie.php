<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class Categorie extends Model
{
    use HasUlids;
    protected $fillable = ['nom', 'couleur', 'icone', 'ordre'];
    public function produits() { return $this->hasMany(Produit::class, 'categorie_id'); }
}
