document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        document.getElementById("intro").style.display = "none";
    }, 3000);

    document.querySelector("form").addEventListener("submit", function (event) {
        event.preventDefault();
        alert("Το μήνυμα στάλθηκε επιτυχώς!");
        this.reset();
    });
});
