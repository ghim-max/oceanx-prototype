import { Link, type LinkProps } from 'react-router-dom';
import styles from './Button.module.css';

type Variant = 'dark' | 'light';
type Size = 'md' | 'sm';

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

type LinkButtonProps = {
  to: LinkProps['to'];
  variant?: Variant;
  size?: Size;
  className?: string;
} & Omit<LinkProps, 'to'>;

function cls(variant: Variant, size: Size, extra?: string) {
  return [styles.btn, styles[variant], styles[size], extra].filter(Boolean).join(' ');
}

export function Button({ variant = 'dark', size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <button className={cls(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'dark', size = 'md', className, children, ...rest }: LinkButtonProps) {
  return (
    <Link to={to} className={cls(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
