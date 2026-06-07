<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class Adherent extends Model
{
    use HasUlids;

    protected $fillable = [
        'numero', 'prenom', 'nom', 'email', 'telephone', 'ville',
        'type_adhesion', 'date_premiere_adhesion',
        'notes', 'actif',
        'archived_at', 'archived_by', 'archive_motif', 'archive_motif_detail',
    ];

    protected $casts = [
        'actif'                  => 'boolean',
        'date_premiere_adhesion' => 'date',
        'numero'                 => 'integer',
        'archived_at'            => 'datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $adherent) {
            if (empty($adherent->numero)) {
                $adherent->numero = ((int) static::max('numero')) + 1;
            }
        });
    }

    public function ventes() { return $this->hasMany(Vente::class, 'adherent_id'); }
    public function archivedByUser() { return $this->belongsTo(\App\Models\User::class, 'archived_by'); }
}
