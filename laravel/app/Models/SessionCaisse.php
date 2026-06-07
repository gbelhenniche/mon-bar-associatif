<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class SessionCaisse extends Model
{
    use HasUlids;
    protected $table = 'sessions_caisse';
    protected $fillable = ['user_id','nom','fond_ouverture','fond_fermeture','especes_comptees','ecart','opened_at','closed_at','notes','denominations_fermeture'];
    protected $casts = ['fond_ouverture'=>'float','fond_fermeture'=>'float','especes_comptees'=>'float','ecart'=>'float','opened_at'=>'datetime','closed_at'=>'datetime','denominations_fermeture'=>'array'];
    public function user() { return $this->belongsTo(User::class); }
    public function ventes() { return $this->hasMany(Vente::class, 'session_id'); }
    public function mouvements() { return $this->hasMany(MouvementCaisse::class, 'session_id'); }
}
