export default function Skeleton({ className = '', rounded = 'rounded-xl' }) {
  return <div className={`skeleton ${rounded} ${className}`} />;
}
