# Kurulum ve Kullanım Kılavuzu

## Hızlı Başlangıç

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Uygulamayı Başlatın
```bash
npm start
```

### 3. Test Edin
Tarayıcınızda açın: http://localhost:3000

## API Kullanımı

### Tüm Yorumları Çekmek
```bash
curl http://localhost:3000/reviews
```

### Sadece Android Yorumları
```bash
curl http://localhost:3000/reviews/android
```

### Sadece iOS Yorumları
```bash
curl http://localhost:3000/reviews/ios
```

### Uygulama Bilgilerini Çekmek
```bash
curl http://localhost:3000/app-info
```

## JavaScript ile Kullanım

```javascript
// Tüm yorumları çek
async function getAllReviews() {
  try {
    const response = await fetch('http://localhost:3000/reviews?limit=50');
    const data = await response.json();
    
    if (data.success) {
      console.log(`Toplam ${data.total_reviews} yorum bulundu`);
      console.log('Android yorumları:', data.platforms.android.count);
      console.log('iOS yorumları:', data.platforms.ios.count);
      
      // Son 5 yorumu göster
      data.combined_reviews.slice(0, 5).forEach(review => {
        console.log(`${review.platform} - ${review.rating}/5 - ${review.author}`);
        console.log(review.content.substring(0, 100) + '...\n');
      });
    }
  } catch (error) {
    console.error('Hata:', error);
  }
}

getAllReviews();
```

## PHP ile Kullanım

```php
<?php
// Tüm yorumları çek
function getAllReviews() {
    $url = 'http://localhost:3000/reviews?limit=30';
    
    $response = file_get_contents($url);
    $data = json_decode($response, true);
    
    if ($data['success']) {
        echo "Toplam " . $data['total_reviews'] . " yorum bulundu\n";
        echo "Android yorumları: " . $data['platforms']['android']['count'] . "\n";
        echo "iOS yorumları: " . $data['platforms']['ios']['count'] . "\n";
        
        // İlk 5 yorumu göster
        foreach (array_slice($data['combined_reviews'], 0, 5) as $review) {
            echo $review['platform'] . " - " . $review['rating'] . "/5 - " . $review['author'] . "\n";
            echo substr($review['content'], 0, 100) . "...\n\n";
        }
    }
}

getAllReviews();
?>
```

## Python ile Kullanım

```python
import requests
import json

def get_all_reviews():
    try:
        url = 'http://localhost:3000/reviews?limit=40'
        response = requests.get(url)
        data = response.json()
        
        if data['success']:
            print(f"Toplam {data['total_reviews']} yorum bulundu")
            print(f"Android yorumları: {data['platforms']['android']['count']}")
            print(f"iOS yorumları: {data['platforms']['ios']['count']}")
            
            # İlk 5 yorumu göster
            for review in data['combined_reviews'][:5]:
                print(f"{review['platform']} - {review['rating']}/5 - {review['author']}")
                print(f"{review['content'][:100]}...\n")
                
    except Exception as e:
        print(f"Hata: {e}")

get_all_reviews()
```

## Sorun Giderme

### Port Zaten Kullanımda
```bash
# Farklı port kullanın
PORT=3001 npm start
```

### Bağımlılık Hataları
```bash
# Cache'i temizleyin ve tekrar yükleyin
npm cache clean --force
rm -rf node_modules
npm install
```

### Test Çalıştırma
```bash
npm test
```

## Production Kullanımı

### PM2 ile Çalıştırma
```bash
npm install -g pm2
pm2 start index.js --name "koton-reviews-api"
pm2 startup
pm2 save
```

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## API Limitleri

- **Maksimum yorum/istek**: 200
- **Rate limiting**: Doğal store limitleri
- **Timeout**: 30 saniye
- **Cache**: Önerilir (production için)

## Gelişmiş Kullanım

### Sadece Yüksek Puanlı Yorumları Filtreleme
```javascript
fetch('http://localhost:3000/reviews')
  .then(response => response.json())
  .then(data => {
    const highRatedReviews = data.combined_reviews.filter(review => review.rating >= 4);
    console.log('4+ yıldızlı yorumlar:', highRatedReviews.length);
  });
```

### Platform Karşılaştırması
```javascript
fetch('http://localhost:3000/stats')
  .then(response => response.json())
  .then(data => {
    console.log('Android ortalama:', data.android.stats?.ratings);
    console.log('iOS ortalama:', data.ios.stats?.average_rating);
  });
```

Bu kılavuz ile API'yi kolayca kullanabilir ve kendi projelerinize entegre edebilirsiniz!
