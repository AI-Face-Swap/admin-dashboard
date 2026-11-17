<?php

use App\Actions\CalendarAction;
use App\Models\Calendar;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('sanYatNatkhat calculates step-by-step according to specification', function () {
    $action = new CalendarAction;

    // Example 1: သီတင်းကျွတ် (5), လဆုတ်, 5, ဗြိစ္ဆာ (+1)
    // step2 = 5 * 2 = 10; tithi = 5 + 15 = 20; sum = 30; rem = 30 % 27 = 3; adj = 3 + 1 = 4 -> ရောဟဏီ
    $result = $action->sanYatNatkhat('သီတင်းကျွတ်', 'လဆုတ်', 5, 'ဗြိစ္ဆာ');
    expect($result)->toBe([
        'number' => 4,
        'name' => 'ရောဟဏီ',
    ]);

    // Example 2: ကဆုန် (0), လဆန်း, 1, ကရကဋ် (0)
    // step2 = 0; tithi = 1; sum = 1; rem = 1; adj = 1 + 0 = 1 -> အဿဝဏီ
    expect($action->sanYatNatkhat('ကဆုန်', 'လဆန်း', 1, 'ကရကဋ်'))->toBe([
        'number' => 1,
        'name' => 'အဿဝဏီ',
    ]);

    // Example 3: Boundary wrap <= 0 (adjusted_val = 0 -> 27 ရေဝတီ, adjusted_val = -1 -> 26 ဥတ္တရဘဒြပိုဒ်)
    // ကဆုန် (0), လဆုတ်, 12 -> tithi = 27, sum = 27, rem = 0
    // With ကန် (0) -> adjusted = 0 -> 27 (ရေဝတီ)
    expect($action->sanYatNatkhat('ကဆုန်', 'လဆုတ်', 12, 'ကန်'))->toBe([
        'number' => 27,
        'name' => 'ရေဝတီ',
    ]);
    // With မိဿ (-1) -> adjusted = -1 -> 26 (ဥတ္တရဘဒြပိုဒ်)
    expect($action->sanYatNatkhat('ကဆုန်', 'လဆုတ်', 12, 'မိဿ'))->toBe([
        'number' => 26,
        'name' => 'ဥတ္တရဘဒြပိုဒ်',
    ]);

    // Example 4: Boundary wrap > 27 (adjusted_val = 28 -> 1 အဿဝဏီ)
    // ကဆုန် (0), လဆုတ်, 11 -> tithi = 26, sum = 26, rem = 26
    // With ကုံ (+2) -> adjusted = 28 -> 1 (အဿဝဏီ)
    expect($action->sanYatNatkhat('ကဆုန်', 'လဆုတ်', 11, 'ကုံ'))->toBe([
        'number' => 1,
        'name' => 'အဿဝဏီ',
    ]);

    // Supports CalendarAction::zodiac() formatted strings and ပဝါဆို / ဒုဝါဆို / လပြည့် / လကွယ်
    expect($action->sanYatNatkhat('ဒုဝါဆို', 'လပြည့်', 15, 'ကုမ်ရာသီ (Aquarius)'))->toBe([
        // month_count = 2, step2 = 4, tithi = 15, sum = 19, rem = 19, +2 = 21 -> ဥတ္တရာသဠ်
        'number' => 21,
        'name' => 'ဥတ္တရာသဠ်',
    ]);
});

test('astrology profile store and show persist and return san_yat_natkhat', function () {
    Calendar::create([
        'per_date' => '2001-11-06',
        'buddhist_year_my' => '၂၅၄၅',
        'buddhist_year_en' => '2545',
        'my_cal_year_my' => '၁၃၆၃',
        'my_cal_year_en' => '1363',
        'my_cal_month_my' => 'သီတင်းကျွတ်',
        'my_cal_month_en' => 'Thadingyut',
        'my_cal_day_my' => '၅',
        'my_cal_day_en' => '5',
        'my_cal_type_of_day_my' => 'လဆုတ်',
        'my_cal_type_of_day_en' => 'Waning',
        'my_cal_weekday_my' => 'အင်္ဂါ',
        'my_cal_weekday_en' => 'Tuesday',
        'first_date_of_tagu' => '2001-04-13',
        'first_date_of_waso' => '2001-07-01',
        'is_watat' => false,
        'is_big_watat' => false,
        'akyo_day' => '2001-04-13',
        'akya_day' => '2001-04-14',
        'first_akyat_day' => '2001-04-15',
        'second_akyat_day' => '2001-04-15',
        'atat_day' => '2001-04-16',
        'new_year_day' => '2001-04-17',
        'akya_time' => now(),
        'atat_time' => now(),
    ]);

    $customer = Customer::factory()->create();

    $storeResponse = $this->actingAs($customer, 'sanctum')
        ->postJson('/api/v1/astrology/profile', [
            'name' => 'ZMH',
            'birthday' => '2001-11-06',
            'gender' => 'female',
        ]);

    $storeResponse->assertOk()
        ->assertJsonPath('data.info.birthday.san_yat_natkhat', 'ရောဟဏီ');

    $this->assertDatabaseHas('customer_infos', [
        'customer_id' => $customer->id,
        'san_yat_natkhat' => 'ရောဟဏီ',
    ]);

    $showResponse = $this->actingAs($customer, 'sanctum')
        ->getJson('/api/v1/astrology/profile');

    $showResponse->assertOk()
        ->assertJsonPath('data.info.birthday.san_yat_natkhat', 'ရောဟဏီ');
});

test('unauthenticated user cannot access or store astrology profile and receives 401 with login redirect', function () {
    $this->getJson('/api/v1/astrology/profile')
        ->assertStatus(401)
        ->assertJsonPath('redirect_url', '/login');

    $this->postJson('/api/v1/astrology/profile', [
        'name' => 'Guest',
        'birthday' => '2001-11-06',
        'gender' => 'female',
    ])
        ->assertStatus(401)
        ->assertJsonPath('redirect_url', '/login');
});
