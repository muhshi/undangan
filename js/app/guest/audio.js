import { progress } from "./progress.js";
import { util } from "../../common/util.js";
import { cache } from "../../connection/cache.js";

export const audio = (() => {
  const statePlay = '<i class="fa-solid fa-circle-pause spin-button"></i>';
  const statePause = '<i class="fa-solid fa-circle-play"></i>';

  /**
   * @param {boolean} [playOnOpen=true]
   * @returns {Promise<void>}
   */
  const load = async (playOnOpen = true) => {
    console.log("🔇 [audio.js] Load called, but DISABLED for debugging");

    const url = document.body.getAttribute("data-audio");
    console.log("🔇 [audio.js] data-audio URL:", url);

    if (!url) {
      console.log("🔇 [audio.js] No audio URL, completing progress");
      progress.complete("audio", true);
      return;
    }

    // DISABLE SEMUA LOGIC AUDIO
    console.log("🔇 [audio.js] Audio loading DISABLED for debugging");
    progress.complete("audio", true);

    // Hide music button
    const music = document.getElementById("button-music");
    if (music) {
      music.classList.add("d-none");
      console.log("🔇 [audio.js] Music button hidden");
    }

    return; // STOP DI SINI

    // --- CODE BELOW NOT EXECUTED ---
    let audioEl = null;

    try {
      audioEl = new Audio(
        await cache("audio").withForceCache().get(url, progress.getAbort())
      );
      audioEl.loop = true;
      audioEl.muted = true;
      audioEl.autoplay = false;
      audioEl.controls = false;

      progress.complete("audio");
    } catch {
      progress.invalid("audio");
      return;
    }

    // ... rest of code not executed ...
  };

  const init = () => {
    console.log("🔇 [audio.js] Init called");
    progress.add();
    return { load };
  };

  return { init };
})();
