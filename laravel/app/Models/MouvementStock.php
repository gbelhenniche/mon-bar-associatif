<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class MouvementStock extends Model
{
    use HasUlids;
    protected $table = 'mouvements_stock';
    protected $fillable = ['produit_id','user_id','type','quantite','note'];
    protected $casts = ['quantite'=>'float'];
    public function produit() { return $this->belongsTo(Produit::class); }
}
