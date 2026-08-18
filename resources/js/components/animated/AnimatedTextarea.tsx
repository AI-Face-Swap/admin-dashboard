import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { fadeIn, tweenConfig } from '@/lib/animations';

type TextareaProps = ComponentProps<typeof Textarea>;

export function AnimatedTextarea(props: TextareaProps) {
    return (
        <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={tweenConfig}
        >
            <Textarea {...props} />
        </motion.div>
    );
}
