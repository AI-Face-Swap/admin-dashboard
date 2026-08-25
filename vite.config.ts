import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';

// When running inside Docker, the node container sets this so the dev
// server listens on the same port that is published to the host.
const dockerDevServerPort = process.env.VITE_DEV_SERVER_PORT;

// The node container has no PHP binary, so Docker overrides this with a no-op;
// Wayfinder types are then generated via the php container (`make wayfinder`).
const wayfinderCommand =
    process.env.VITE_WAYFINDER_COMMAND ?? 'php artisan wayfinder:generate';

export default defineConfig({
    server: dockerDevServerPort
        ? {
              host: true,
              port: Number(dockerDevServerPort),
              strictPort: true,
              // Browsers must reach Vite via localhost:5174, not the container IP.
              hmr: { host: 'localhost' },
          }
        : undefined,
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
            command: wayfinderCommand,
        }),
    ],
});
