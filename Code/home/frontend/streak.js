function updateStreak() {
    const dailyMinutes = Number(localStorage.getItem("dailyMinutes") || 0);
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
        const y = yesterday.toISOString().split("T")[0];

        streak = (savedDate === y) ? streak + 1 : 1;
    }

    // IMMER speichern (wichtig)
    localStorage.setItem("streak", streak);
    localStorage.setItem("dateStreak", today);

    // Anzeige
    const el = document.getElementById("streak");
    if (el) el.textContent = streak;
}

updateStreak();