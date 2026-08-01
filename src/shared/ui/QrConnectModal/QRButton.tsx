import "./QRButton.css"

type QREvents = {
    isConnected: boolean;
    onToggle: () => void
}
type QrIconProps = {
  size?: number;
  color?: string;
};

function QrIcon({ size = 18, color = "#fff" }: QrIconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color}>
      <path fillRule="evenodd" d="M0 0h9v9H0V0zm2 2v5h5V2H2z" />
      <rect x="3" y="3" width="3" height="3" />
      <path fillRule="evenodd" d="M15 0h9v9h-9V0zm2 2v5h5V2h-5z" />
      <rect x="18" y="3" width="3" height="3" />
      <path fillRule="evenodd" d="M0 15h9v9H0v-9zm2 2v5h5v-5H2z" />
      <rect x="3" y="18" width="3" height="3" />
      <rect x="11" y="0" width="2" height="2" />
      <rect x="11" y="4" width="2" height="4" />
      <rect x="0" y="11" width="2" height="2" />
      <rect x="4" y="11" width="4" height="2" />
      <rect x="11" y="11" width="2" height="2" />
      <rect x="15" y="11" width="3" height="2" />
      <rect x="20" y="11" width="4" height="2" />
      <rect x="11" y="15" width="2" height="3" />
      <rect x="15" y="15" width="4" height="4" />
      <rect x="22" y="15" width="2" height="2" />
      <rect x="11" y="20" width="2" height="4" />
      <rect x="15" y="21" width="2" height="3" />
      <rect x="19" y="20" width="3" height="2" />
      <rect x="22" y="22" width="2" height="2" />
    </svg>
  );
}
/**
 * 
 * @returns 白いQRボタンの画像
 */
export function QrButton({isConnected, onToggle}: QREvents) {
  return (
    <button
      className={`qr-button ${isConnected ? "is-Connected" : ""}`}
      onClick= {onToggle}
      aria-pressed={isConnected}
      aria-label="QRコードを表示"
    >
      <QrIcon />
    </button>
     
  );
}
