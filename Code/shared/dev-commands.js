
/* =========================================
   SYLVALEARN – DEVELOPER COMMANDS
   ========================================= */

(() => {
    const getLearnsets = () => {
        try {
            return JSON.parse(localStorage.getItem("learnsets") || "[]");
        } catch (error) {
            console.error("Lernsets konnten nicht gelesen werden:", error);
            return [];
        }
    };

    const getCurrentSet = () => {
        const sets = getLearnsets();
        const name = (localStorage.getItem("currentSetName") || "").trim();

        return sets.find(set => (set.name || "").trim() === name) || null;
    };

    // Aktives Lernset anzeigen
    window.getCurrentSet = () => {
        const set = getCurrentSet();

        if (!set) {
            console.warn("Kein aktives Lernset gefunden.");
            return null;
        }

        console.log("Aktives Lernset:", set.name);
        return set;
    };

    // Alle Lernsets anzeigen
    window.listSets = () => {
        const sets = getLearnsets();

        console.table(sets.map((set, index) => ({
            index,
            name: set.name,
            cards: Array.isArray(set.qa) ? set.qa.length : 0,
            mode: set.mode
        })));

        return sets;
    };

    // Karten des aktiven Lernsets auflisten
    window.listCards = () => {
        const set = getCurrentSet();

        if (!set) return null;

        console.table(set.qa.map((card, index) => ({
            index,
            frage: card.frage,
            antwort: card.antwort,
            sicherheit: card.sicherheit
        })));

        return set.qa;
    };

    // Einzelne Karte über Index abrufen
    window.getCard = (index) => {
        const set = getCurrentSet();

        if (!set) return null;

        if (!Number.isInteger(index) || index < 0 || index >= set.qa.length) {
            console.error("Ungültiger Kartenindex:", index);
            return null;
        }

        return set.qa[index];
    };

    // Karten suchen
    window.findCards = (keyword) => {
        const set = getCurrentSet();

        if (!set) return [];

        if (typeof keyword !== "string" || !keyword.trim()) {
            console.error("Bitte ein gültiges Keyword angeben.");
            return [];
        }

        const term = keyword.trim().toLowerCase();

        const results = set.qa
            .map((card, index) => ({ index, card }))
            .filter(({ card }) =>
                card.frage?.toLowerCase().includes(term) ||
                card.antwort?.toLowerCase().includes(term)
            );

        console.table(results.map(({ index, card }) => ({
            index,
            frage: card.frage,
            antwort: card.antwort,
            sicherheit: card.sicherheit
        })));

        return results;
    };

    // Statistiken des aktiven Lernsets
    window.getSetStats = () => {
        const set = getCurrentSet();

        if (!set) return null;

        const cards = set.qa || [];
        const total = cards.length;

        const securityCounts = cards.reduce((result, card) => {
            const key = card.sicherheit ?? "nicht gesetzt";
            result[key] = (result[key] || 0) + 1;
            return result;
        }, {});

        const stats = {
            name: set.name,
            totalCards: total,
            averageSecurity: total
                ? cards.reduce((sum, card) =>
                    sum + (Number(card.sicherheit) || 0), 0
                ) / total
                : 0,
            securityCounts
        };

        console.log("Lernset-Statistiken:", stats);
        console.table(securityCounts);

        return stats;
    };

    // Datenstruktur überprüfen
    window.validateSet = () => {
        const set = getCurrentSet();

        if (!set) return null;

        const errors = [];
        const warnings = [];

        if (!Array.isArray(set.qa)) {
            errors.push("qa ist kein Array.");
        } else {
            set.qa.forEach((card, index) => {
                if (!card || typeof card !== "object") {
                    errors.push(`Karte ${index}: Ungültiges Kartenobjekt.`);
                    return;
                }

                if (typeof card.frage !== "string" || !card.frage.trim()) {
                    errors.push(`Karte ${index}: Frage fehlt.`);
                }

                if (typeof card.antwort !== "string" || !card.antwort.trim()) {
                    errors.push(`Karte ${index}: Antwort fehlt.`);
                }

                if (
                    card.sicherheit !== undefined &&
                    !Number.isFinite(Number(card.sicherheit))
                ) {
                    warnings.push(`Karte ${index}: Ungültige Sicherheit.`);
                }
            });
        }

        console.log("Validierung:", {
            errors: errors.length,
            warnings: warnings.length
        });

        console.table(errors.map(message => ({ type: "Fehler", message })));
        console.table(warnings.map(message => ({ type: "Warnung", message })));

        return { valid: errors.length === 0, errors, warnings };
    };

    // Lernsets anhand ihres Namens suchen
    window.findSets = (keyword) => {
        if (typeof keyword !== "string" || !keyword.trim()) return [];

        const term = keyword.trim().toLowerCase();

        return getLearnsets().filter(set =>
            set.name?.toLowerCase().includes(term)
        );
    };

    // LocalStorage-Informationen
    window.getStorageInfo = () => {
        const value = localStorage.getItem("learnsets") || "[]";

        const info = {
            learnsetsBytes: new Blob([value]).size,
            learnsetsCount: getLearnsets().length,
            currentSetName: localStorage.getItem("currentSetName")
        };

        console.table(info);
        return info;
    };

    // Übersicht aller Commands
    window.help = () => {
        const commands = [
            ["getCurrentSet()", "Aktives Lernset abrufen"],
            ["listSets()", "Alle Lernsets auflisten"],
            ["listCards()", "Alle Karten auflisten"],
            ["getCard(index)", "Karte über Index abrufen"],
            ["findCard(keyword)", "Eine passende Karte suchen"],
            ["findCards(keyword)", "Alle passenden Karten suchen"],
            ["getSetStats()", "Lernset-Statistiken"],
            ["validateSet()", "Datenstruktur prüfen"],
            ["findSets(keyword)", "Lernsets suchen"],
            ["getStorageInfo()", "LocalStorage-Informationen"],
            ["help()", "Command-Übersicht"]
        ];

        console.table(commands.map(([command, description]) => ({
            command,
            description
        })));

        return commands;
    };

    console.info("SylvaLearn Developer Commands geladen. Nutze help().");
})();
