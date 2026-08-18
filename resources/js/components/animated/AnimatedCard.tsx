import { motion } from 'framer-motion';
import type { ComponentProps } from 'react';
import { Card } from '@/components/ui/card';
import { slideUp, tweenConfig } from '@/lib/animations';

type CardProps = ComponentProps<typeof Card>;

export function AnimatedCard(props: CardProps) {
    return (
        <motion.div
            variants={slideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={tweenConfig}
        >
            <Card {...props} />
        </motion.div>
    );
}
