<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class SocialLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_token' => ['nullable', 'string'],
            'access_token' => ['nullable', 'string'],
            'token' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'id_token.string' => 'The id_token must be a valid string.',
            'access_token.string' => 'The access_token must be a valid string.',
            'token.string' => 'The token must be a valid string.',
        ];
    }
}
