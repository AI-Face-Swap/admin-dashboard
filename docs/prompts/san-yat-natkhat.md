# San-Yand-Nakhat (စန်းယှဉ်နက္ခတ်) Calculation & Customer Profile Field

## Goal

Implement the traditional Burmese Astrology **San-Yand-Nakhat (စန်းယှဉ်နက္ခတ်)** calculation in `CalendarAction` and persist it in the `customer_infos` table (`san_yat_natkhat` column), returning it in the Astrology Profile API and injecting it into the AI Astrology chat context.

## Requirements

1. **San-Yand-Nakhat Calculation (`CalendarAction::sanYatNatkhat`)**
   - Accept:
     - `birth_month` (string): One of the 12 Burmese months (`ကဆုန်` = 0, `နယုန်` = 1, `ဝါဆို` = 2 [including `ပဝါဆို` / `ဒုဝါဆို`], `ဝါခေါင်` = 3, `တော်သလင်း` = 4, `သီတင်းကျွတ်` = 5, `တန်ဆောင်မုန်း` = 6 [including `တန်ဆောင်းမုန်း`], `နတ်တော်` = 7, `ပြာသို` = 8, `တပို့တွဲ` = 9, `တပေါင်း` = 10, `တန်ခူး` = 11).
     - `tithi_type` (string): `"လဆန်း"` (Waxing, also normalizing `"လပြည့်"`) or `"လဆုတ်"` (Waning, also normalizing `"လကွယ်"`).
     - `tithi_day` (int): `1` to `15`.
     - `zodiac_sign` (string): One of the 12 Burmese Zodiac signs (`မိဿ`, `ပြိဿ`, `မေထုန်`, `ကရကဋ်`, `သိဟ်`, `ကန်`, `တူ`, `ဗြိစ္ဆာ`, `ဓနု`, `မကာရ`, `ကုံ`/`ကုမ်`, `မိန်` — supporting both short names and full strings from `CalendarAction::zodiac()` like `ဗြိစ္ဆာရာသီ (Scorpio)`).
   - Follow the 6-step calculation logic:
     1. `month_count` (`0` to `11`)
     2. `step2_val = month_count * 2`
     3. `tithi_value = (tithi_type === 'လဆန်း') ? tithi_day : (tithi_day + 15)`
        `step3_sum = step2_val + tithi_value`
     4. `remainder = step3_sum % 27`
     5. Apply zodiac modifier (`-1` for `မိဿ/ပြိဿ/မေထုန်`, `0` for `ကရကဋ်/သိဟ်/ကန်`, `+1` for `တူ/ဗြိစ္ဆာ/ဓနု`, `+2` for `မကာရ/ကုံ/မိန်`):
        `adjusted_val = remainder + modifier`
     6. Normalize bounds (`1` to `27`):
        - If `adjusted_val <= 0`: `final_number = adjusted_val + 27`
        - If `adjusted_val > 27`: `final_number = adjusted_val - 27`
        - Otherwise: `final_number = adjusted_val`
   - Map `final_number` (`1` to `27`) to the 27 Nakhat names (`အဿဝဏီ` through `ရေဝတီ`) and return `['number' => $finalNumber, 'name' => $nakhatName]`.
   - Include `san_yat_natkhat` in `CalendarAction::handle()` under `detail`.

2. **Database & Model (`customer_infos`)**
   - Add nullable string column `san_yat_natkhat` to `customer_infos` (via migration and updating `create_customer_infos_table.php` if appropriate).
   - Add `'san_yat_natkhat'` to `CustomerInfo::$fillable`.

3. **Astrology Profile API & AI Chat Context**
   - Update `AstrologyProfileController::store()` and `formatCustomerInfo()` to save and return `san_yat_natkhat` under `data.info.birthday.san_yat_natkhat`.
   - Update `CalendarSeeder` to populate `san_yat_natkhat` when recalculating `CustomerInfo` records.
   - Include `San-Yand-Nakhat={$info->san_yat_natkhat}` in `AIChatController` astrology profile context.

## Affected Files

- `database/migrations/2026_11_16_153000_add_san_yat_natkhat_to_customer_infos_table.php` (new migration)
- `app/Models/CustomerInfo.php`
- `app/Actions/CalendarAction.php`
- `app/Http/Controllers/Api/AstrologyProfileController.php`
- `app/Http/Controllers/Api/AIChatController.php`
- `database/seeders/CalendarSeeder.php`
- `tests/Feature/SanYatNatkhatTest.php`

## Acceptance Criteria

- `CalendarAction::sanYatNatkhat($birthMonth, $tithiType, $tithiDay, $zodiacSign)` returns `['number' => int, 'name' => string]` matching all 6 steps and boundary normalizations (`<= 0` wraps by `+27`, `> 27` wraps by `-27`).
- `customer_infos` table has the `san_yat_natkhat` column and persists the calculated value on `POST /api/v1/astrology/profile` and `GET /api/v1/astrology/profile`.
- Feature and unit tests covering the 6-step calculation, boundary cases (`remainder = 0` with `-1` modifier → `26`, `remainder = 26` with `+2` modifier → `1`), and profile endpoints pass.

## Open Questions

1. **Format stored in `customer_infos.san_yat_natkhat`**:
   - **Recommended**: Store the Nakhat name string (e.g. `"ရောဟဏီ"` or `"ရောဟဏီနက္ခတ်"`) in `customer_infos.san_yat_natkhat` to match the existing `nakhat` (`"နတ်နက္ခတ်"`), `mahabote` (`"ရာဇဖွား"`), and `day` (`"အင်္ဂါနေ့"`) string columns, while `CalendarAction::sanYatNatkhat()` returns `['number' => 4, 'name' => 'ရောဟဏီ']`. (Or let me know if you prefer `"၄ - ရောဟဏီ"` or JSON in `san_yat_natkhat`.)
