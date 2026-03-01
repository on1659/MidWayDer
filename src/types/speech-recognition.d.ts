/**
 * Web Speech API — 비표준 webkit 프리픽스 타입 선언
 *
 * Safari / Chrome 구버전에서 사용되는 webkitSpeechRecognition과
 * 표준 SpeechRecognition 모두를 Window 인터페이스에 추가합니다.
 */

interface Window {
  /** Safari / Chrome 구버전 WebKit 프리픽스 SpeechRecognition */
  webkitSpeechRecognition?: typeof SpeechRecognition;
  /** 표준 SpeechRecognition (일부 브라우저에서 window 프로퍼티로만 접근 가능) */
  SpeechRecognition?: typeof SpeechRecognition;
}
