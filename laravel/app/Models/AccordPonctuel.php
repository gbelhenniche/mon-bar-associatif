<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccordPonctuel extends Model
{
    use HasUlids;

    protected $table = 'accords_ponctuels';
    protected $fillable = ['date_debut', 'date_fin', 'notes', 'user_id'];
    protected $casts = [
        'date_debut' => 'date',
        'date_fin'   => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
