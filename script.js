document.addEventListener("DOMContentLoaded", function () {
    // Κλείσιμο του Intro μετά από 3 δευτερόλεπτα
    setTimeout(() => {
        document.getElementById("intro").style.display = "none";
    }, 3000);

    // Μήνυμα επιβεβαίωσης για τις φόρμες
    const forms = document.querySelectorAll("form");
    forms.forEach(form => {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            alert("Το μήνυμα στάλθηκε επιτυχώς!");
            this.reset();
        });
    });
});
Στάλθηκε
