import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type AppLogoIconProps = {
    className?: string;
};

export default function AppLogoIcon({ className }: AppLogoIconProps) {
    return (
        <motion.img
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            src="/Logo.png"
            alt="Logo"
            className={cn('h-8 w-8', className)}
        />
    );
}
