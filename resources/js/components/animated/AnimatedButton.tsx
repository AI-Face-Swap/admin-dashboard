import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { springConfig } from '@/lib/animations';

type ButtonProps = ComponentProps<typeof Button>;

export function AnimatedButton(props: ButtonProps) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={springConfig}
            style={{ display: 'inline-flex' }}
        >
            <Button {...props} />
        </motion.div>
    );
}
