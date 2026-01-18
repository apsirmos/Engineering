document.addEventListener("DOMContentLoaded", function () {
    // Κλείσιμο του Intro μετά από 3 δευτερόλεπτα
    setTimeout(() => {
        document.getElementById("intro").style.display = "none";
    }, 3000);

    // Smooth Scrolling
    document.querySelectorAll("nav ul li a").forEach(anchor => {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();
            const targetId = this.getAttribute("href").substring(1);
            document.getElementById(targetId).scrollIntoView({ behavior: "smooth" });
        });
    });

    // Μήνυμα επιβεβαίωσης για τις φόρμες
    //const forms = document.querySelectorAll("form");
    //forms.forEach(form => {
    //    form.addEventListener("submit", function (event) {
    //        event.preventDefault();
    //        alert("Το μήνυμα στάλθηκε επιτυχώς!");
    //        this.reset();
    //    });
    // });
});


