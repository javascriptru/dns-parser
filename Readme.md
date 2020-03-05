# DNS Shop Parser

1. Открыть в Chrome https://www.dns-shop.ru/
2. Сохранить Save as HAR (Export HAR, стрелка вниз сверху) в `download`.
3. Запустить `npm start` для скачивания данных в директорию `download` и дальнейшей конвертации в `data/db.json`.

В `download.js` также есть настройки:

```js
const LOAD_IMAGES = false; // загружать картинки
const CONCURRENCY = 3; // параллельно столько запросов (если много - включится защита от ДДОС)
```
