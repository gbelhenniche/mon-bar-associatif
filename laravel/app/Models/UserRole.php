<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class UserRole extends Model
{
    use HasUlids;
    protected $table = 'user_roles';
    protected $fillable = ['user_id','role'];
    public function user() { return $this->belongsTo(User::class); }
}
