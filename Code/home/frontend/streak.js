function renderStreak() {
    const el = document.getElementById("streak");
    const streak = Number(localStorage.getItem("streak") || 0);
    if (el) el.textContent = Number.isFinite(streak) ? streak : 0;
}

function updateStreak() {
    const dailyMinutes = Number(localStorage.getItem("dailyMinutes") || 0);

    // Anzeige IMMER aktualisieren – auch wenn heute noch <10 min
    renderStreak();

    if (dailyMinutes < 10) return; // Mindestzeit für Streak

    const today = new Date().toLocaleDateString("sv-SE"); // ISO-Format: YYYY-MM-DD

    let savedDate = localStorage.getItem("dateStreak");
    let streak = Number(localStorage.getItem("streak") || 0);

    if (!savedDate) {
        // erster Start
        streak = 1;
    } else if (savedDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const y = yesterday.toLocaleDateString("sv-SE");

        streak = (savedDate === y) ? streak + 1 : 1;
    }

    // IMMER speichern (wichtig)
    localStorage.setItem("streak", streak);
    localStorage.setItem("dateStreak", today);

    // Anzeige
    renderStreak();
}

window.addEventListener("DOMContentLoaded", updateStreak);
updateStreak();
