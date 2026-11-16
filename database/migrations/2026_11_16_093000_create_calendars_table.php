<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('calendars', function (Blueprint $table) {
            $table->id();
            $table->date('per_date')->unique();
            $table->string('buddhist_year_my')->nullable();
            $table->string('buddhist_year_en')->nullable();
            $table->string('my_cal_year_my')->nullable();
            $table->string('my_cal_year_en')->nullable();
            $table->string('my_cal_month_my')->nullable();
            $table->string('my_cal_month_en')->nullable();
            $table->string('my_cal_day_my')->nullable();
            $table->string('my_cal_day_en')->nullable();
            $table->string('my_cal_type_of_day_my')->nullable();
            $table->string('my_cal_type_of_day_en')->nullable();
            $table->string('my_cal_weekday_my')->nullable();
            $table->string('my_cal_weekday_en')->nullable();
            $table->date('first_date_of_tagu')->nullable();
            $table->date('first_date_of_waso')->nullable();
            $table->boolean('is_watat')->nullable();
            $table->boolean('is_big_watat')->nullable();
            $table->date('akyo_day')->nullable();
            $table->date('akya_day')->nullable();
            $table->date('first_akyat_day')->nullable();
            $table->date('second_akyat_day')->nullable();
            $table->date('atat_day')->nullable();
            $table->date('new_year_day')->nullable();
            $table->timestamp('akya_time')->nullable();
            $table->timestamp('atat_time')->nullable();
            $table->timestamps();
        });

        Schema::create('calendar_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('calendar_id')->index()->constrained('calendars')->cascadeOnDelete();
            $table->integer('sabbath')->default(0);
            $table->integer('sabbath_eve')->default(0);
            $table->integer('yatyaza')->default(0);
            $table->integer('pyathada')->default(0);
            $table->integer('thamanyo')->default(0);
            $table->integer('thamaphyu')->default(0);
            $table->integer('amyeittasote')->default(0);
            $table->integer('warameittugyi')->default(0);
            $table->integer('warameittunge')->default(0);
            $table->integer('yatpote')->default(0);
            $table->integer('yatyotema')->default(0);
            $table->integer('nagapor')->default(0);
            $table->integer('nagahle')->default(0)->comment('0 = west, 1 = north, 2 = east, 3 = south');
            $table->integer('mahayatkyan')->default(0);
            $table->integer('shanyat')->default(0);
            $table->integer('mahabote')->default(0)->comment('0 = Binga, 1 = Atun, 2 = Yaza, 3 = Adipati, 4 = Marana, 5 = Thike, 6 = Puti');
            $table->integer('nakhat')->default(0)->comment('0 = orc, 1 = elf, 2 = human');
            $table->timestamps();
        });

        Schema::create('calendar_days', function (Blueprint $table) {
            $table->id();
            $table->foreignId('calendar_id')->index()->constrained('calendars')->cascadeOnDelete();
            $table->date('per_date')->nullable()->index();
            $table->string('type')->nullable()->comment('holiday or blessingday');
            $table->string('name');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('calendar_days');
        Schema::dropIfExists('calendar_details');
        Schema::dropIfExists('calendars');
    }
};
