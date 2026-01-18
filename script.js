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

  
  
// Περιεχόμενο άρθρων (μπορείς να γράψεις πολύ περισσότερο HTML μέσα στα template strings)
const ARTICLE_CONTENT = {
  '1': {
    title: 'Τίτλος Άρθρου #1',
    html: `
      <p>Το περιεχόμενο του άρθρου #1…</p>
      <h4>Ενότητα</h4>
      <p>Περισσότερο κείμενο…</p>
    `
  },
  '2': {
    title: 'Τίτλος Άρθρου #2',
    html: `<p>Κείμενο για το άρθρο #2…</p>`
  },
  '3': {
    title: 'Τίτλος Άρθρου #3',
    html: `<p>Κείμενο για το άρθρο #3…</p>`
  },
  '4': {
    title: 'Τίτλος Άρθρου #4',
    html: `<p>Κείμενο για το άρθρο #4…</p>`
  }
};
``

(function initSimpleArticleModal(){
  const modal   = document.getElementById('article-modal');
  if (!modal) return;
  const overlay = modal.querySelector('.article-modal__overlay');
  const btnX    = modal.querySelector('.article-modal__close');
  const elTitle = document.getElementById('article-title');
  const elBody  = document.getElementById('article-body');

  function openArticle(id){
    const article = ARTICLE_CONTENT[id];
    if (!article) return;
    elTitle.textContent = article.title;
    elBody.innerHTML = article.html;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Delegation: click σε κάρτα
  document.querySelector('.articles-grid')?.addEventListener('click', (e)=>{
    const card = e.target.closest('.article-card');
    if (!card) return;
    const id = card.getAttribute('data-article-id');
    if (id) openArticle(id);
  });

  overlay?.addEventListener('click', closeModal);
  btnX?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e)=> {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
  });
})();

  

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
