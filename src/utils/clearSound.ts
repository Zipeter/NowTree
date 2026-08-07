// 1.0.3：一键清理（删除已完成事务）的提示音。
// 复用勾选音的全局开关（checkSound 的 isCheckSoundOn / setCheckSoundOn，
// 同一 localStorage key "nowtree_check_sound"）——设置里一个开关同时管两个音效。
import soundUrl from "../assets/audio/clear.wav";
import { isCheckSoundOn } from "./checkSound";

let audio: HTMLAudioElement | null = null;
function getAudio(): HTMLAudioElement {
  if (!audio) audio = new Audio(soundUrl);
  return audio;
}

// 在 cleanCompleted 真正删除时调用；开关关闭时静默返回。
export function playClearSound(): void {
  if (!isCheckSoundOn()) return;
  try {
    const a = getAudio();
    a.currentTime = 0; // 允许连续清理时从头播放
    void a.play();
  } catch {
    /* 忽略播放异常（如浏览器策略） */
  }
}
