# App Store & Google Play API - Koton Reviews

Bu API, Koton uygulamasının iOS App Store ve Google Play Store'daki Türkçe yorumlarını çekmeye yarayan bir Node.js uygulamasıdır.

## 🚀 Özellikler

- **iOS App Store** yorumları çekme (App ID: 1436987707)
- **Google Play Store** yorumları çekme (Package ID: com.koton.app)
- **Türkçe dil** desteği
- **RESTful API** endpoints
- **Paralel veri çekme** (her iki platformdan aynı anda)
- **Hata yönetimi** ve güvenli API yanıtları
- **Uygulama bilgileri** çekme (rating, yorum sayısı, vb.)

## 📱 Konfigüre Edilen Uygulama

- **Uygulama**: Koton: Giyim Alışveriş Sitesi
- **Android Package**: com.koton.app
- **iOS App ID**: 1436987707
- **Dil**: Türkçe (tr)
- **Ülke**: Türkiye (TR)

## 🛠️ Kurulum

1. **Repository'yi klonlayın:**
```bash
git clone <repository-url>
cd app-store-and-google-play-api
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Uygulamayı başlatın:**
```bash
npm start
```

Veya geliştirme modunda:
```bash
npm run dev
```

4. **Test edin:**
```bash
npm test
```

## 🌐 API Endpoints

### Ana Endpoint
- `GET /` - API bilgileri ve mevcut endpoints

### Yorum Endpoints
- `GET /reviews` - Her iki platformdan yorumları çek
- `GET /reviews/android` - Sadece Google Play yorumları
- `GET /reviews/ios` - Sadece App Store yorumları

### Bilgi Endpoints  
- `GET /app-info` - Her iki platformdan uygulama bilgileri
- `GET /stats` - Yorum istatistikleri
- `GET /health` - API sağlık kontrolü

### Query Parameters
- `limit` - Maksimum yorum sayısı (varsayılan: 100)

## 📚 Kullanım Örnekleri

### 1. Tüm yorumları çek
```bash
curl http://localhost:3000/reviews
```

### 2. Sadece 20 yorum çek
```bash
curl http://localhost:3000/reviews?limit=20
```

### 3. Sadece Android yorumları
```bash
curl http://localhost:3000/reviews/android
```

### 4. Uygulama bilgilerini çek
```bash
curl http://localhost:3000/app-info
```

## 📋 API Yanıt Formatı

### Yorum Yanıtı
```json
{
  "success": true,
  "total_reviews": 150,
  "platforms": {
    "android": {
      "success": true,
      "count": 75,
      "reviews": [
        {
          "id": "gp_1234567890_1",
          "platform": "Google Play",
          "author": "Kullanıcı Adı",
          "rating": 5,
          "date": "2024-01-15",
          "content": "Çok güzel bir uygulama...",
          "language": "tr"
        }
      ]
    },
    "ios": {
      "success": true,
      "count": 75,
      "reviews": [
        {
          "id": "as_987654321",
          "platform": "App Store",
          "author": "iOS Kullanıcı",
          "rating": 4,
          "title": "İyi uygulama",
          "content": "Beğendim ama iyileştirilebilir...",
          "date": "2024-01-14T10:30:00Z",
          "version": "1.2.3",
          "language": "tr"
        }
      ]
    }
  },
  "combined_reviews": []
}
```

### Uygulama Bilgisi Yanıtı
```json
{
  "success": true,
  "android": {
    "success": true,
    "info": {
      "name": "Koton: Giyim Alışveriş Sitesi",
      "developer": "Koton",
      "rating": "4.2",
      "reviews_count": "50.000+",
      "installs": "1.000.000+"
    }
  },
  "ios": {
    "success": true,
    "info": {
      "name": "Koton: Giyim Alışveriş Sitesi",
      "developer": "Koton Magazacilik Tekstil Sanayi ve Ticaret AŞ",
      "rating": 4.1,
      "reviews_count": 2543,
      "version": "1.2.3"
    }
  }
}
```

## 🔧 Yapılandırma

`config.js` dosyasında aşağıdaki ayarları değiştirebilirsiniz:

```javascript
const appConfig = {
  android: {
    packageId: 'com.koton.app'
  },
  ios: {
    appId: '1436987707'
  },
  settings: {
    language: 'tr',
    country: 'TR',
    maxReviews: 100
  }
};
```

## 🛡️ Hata Yönetimi

API, aşağıdaki durumlar için uygun hata mesajları döner:
- Platform erişim hataları
- Ağ bağlantı sorunları
- Geçersiz parametreler
- Rate limiting

## 📝 Teknical Detaylar

### Kullanılan Teknolojiler
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Axios** - HTTP client
- **Cheerio** - Web scraping
- **CORS** - Cross-origin resource sharing

### Veri Kaynakları
- **Google Play Store**: Web scraping ve internal API
- **Apple App Store**: iTunes RSS API

### Rate Limiting
- API'ler doğal rate limiting'e sahiptir
- Aşırı kullanımdan kaçının
- Production'da proxy/caching kullanın

## 🚨 Önemli Notlar

1. **Rate Limiting**: Store API'ler rate limiting uygular, aşırı istekten kaçının
2. **Web Scraping**: Google Play için web scraping kullanılır, HTML değişiklikleri API'yi etkileyebilir
3. **Dil Filtreleme**: Türkçe yorum filtreleme best-effort basis'dir
4. **Cache**: Production'da cache mekanizması ekleyin
5. **Legal**: Store'ların kullanım şartlarına uygun kullanın

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Destek

Sorunlar için GitHub issues kullanın veya iletişime geçin.

---

**Not**: Bu API, eğitim ve geliştirme amaçlıdır. Production kullanımı için uygun cache, security ve rate limiting mekanizmalarını ekleyin.
