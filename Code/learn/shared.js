export let reverse = localStorage.getItem("reverse") === "true";

export function reverseMode() {
    const reverseBtn = document.getElementById("reverseBtn");

    if (!reverseBtn) return;

    reverseBtn.classList.toggle("active", reverse);
}

export function modeSwitch() {
    reverse = !reverse;

    localStorage.setItem("reverse", reverse);

    reverseMode();
}