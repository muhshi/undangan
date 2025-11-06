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
    const url = document.body.getAttribute("data-audio");
    if (!url) {
      progress.complete("audio", true);
      return;
    }

    /**
     * @type {HTMLAudioElement|null}
     */
    let audioEl = null;

    try {
      audioEl = new Audio(
        await cache("audio").withForceCache().get(url, progress.getAbort())
      );
      audioEl.loop = true;
      audioEl.muted = true; // ← START MUTED (bypass autoplay block)
      audioEl.autoplay = false;
      audioEl.controls = false;

      progress.complete("audio");
    } catch {
      progress.invalid("audio");
      return;
    }

    let isPlay = false;
    let userInteracted = false; // ← Track user interaction
    const music = document.getElementById("button-music");

    /**
     * @returns {Promise<void>}
     */
    const play = async () => {
      if (!navigator.onLine || !music) {
        return;
      }

      music.disabled = true;
      try {
        // Unmute if user already interacted
        if (userInteracted) {
          audioEl.muted = false;
        }

        await audioEl.play();
        isPlay = true;
        music.disabled = false;
        music.innerHTML = statePlay;
      } catch (err) {
        isPlay = false;
        music.disabled = false;

        // Only show error if not autoplay block
        if (err.name !== "NotAllowedError") {
          util.notify(err).error();
        }

        console.warn("Audio autoplay blocked. User interaction required.");
      }
    };

    /**
     * @returns {void}
     */
    const pause = () => {
      isPlay = false;
      audioEl.pause();
      music.innerHTML = statePause;
    };

    /**
     * Manual play with unmute (user interaction)
     * @returns {Promise<void>}
     */
    const playWithSound = async () => {
      userInteracted = true;
      audioEl.muted = false;
      await play();
    };

    document.addEventListener("undangan.open", () => {
      music.classList.remove("d-none");

      if (playOnOpen) {
        // Try autoplay (muted first)
        play()
          .then(() => {
            console.log("Audio started (muted)");
          })
          .catch(() => {
            console.log("Audio autoplay failed, waiting for user click");
          });
      }
    });

    music.addEventListener("offline", pause);
    music.addEventListener("click", () => {
      if (isPlay) {
        pause();
      } else {
        playWithSound(); // ← Use playWithSound for user click
      }
    });
  };

  /**
   * @returns {object}
   */
  const init = () => {
    progress.add();

    return {
      load,
    };
  };

  return {
    init,
  };
})();
