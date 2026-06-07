<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUlids;

class ImportsLog extends Model
{
    use HasUlids;
    protected $table = 'imports_log';
    protected $fillable = ['user_id','direction','type','filename','lignes_ok','lignes_erreur'];
}
