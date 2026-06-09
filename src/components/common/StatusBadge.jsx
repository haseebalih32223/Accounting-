import Badge from './Badge';

const statusMap = {
  paid:     { variant: 'dark',   label: 'Paid' },
  partial:  { variant: 'yellow', label: 'Partial' },
  unpaid:   { variant: 'gray',   label: 'Unpaid' },
  pending:  { variant: 'yellow', label: 'Pending' },
  filed:    { variant: 'lime',   label: 'Filed' },
  active:   { variant: 'lime',   label: 'Active' },
  inactive: { variant: 'gray',   label: 'Inactive' },
  overdue:  { variant: 'red',    label: 'Overdue' },
};

export default function StatusBadge({ status }) {
  const { variant, label } = statusMap[status] || { variant: 'gray', label: status || '—' };
  return <Badge variant={variant}>{label}</Badge>;
}
