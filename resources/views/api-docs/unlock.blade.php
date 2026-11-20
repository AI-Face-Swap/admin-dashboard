<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HTUT AI — API Docs Access</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at top, #171d33 0%, #070a14 70%);
            color: #f8fafc;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 1rem;
        }
        .card {
            width: 100%;
            max-width: 400px;
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(201, 149, 60, 0.35);
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
        }
        .badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #fae29c;
            background: rgba(201, 149, 60, 0.16);
            border: 1px solid rgba(201, 149, 60, 0.35);
            padding: 4px 10px;
            border-radius: 9999px;
            margin-bottom: 1rem;
        }
        h1 {
            margin: 0 0 0.5rem;
            font-size: 1.35rem;
            font-weight: 700;
        }
        p {
            margin: 0 0 1.5rem;
            font-size: 0.875rem;
            color: #94a3b8;
            line-height: 1.5;
        }
        label {
            display: block;
            font-size: 0.8rem;
            font-weight: 600;
            color: #cbd5e1;
            margin-bottom: 0.45rem;
        }
        input[type="password"] {
            width: 100%;
            padding: 0.7rem 0.9rem;
            border-radius: 10px;
            border: 1px solid rgba(148, 163, 184, 0.3);
            background: rgba(2, 6, 23, 0.7);
            color: #fff;
            font-size: 0.95rem;
            outline: none;
        }
        input[type="password"]:focus {
            border-color: #f0ca78;
        }
        .error {
            margin-top: 0.5rem;
            font-size: 0.8rem;
            color: #fb7185;
        }
        button {
            margin-top: 1.25rem;
            width: 100%;
            padding: 0.75rem 1rem;
            border: none;
            border-radius: 10px;
            background: linear-gradient(135deg, #f0ca78 0%, #c9953c 100%);
            color: #090d1a;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
        }
        button:hover {
            opacity: 0.94;
        }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">HTUT AI Developer Portal</span>
        <h1>API Documentation</h1>
        <p>Enter the developer access password provided by the administrator to view the REST API reference.</p>
        <form method="POST" action="{{ route('api-docs.unlock.submit') }}">
            @csrf
            <label for="password">Access Password</label>
            <input id="password" name="password" type="password" required autofocus placeholder="Enter password..." />
            @error('password')
                <div class="error">{{ $message }}</div>
            @enderror
            <button type="submit">Unlock API Docs</button>
        </form>
    </div>
</body>
</html>
