const variants = {
  lime:   'bg-[#B8F53A] text-[#1A1A1A]',
  dark:   'bg-[#1A1A1A] text-white',
  yellow: 'bg-[#FFD600] text-[#1A1A1A]',
  red:    'bg-[#FF4444] text-white',
  cyan:   'bg-[#4EEAFF] text-[#1A1A1A]',
  gray:   'bg-[#EBEBEB] text-[#6B6B6B]',
  orange: 'bg-orange-100 text-orange-700',
};

export default function Badge({ variant = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold leading-5 ${variants[variant] || variants.gray} ${className}`}>
      {children}
    </span>
  );
}
