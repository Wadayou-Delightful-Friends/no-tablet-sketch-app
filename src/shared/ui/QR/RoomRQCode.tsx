import { QRCodeSVG } from "qrcode.react";

export function RoomQrCode({ roomId }: { roomId: string }) {
  const joinUrl = `${location.origin}/controller?room=${roomId}`;
  return (
    <div>
      <p>スマホでこのQRを読んでください</p>
      <QRCodeSVG value={joinUrl} size={240} />
      {/*<p>{roomId}</p>*/}
    </div>
  );
}