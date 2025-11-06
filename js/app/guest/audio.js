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

    let audioEl = null;

    try {
      audioEl = new Audio(
        await cache("audio").withForceCache().get(url, progress.getAbort())
      );
      audioEl.loop = true;
      audioEl.muted = true; // Start muted
      audioEl.autoplay = false;
      audioEl.controls = false;

      progress.complete("audio");
    } catch {
      progress.invalid("audio");
      return;
    }

    let isPlay = false;
    const music = document.getElementById("button-music");

    /**
     * Play audio
     */

    const showToast = (message, duration = 3000) => {
      const existingToast = document.getElementById("audio-toast");
      if (existingToast) existingToast.remove();

      const toast = document.createElement("div");
      toast.id = "audio-toast";
      toast.className =
        "position-fixed bottom-0 start-50 translate-middle-x mb-3 alert alert-info alert-dismissible fade show";
      toast.style.cssText = "z-index: 9999; max-width: 90%; min-width: 280px;";
      toast.innerHTML = `
    <i class="fa-solid fa-music me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 200);
      }, duration);
    };
    const play = async () => {
      if (!navigator.onLine || !music) {
        return;
      }

      music.disabled = true;
      try {
        await audioEl.play();
        isPlay = true;
        music.disabled = false;
        music.innerHTML = statePlay;

        // Log tanpa alert
        console.log(
          `🎵 Audio playing (${audioEl.muted ? "muted" : "unmuted"})`
        );
      } catch (err) {
        isPlay = false;
        music.disabled = false;

        if (err.name === "NotAllowedError") {
          console.warn("⚠️ Audio blocked");
          // Optional: show subtle toast
          showToast("Tap the music button to enable sound 🎵");
        } else {
          console.error("Audio error:", err);
        }
      }
    };

    /**
     * Pause audio
     */
    const pause = () => {
      isPlay = false;
      audioEl.pause();
      music.innerHTML = statePause;
      console.log("⏸️ Audio paused");
    };

    /**
     * Toggle with unmute
     */
    const togglePlay = async () => {
      if (isPlay) {
        pause();
      } else {
        // Unmute on user click
        audioEl.muted = false;
        await play();
      }
    };

    // Listen for undangan.open
    document.addEventListener("undangan.open", () => {
      music.classList.remove("d-none");

      if (playOnOpen) {
        // Try muted autoplay immediately
        (async () => {
          try {
            await play();

            // If successful, auto-unmute after delay
            if (isPlay) {
              setTimeout(() => {
                if (isPlay && audioEl.muted) {
                  console.log("🔊 Auto-unmuting...");
                  audioEl.muted = false;
                }
              }, 1000);
            }
          } catch (err) {
            // Silent catch, user can click button manually
            console.log(
              "Audio autoplay not allowed, user can enable via button"
            );
          }
        })();
      }
    });

    // Music button
    music.addEventListener("click", togglePlay);
    music.addEventListener("offline", pause);
  };

  const init = () => {
    progress.add();
    return { load };
  };

  return { init };
})();
