/**
 * STUNサーバー（Googleの公開サーバー）用いてる。
 * 各ぴあはSTUNサーバーにシグナリング時に問い合わせを行う。
 */
 export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ],
};