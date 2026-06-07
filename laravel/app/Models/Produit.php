<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class Produit extends Model
{
    use HasUlids;
    protected $fillable = ['categorie_id','reference','nom','format','fournisseur','prix_achat','prix_achat_ht','prix_vente','prix_vente_zero_taxe','stock_actuel','stock_minimum','suivi_stock','actif','visibilite','visibilite_jusqu_au'];
    protected $casts = ['suivi_stock'=>'boolean','actif'=>'boolean','prix_achat'=>'float','prix_achat_ht'=>'float','prix_vente'=>'float','prix_vente_zero_taxe'=>'float','stock_actuel'=>'float','stock_minimum'=>'float','visibilite_jusqu_au'=>'date'];
    public function categorie() { return $this->belongsTo(Categorie::class, 'categorie_id'); }
    public function venteItems() { return $this->hasMany(VenteItem::class, 'produit_id'); }
    public function mouvementsStock() { return $this->hasMany(MouvementStock::class, 'produit_id'); }
}
