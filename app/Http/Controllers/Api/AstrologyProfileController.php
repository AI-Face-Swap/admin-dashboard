<?php

namespace App\Http\Controllers\Api;

use App\Actions\CalendarAction;
use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerInfo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AstrologyProfileController extends Controller
{
    public function show(Request $request, CalendarAction $calendarAction): JsonResponse
    {
        /** @var Customer|null $customer */
        $customer = $request->user('sanctum') ?? $request->user();

        if (! $customer) {
            return response()->json([
                'message' => 'Unauthenticated. Please log in to chat with HTUT AI.',
            ], 401);
        }

        $info = $customer->info;

        if (! $info) {
            $unclaimed = CustomerInfo::query()->whereNull('customer_id')->latest('id')->first();
            if ($unclaimed) {
                $unclaimed->update(['customer_id' => $customer->id]);
                $info = $unclaimed->fresh();
            }
        }

        if (! $info || ! $info->birthday) {
            return response()->json([
                'data' => null,
            ]);
        }

        return response()->json([
            'data' => $this->formatCustomerInfo($info, $calendarAction),
        ]);
    }

    public function store(Request $request, CalendarAction $calendarAction): JsonResponse
    {
        /** @var Customer|null $customer */
        $customer = $request->user('sanctum') ?? $request->user();

        if (! $customer) {
            return response()->json([
                'message' => 'Unauthenticated. Please log in to chat with HTUT AI.',
            ], 401);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'min:1', 'max:255'],
            'birthday' => ['required', 'date'],
            'gender' => ['required', 'string', 'in:male,female'],
        ], [
            'name.required' => 'ကျေးဇူးပြု၍ နာမည်အမှန် ဖြည့်ပေးပါ',
            'birthday.required' => 'ကျေးဇူးပြု၍ မွေးသက္ကရာဇ် ရွေးချယ်ပေးပါ',
            'gender.required' => 'ကျေးဇူးပြု၍ ကျား/မ ရွေးချယ်ပေးပါ',
        ]);

        $dob = date('Y-m-d', strtotime($validated['birthday']));
        $calendar = $calendarAction->handle($dob, $dob);
        $calendarData = json_decode(json_encode($calendar));
        $calInfo = $calendarData->info[0] ?? null;

        $dayName = $calInfo->formatted->weekday_my ?? null;
        $astroDetail = $calInfo->detail ?? null;
        $myanmarBirthday = $calInfo
            ? ($calInfo->formatted->year_my.', '.$calInfo->formatted->month_my.' '.$calInfo->formatted->day_my.' '.$calInfo->formatted->date_my)
            : null;

        $attributes = [
            'name' => trim($validated['name']),
            'birthday' => $dob,
            'day' => $dayName,
            'gender' => $validated['gender'],
            'zodiac' => $astroDetail->zodiac ?? null,
            'mahabote' => $astroDetail->mahabote ?? null,
            'nakhat' => $astroDetail->nakhat ?? null,
            'san_yat_natkhat' => $astroDetail->san_yat_natkhat ?? null,
            'myanmar_birthday' => $myanmarBirthday,
        ];

        $customerInfo = $customer->info()->updateOrCreate(
            ['customer_id' => $customer->id],
            $attributes
        );

        return response()->json([
            'data' => $this->formatCustomerInfo($customerInfo, $calendarAction),
            'message' => 'Profile updated successfully',
        ]);
    }

    protected function formatCustomerInfo(CustomerInfo $info, CalendarAction $calendarAction): array
    {
        $dob = $info->birthday ? Carbon::parse($info->birthday)->format('Y-m-d') : null;
        $myanmarBirthday = $info->myanmar_birthday;
        $nakhat = $info->nakhat;
        $sanYatNatkhat = $info->san_yat_natkhat;
        $day = $info->day;
        $zodiac = $info->zodiac;
        $mahabote = $info->mahabote;

        if ($dob) {
            $calendar = $calendarAction->handle($dob, $dob);
            $calendarData = json_decode(json_encode($calendar));
            $calInfo = $calendarData->info[0] ?? null;
            if ($calInfo) {
                $myanmarBirthday = $calInfo->formatted->year_my.', '.$calInfo->formatted->month_my.' '.$calInfo->formatted->day_my.' '.$calInfo->formatted->date_my;
                $nakhat = $calInfo->detail->nakhat ?? $nakhat;
                $sanYatNatkhat = $calInfo->detail->san_yat_natkhat ?? $sanYatNatkhat;
                $day = $calInfo->formatted->weekday_my ?? $day;
                $zodiac = $calInfo->detail->zodiac ?? $zodiac;
                $mahabote = $calInfo->detail->mahabote ?? $mahabote;

                if (
                    $info->myanmar_birthday !== $myanmarBirthday ||
                    $info->nakhat !== $nakhat ||
                    $info->san_yat_natkhat !== $sanYatNatkhat ||
                    $info->day !== $day ||
                    $info->zodiac !== $zodiac ||
                    $info->mahabote !== $mahabote
                ) {
                    $info->update([
                        'myanmar_birthday' => $myanmarBirthday,
                        'nakhat' => $nakhat,
                        'san_yat_natkhat' => $sanYatNatkhat,
                        'day' => $day,
                        'zodiac' => $zodiac,
                        'mahabote' => $mahabote,
                    ]);
                }
            }
        }

        return [
            'id' => $info->id,
            'customer_id' => $info->customer_id,
            'name' => $info->name,
            'gender' => $info->gender,
            'birthday' => $dob,
            'info' => [
                'birthday' => [
                    'date' => [
                        'en' => $info->birthday ? $calendarAction->changeNumber($info->birthday->format('j-m-Y')) : null,
                        'my' => $myanmarBirthday,
                    ],
                    'day' => $day,
                    'zodiac' => $zodiac,
                    'mahabote' => $mahabote,
                    'nakhat' => $nakhat,
                    'san_yat_natkhat' => $sanYatNatkhat,
                ],
            ],
        ];
    }
}
