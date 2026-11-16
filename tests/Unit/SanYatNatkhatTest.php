<?php

use App\Actions\CalendarAction;

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

    // Check all 12 months chronological order (0 to 11)
    $months = [
        'ကဆုန်', 'နယုန်', 'ဝါဆို', 'ဝါခေါင်', 'တော်သလင်း', 'သီတင်းကျွတ်',
        'တန်ဆောင်မုန်း', 'နတ်တော်', 'ပြာသို', 'တပို့တွဲ', 'တပေါင်း', 'တန်ခူး',
    ];
    foreach ($months as $index => $month) {
        // With လဆန်း 1 and ကရကဋ် (0 modifier), final_number = (index * 2 + 1)
        $res = $action->sanYatNatkhat($month, 'လဆန်း', 1, 'ကရကဋ်');
        expect($res['number'])->toBe($index * 2 + 1);
    }
});
