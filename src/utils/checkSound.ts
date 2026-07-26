// 0.2.0：勾选复选框的提示音（全局开关，默认开启，存于 localStorage）。
import soundUrl from "../assets/audio/checkbox-pop.wav";

const KEY = "nowtree_check_sound";

// 默认开启：localStorage 无记录或值不为 "off" 即为开启。
export function isCheckSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setCheckSoundOn(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* 忽略存储异常 */
  }
}

let audio: HTMLAudioElement | null = null;
function getAudio(): HTMLAudioElement {
  if (!audio) audio = new Audio(soundUrl);
  return audio;
}

// 在勾选 onChange 中调用；开关关闭时静默返回。无 CD（用户已确认不需要）。
export function playCheckSound(): void {
  if (!isCheckSoundOn()) return;
  try {
    const a = getAudio();
    a.currentTime = 0; // 允许快速连续勾选时从头播放
    void a.play();
  } catch {
    /* 忽略播放异常（如浏览器策略） */
  }
}
