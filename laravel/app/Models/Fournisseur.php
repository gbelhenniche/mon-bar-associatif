<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Fournisseur extends Model
{
    protected $fillable = [
        'nom', 'adresse', 'email', 'telephone', 'visible',
        'archived_at', 'archived_by', 'archive_motif', 'archive_motif_detail',
    ];

    protected $casts = [
        'visible'     => 'boolean',
        'archived_at' => 'datetime',
    ];

    public function archivedByUser() { return $this->belongsTo(\App\Models\User::class, 'archived_by'); }
}
