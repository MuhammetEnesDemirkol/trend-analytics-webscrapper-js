const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  // Puppeteer'i başlat ve tarayıcıyı aç
  const browser = await puppeteer.launch({ headless: false }); // Headless modunu devre dışı bırak
  const page = await browser.newPage(); // Yeni bir sayfa oluştur
  
  // Hedef URL'yi ziyaret et
  const url = 'https://www.trendyol.com/mahmood-rice/1121-basmati-pirinc-9-kg-p-752684261/yorumlar?boutiqueId=61&merchantId=686009';
  await page.goto(url, { waitUntil: 'networkidle2' }); // Sayfanın tamamen yüklenmesini bekle

  // Yorumları saklamak için bir Set oluştur
  let commentsSet = new Set();
  
  let previousHeight; // Önceki sayfa yüksekliğini takip etmek için bir değişken
  while (true) {
    // Sayfada mevcut yorumları çek
    let newComments = await page.evaluate(() => {
      const comments = [];
      document.querySelectorAll('div.comment').forEach(commentElement => {
        const userElement = commentElement.querySelector('div.comment-info-item'); // Kullanıcı adı elementi
        const textElement = commentElement.querySelector('div.comment-text'); // Yorum metni elementi
        const ratingElement = commentElement.querySelector('div.comment-rating'); // Yıldız sayısı elementi
        
        if (userElement && textElement && ratingElement) {
          const user = userElement.innerText; // Kullanıcı adını al
          const text = textElement.innerText; // Yorum metnini al

          // Yıldız sayısını hesapla
          const starElements = ratingElement.querySelectorAll('div.full');
          let rating = 0;
          starElements.forEach(star => {
            const width = star.style.width; // Yıldızın genişliğini al
            if (width.includes('%')) {
              rating += parseInt(width) / 100; // Yıldız sayısını hesapla
            }
          });
          
          comments.push({ user, text, rating: Math.round(rating) }); // Yorumları diziye ekle
        }
      });
      return comments; // Yeni yorumları döndür
    });
    
    // Yeni yorumları Set'e ekle
    newComments.forEach(comment => {
      const uniqueIdentifier = `${comment.user}::${comment.text}::${comment.rating}`; // Benzersiz bir tanımlayıcı oluştur
      commentsSet.add(uniqueIdentifier); // Set'e ekle
    });

    // Sayfayı küçük adımlarla aşağı kaydır
    previousHeight = await page.evaluate('document.body.scrollHeight'); // Sayfanın mevcut yüksekliğini al
    for (let i = 0; i < previousHeight; i += 100) { // Sayfayı 100 piksel adımlarla kaydır
      await page.evaluate(`window.scrollTo(0, ${i})`); // Sayfayı kaydır
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms bekle
    }

    // Yeni yükseklikle eski yüksekliği karşılaştır
    let newHeight = await page.evaluate('document.body.scrollHeight'); // Yeni sayfa yüksekliğini al
    if (newHeight === previousHeight) {
      break; // Eğer yükseklik değişmediyse, döngüden çık
    }
  }

  // Yorumları bir dosyaya yaz
  const commentsArray = Array.from(commentsSet).map((comment, index) => {
    const [user, text, rating] = comment.split('::'); // Benzersiz tanımlayıcıyı parçala
    return `${index + 1}) ${user} - ${rating} stars\n\n"${text}"`; // Formatlı yorum satırı oluştur
  });
  const formattedComments = commentsArray.join('\n\n'); // Yorumları birleştir
  fs.writeFileSync('comments_output.txt', formattedComments, 'utf-8'); // Yorumları dosyaya yaz

  console.log(`Toplam ${commentsArray.length} yorum çekildi.`); // Toplam yorum sayısını yazdır

  await browser.close(); // Tarayıcıyı kapat
})();
