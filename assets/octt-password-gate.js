(function () {
  "use strict";

  var STORAGE_KEY = "octt-password-gate-v1";
  var PASSWORD_HASH = "f1264c35714597b7253fb818ea33627ed15b9ceacbb859a6327453afd277cd49";
  var LOCKED_CLASS = "octt-password-locked";
  var UNLOCKED_CLASS = "octt-password-unlocked";

  function getStoredAccess() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return null;
    }
  }

  function setStoredAccess() {
    try {
      window.localStorage.setItem(STORAGE_KEY, PASSWORD_HASH);
    } catch (error) {
      // Browsers with blocked storage still unlock for the current page load.
    }
  }

  function setLockedState(isLocked) {
    document.documentElement.classList.toggle(LOCKED_CLASS, isLocked);
    document.documentElement.classList.toggle(UNLOCKED_CLASS, !isLocked);
  }

  function toHex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function sha256(value) {
    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
      return Promise.reject(new Error("Password verification is unavailable in this browser."));
    }

    return window.crypto.subtle.digest(
      "SHA-256",
      new window.TextEncoder().encode(value)
    ).then(toHex);
  }

  function unlock() {
    var gate = document.getElementById("octt-password-gate");

    setStoredAccess();
    setLockedState(false);

    if (gate) {
      gate.remove();
    }
  }

  function showError(message) {
    var error = document.querySelector("#octt-password-gate .octt-password-error");

    if (error) {
      error.textContent = message;
    }
  }

  function buildGate() {
    var existingGate = document.getElementById("octt-password-gate");

    if (existingGate || getStoredAccess() === PASSWORD_HASH) {
      if (getStoredAccess() === PASSWORD_HASH) {
        setLockedState(false);
      }
      return;
    }

    var gate = document.createElement("div");
    gate.id = "octt-password-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-label", "Password required");
    gate.innerHTML = [
      '<div class="octt-password-card">',
      '  <div class="octt-password-lock" aria-hidden="true"></div>',
      '  <form class="octt-password-form">',
      '    <div class="octt-password-input-row">',
      '      <input class="octt-password-input" name="password" type="password" placeholder="Password" autocomplete="current-password" required>',
      '      <button class="octt-password-submit" type="submit" aria-label="Submit password"></button>',
      '    </div>',
      '    <p class="octt-password-error" aria-live="polite"></p>',
      '  </form>',
      '</div>'
    ].join("");

    document.body.appendChild(gate);

    var form = gate.querySelector(".octt-password-form");
    var input = gate.querySelector(".octt-password-input");
    var button = gate.querySelector(".octt-password-submit");

    window.setTimeout(function () {
      input.focus();
    }, 0);

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      showError("");
      button.disabled = true;

      sha256(input.value).then(function (hash) {
        if (hash === PASSWORD_HASH) {
          unlock();
          return;
        }

        input.value = "";
        input.focus();
        showError("Incorrect password.");
      }).catch(function () {
        showError("Password verification is unavailable in this browser.");
      }).finally(function () {
        button.disabled = false;
      });
    });
  }

  if (getStoredAccess() === PASSWORD_HASH) {
    setLockedState(false);
    return;
  }

  setLockedState(true);

  if (document.body) {
    buildGate();
  } else {
    document.addEventListener("DOMContentLoaded", buildGate, { once: true });
  }
}());
