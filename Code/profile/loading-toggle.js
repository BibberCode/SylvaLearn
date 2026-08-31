let loadingScreen = localStorage.getItem("loadingScreen");

if (loadingScreen === null) {
    loadingScreen = "true";
    localStorage.setItem("loadingScreen", "true");
}

loadingScreen = loadingScreen === "true";

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("checkboxInput").checked = loadingScreen;
});

function toggleLoading() {
    const checkbox = document.getElementById("checkboxInput");

    localStorage.setItem(
        "loadingScreen",
        checkbox.checked ? "true" : "false"
    );

    console.log(
        "Loading Screen:",
        localStorage.getItem("loadingScreen")
    );
}