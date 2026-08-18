import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { fadeIn, tweenConfig } from '@/lib/animations';

type InputProps = ComponentProps<typeof Input>;

export function AnimatedInput(props: InputProps) {
    return (
        <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={tweenConfig}
        >
            <Input {...props} />
        </motion.div>
    );
}
