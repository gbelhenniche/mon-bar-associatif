<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class Vente extends Model
{
    use HasUlids;
    protected $fillable = ['user_id','session_id','adherent_id','total','paiement','note'];
    protected $casts = ['total'=>'float'];
    public function items() { return $this->hasMany(VenteItem::class, 'vente_id'); }
    public function session() { return $this->belongsTo(SessionCaisse::class, 'session_id'); }
    public function adherent() { return $this->belongsTo(Adherent::class, 'adherent_id'); }
}
