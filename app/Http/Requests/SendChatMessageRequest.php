<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SendChatMessageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'prompt' => ['required', 'string', 'max:5000'],
            'category' => ['nullable', 'string', 'in:general,health,education'],
            'conversation_id' => ['nullable', 'integer', 'exists:chat_conversations,id'],
            'language' => ['nullable', 'string', 'in:my,en'],
            'model' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * Custom attribute names for validation errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'prompt' => 'chat message',
            'category' => 'chat category',
            'conversation_id' => 'conversation ID',
        ];
    }
}
