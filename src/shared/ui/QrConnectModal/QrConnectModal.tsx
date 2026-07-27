import { QRCodeSVG } from "qrcode.react";
import "./QrConnectModal.css";


type QrConnectModalProps = {
  roomId: string;        // ★これを追加
};
  /**
   * 「次へ」ボタン押下時のコールバック。
   *
   * ============================================================
   * インフラ担当の方へ:
   * QRコード読み取りによる実際の接続処理が実装されたら、
   * この「次へ」ボタン（と onDismiss を呼ぶためだけの導線）は削除し、
   * 代わりに「スマホ側の接続が確認できたタイミング」で
   * 呼び出し元（DisplayPage）から直接ポップアップを閉じる処理を
   * 呼んでください。QrConnectModal 自体の見た目（QRコード表示、
   * 案内文、背景シャドウ）はそのまま流用できます。
   * ============================================================
   */

/**
 * アプリ起動時に表示する、スマートフォンとの接続用QRコードのポップアップ。
 *
 * 現時点ではQRコードを読み取って自動的に接続する仕組みが無いため、
 * 仮の「次へ」ボタンで手動的にポップアップを閉じられるようにしている。
 */
export function QrConnectModal({ roomId }: QrConnectModalProps) {
  const joinUrl = `${location.origin}/controller?room=${roomId}`;
  return (
    <div className="qr-connect-modal-backdrop">
      <div className="qr-connect-modal" role="dialog" aria-modal="true">
        <QRCodeSVG
          className="qr-connect-modal__qr"
          value={joinUrl}
          size={240}
        />
        <p className="qr-connect-modal__guide">
          お手持ちのスマートフォンでQRコードを読み込み、
          <br />
          アプリケーションを開始してください。
        </p>

        {/* TODO: QRコード読み取りによる接続が実装され次第、このボタンごと削除する */}
        
      </div>
    </div>
  );
}
