import { useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { ArrowUpRight } from 'lucide-react';
import Badge from './Badge';

export const GRADIENTS = {
  revenue:     'linear-gradient(135deg, #CCFF66 0%, #E8FF99 60%, #F0FFB0 100%)',
  expense:     'linear-gradient(135deg, #FFD6C0 0%, #FFE8D6 60%, #FFF3EC 100%)',
  outstanding: 'linear-gradient(135deg, #C0E0FF 0%, #D6EEFF 60%, #EBF5FF 100%)',
  profit:      'linear-gradient(135deg, #B0F0D8 0%, #CCFFE8 60%, #E0FFF2 100%)',
  receivable:  'linear-gradient(135deg, #DDD0FF 0%, #EBE4FF 60%, #F3F0FF 100%)',
  payable:     'linear-gradient(135deg, #FFE8A0 0%, #FFF0C0 60%, #FFFAE0 100%)',
  bank:        'linear-gradient(135deg, #A8DFFF 0%, #C8EEFF 60%, #E0F5FF 100%)',
  tax:         'linear-gradient(135deg, #FFD0A0 0%, #FFE4C0 60%, #FFF0E0 100%)',
  payroll:     'linear-gradient(135deg, #FFB8D0 0%, #FFCCE0 60%, #FFE4EE 100%)',
  neutral:     'linear-gradient(135deg, #F0EDD8 0%, #F8F5E8 60%, #FDFCF5 100%)',
};

export const BORDER_COLORS = {
  revenue: '#7BC400', expense: '#FF6B4A', outstanding: '#4A90D9',
  profit: '#00B37A', receivable: '#8B5CF6', payable: '#D97706',
  bank: '#0EA5E9', tax: '#EA580C', payroll: '#E879A0', neutral: '#A89F7A',
};

/**
 * countUp prop: { end: number, prefix?: string, suffix?: string, decimals?: number, separator?: string }
 * motionProps: extra framer-motion props (e.g. entrance stagger from Dashboard)
 */
export default function StatCard({
  title, value, badge, badgeVariant = 'lime', description,
  onClick, type, className = '', countUp, motionProps = {},
}) {
  const [viewed, setViewed] = useState(false);
  const hasGradient = type && GRADIENTS[type];

  const baseStyle = hasGradient ? { background: GRADIENTS[type] } : {};
  const baseClass = hasGradient
    ? 'rounded-2xl p-5 border border-transparent shadow-sm'
    : 'bg-white rounded-2xl p-6 border border-[#EBEBEB] shadow-[0_2px_12px_rgba(0,0,0,0.06)]';

  return (
    <motion.div
      onViewportEnter={() => setViewed(true)}
      viewport={{ once: true, amount: 0.1 }}
      whileHover={{ y: -4, scale: 1.01, boxShadow: '0 12px 28px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`${baseClass} ${onClick ? 'cursor-pointer' : ''} group ${className}`}
      style={baseStyle}
      onClick={onClick}
      {...motionProps}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${hasGradient ? 'text-black/50' : 'text-[#AAAAAA]'}`}>
          {title}
        </span>
        {onClick && (
          <ArrowUpRight size={14} className="text-[#AAAAAA] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        )}
      </div>

      <div className="flex items-end gap-2.5 mb-2 flex-wrap">
        <span className="text-[26px] font-bold font-mono tracking-tight text-[#1A1A1A] leading-none">
          {countUp ? (
            viewed ? (
              <CountUp
                start={0}
                end={countUp.end || 0}
                duration={1.8}
                separator={countUp.separator ?? ','}
                prefix={countUp.prefix ?? ''}
                suffix={countUp.suffix ?? ''}
                decimals={countUp.decimals ?? 0}
                useEasing={true}
              />
            ) : (countUp.prefix ?? '') + '0'
          ) : value}
        </span>
        {badge && (
          hasGradient
            ? <span className="inline-block bg-black/10 text-[#1A1A1A] rounded-full px-3 py-0.5 text-xs font-semibold">{badge}</span>
            : <Badge variant={badgeVariant}>{badge}</Badge>
        )}
      </div>

      {description && (
        <p className={`text-[12px] leading-relaxed mt-1 ${hasGradient ? 'text-black/40' : 'text-[#AAAAAA]'}`}>
          {description}
        </p>
      )}
    </motion.div>
  );
}
