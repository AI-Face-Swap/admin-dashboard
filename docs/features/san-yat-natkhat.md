# San-Yand-Nakhat (စန်းယှဉ်နက္ခတ်) Calculation & Customer Profile

## Overview

Calculates the traditional Burmese Astrology **San-Yand-Nakhat (စန်းယှဉ်နက္ခတ် — Moon Mansion / Lunar Nakshatra)** in `CalendarAction::sanYatNatkhat()` and persists it in the `customer_infos` table (`san_yat_natkhat` column).

## Calculation Steps (`CalendarAction::sanYatNatkhat`)

1. **Count Months (`month_count`)**: `0` to `11` starting from `ကဆုန်` (`0`) through `တန်ခူး` (`11`), normalizing `ပဝါဆို`/`ဒုဝါဆို` to `ဝါဆို` (`2`).
2. **Multiply by 2**: `step2_val = month_count * 2`.
3. **Add Tithi Value**:
   - `လဆန်း` (or `လပြည့်`): `tithi_value = tithi_day` (`1`–`15`)
   - `လဆုတ်` (or `လကွယ်`): `tithi_value = tithi_day + 15` (`16`–`30`)
   - `step3_sum = step2_val + tithi_value`
4. **Modulo 27**: `remainder = step3_sum % 27`.
5. **Apply Zodiac Modifier (သုဒ္ဓိပြုခြင်း)**:
   - `-1`: `မိဿ`, `ပြိဿ`, `မေထုန်`
   - `0`: `ကရကဋ်`, `သိဟ်`, `ကန်`
   - `+1`: `တူ`, `ဗြိစ္ဆာ`, `ဓနု`
   - `+2`: `မကာရ`, `ကုံ`/`ကုမ်`, `မိန်`
6. **Normalize Bounds (`1`–`27`)**:
   - `<= 0`: `+ 27`
   - `> 27`: `- 27`
7. **Map to 27 Nakhats**: Returns `['number' => int, 'name' => string]` (`1` `အဿဝဏီ` through `27` `ရေဝတီ`).

## API & Database

- **Column**: `customer_infos.san_yat_natkhat` (nullable string)
- **Endpoints**:
  - `GET /api/v1/astrology/profile` → returns `data.info.birthday.san_yat_natkhat`
  - `POST /api/v1/astrology/profile` → calculates, persists, and returns `data.info.birthday.san_yat_natkhat`
- **AI Chat Context**: `AIChatController` includes `San-Yand-Nakhat` in the user astrology profile context when `category === 'astrology'`.
