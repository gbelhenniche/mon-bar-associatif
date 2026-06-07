<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class MouvementCaisse extends Model
{
    use HasUlids;
    protected $table = 'mouvements_caisse';
    protected $fillable = ['session_id','user_id','type','montant','motif'];
    protected $casts = ['montant'=>'float'];
    public function session() { return $this->belongsTo(SessionCaisse::class, 'session_id'); }
}
