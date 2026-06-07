<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class VenteItem extends Model
{
    use HasUlids;
    public $timestamps = false;
    protected $table = 'vente_items';
    protected $fillable = ['vente_id','produit_id','produit_nom','quantite','prix_unitaire','total_ligne','note_prix_libre'];
    protected $casts = ['quantite'=>'float','prix_unitaire'=>'float','total_ligne'=>'float'];
    public function vente() { return $this->belongsTo(Vente::class); }
    public function produit() { return $this->belongsTo(Produit::class, 'produit_id'); }
}
