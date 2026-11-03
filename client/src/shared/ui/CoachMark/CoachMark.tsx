import "./CoachMark.css";

type CoachMarkProps = {
  message: string;
  onDismiss: () => void;
};

/**
 * 初回だけパレットボタンの近くに表示する吹き出し（コーチマーク）。
 * 操作方法（長押し/タップの使い分け）を、初見のユーザーに一度だけ伝える。
 *
 * 表示・非表示のタイミング自体は useCoachMark フックが管理し、
 * このコンポーネントは見た目とタップでの手動クローズだけを担当する。
 *
 * メッセージ内の改行文字（\n）は、表示時に <br /> に変換して改行する。
 */
export function CoachMark({ message, onDismiss }: CoachMarkProps) {
  return (
    <div className="coach-mark" role="status" onClick={onDismiss}>
      <span className="coach-mark__pointer" aria-hidden="true" />
        <p className="coach-mark__message">
            {message.split("\n").map((line, index) => (
                <span key={index}>
                {line}
                <br />
                </span>
            ))}
        </p>
    </div>
  );
}