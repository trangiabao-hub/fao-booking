# Prompt: Cập nhật Backend + Admin UI — Booking Analytics (SEO/Blog Attribution)

> **Ngữ cảnh:** Repo `fao-booking` (frontend) đã triển khai landing SEO/blog HTML tĩnh + attribution first-touch 30 ngày. Mọi event gửi qua API `booking-analytics` kèm `metaJson` có object `attribution`. Cần backend + trang admin để **đo hiệu quả**: traffic → catalog → đơn thanh toán (PAID) theo nguồn SEO/blog.
>
> **Tham chiếu FE:** `src/lib/bookingAnalytics.js`, `src/lib/trafficAttribution.js`, `scripts/static-site-layout.mjs` (UTM trên link `/catalog`).

---

## Mục tiêu

1. Backend lưu và chấp nhận đầy đủ event types mới (không reject).
2. API báo cáo aggregate theo `channel`, `campaign`, khoảng thời gian.
3. Trang admin (cùng khu vực `/reports/booking-live-viewers` hoặc menu Reports) hiển thị dashboard SEO/Blog conversion.

---

## Phần 1 — Backend

### 1.1 API hiện có (giữ nguyên contract ingest)

**POST** `v1/booking-analytics/events`

Body (JSON):

```json
{
  "eventType": "string",
  "path": "/catalog",
  "clientSessionId": "uuid-v4-hoặc-v_xxx",
  "deviceId": null,
  "modelKey": null,
  "deviceLabel": null,
  "metaJson": "string JSON",
  "userAgent": "Mozilla/5.0 ..."
}
```

**POST** `v1/booking-analytics/presence` — không đổi (`clientSessionId`).

- `metaJson` là **chuỗi JSON** (không phải object nested trong body).
- Nếu user đăng nhập, map `accountId` từ Bearer token như hiện tại.

### 1.2 Event types — mở rộng enum / whitelist

Đảm bảo **chấp nhận** (lưu DB) các giá trị sau:

| eventType | Mô tả | path thường gặp |
|-----------|--------|------------------|
| `PAGE_VIEW` | Xem trang SPA | mọi route |
| `CATALOG_BOOK_CLICK` | Bấm đặt máy trên catalog | `/catalog` |
| `BOOKING_CHECKOUT_START` | Mở form/checkout | `/catalog` |
| **`CONTENT_CATALOG_ENTRY`** | **Mới** — user có attribution seo/blog vào catalog | `/catalog` |
| **`BOOKING_ORDER_PAID`** | **Mới** — thanh toán PayOS thành công (PAID) | `/payment-status` |

Nếu đang dùng enum Java/Kotlin: thêm 2 giá trị trên. **Không** trả 400 khi gặp event mới.

### 1.3 Cấu trúc `metaJson` (parse khi ingest hoặc khi report)

**Mọi event** (trừ khi `includeAttribution: false` — hiếm) có dạng:

```json
{
  "attribution": {
    "channel": "seo",
    "medium": "landing",
    "campaign": "thue-may-anh-tphcm",
    "source": "fao_seo",
    "landingPath": "/thue-may-anh-tphcm/",
    "referrer": "https://www.google.com/",
    "capturedAt": "2026-05-20T08:00:00.000Z"
  },
  "orderCode": "optional — chỉ BOOKING_ORDER_PAID",
  "orderIdNew": "optional",
  "total": 450000,
  "branchId": "PHU_NHUAN",
  "deviceCount": 1,
  "source": "optional — CATALOG_BOOK_CLICK legacy",
  "step": "optional — CONTENT_CATALOG_ENTRY"
}
```

**Giá trị `channel` chuẩn:**

| channel | Ý nghĩa |
|---------|---------|
| `seo` | Landing SEO (`/thue-may-anh-*`) hoặc `utm_source=fao_seo` |
| `blog` | Bài blog (`/<slug>/`) hoặc `utm_source=fao_blog` |
| `organic` | Referrer Google/Bing… |
| `direct` | Không referrer |
| `social` | Facebook, TikTok, Zalo… |
| `referral` | Site khác |
| `paid` | UTM paid / gclid |
| `campaign` | UTM khác |

**UTM từ trang tĩnh (FE đã gắn sẵn):**

- SEO: `utm_source=fao_seo&utm_medium=landing&utm_campaign={slug}`
- Blog: `utm_source=fao_blog&utm_medium=article&utm_campaign={slug}`

**First-touch:** FE chỉ ghi đè attribution khi có UTM `fao_seo` / `fao_blog` mới hoặc hết TTL 30 ngày. Backend **không** cần tính lại — chỉ đọc `metaJson.attribution` tại thời điểm event.

### 1.4 (Khuyến nghị) Denormalize khi insert — tùy chọn nhưng tốt cho query

Thêm cột nullable trên bảng events (hoặc bảng phụ `booking_analytics_attribution`):

| Cột | Nguồn |
|-----|--------|
| `attr_channel` | `JSON_VALUE(metaJson, '$.attribution.channel')` |
| `attr_campaign` | `$.attribution.campaign` |
| `attr_landing_path` | `$.attribution.landingPath` |
| `order_code` | `$.orderCode` — chỉ PAID |
| `order_total` | `$.total` — chỉ PAID |

Index: `(event_type, created_at)`, `(attr_channel, created_at)`, `(attr_campaign)` where event_type = BOOKING_ORDER_PAID.

### 1.5 API báo cáo mới (Admin gọi)

**GET** `v1/booking-analytics/reports/content-conversion`

Query params:

| Param | Mặc định | Mô tả |
|-------|----------|--------|
| `from` | 7 ngày trước | ISO date hoặc `yyyy-MM-dd` |
| `to` | hôm nay | inclusive end of day VN `Asia/Ho_Chi_Minh` |
| `channels` | `seo,blog` | CSV filter |

**Response 200:**

```json
{
  "range": { "from": "2026-05-13", "to": "2026-05-20", "timezone": "Asia/Ho_Chi_Minh" },
  "summary": {
    "contentCatalogEntries": 120,
    "checkoutStarts": 45,
    "ordersPaid": 12,
    "ordersPaidFromSeo": 5,
    "ordersPaidFromBlog": 4,
    "revenuePaidTotal": 5400000,
    "revenuePaidSeo": 2100000,
    "revenuePaidBlog": 1800000,
    "conversionRateCatalogToPaid": 0.10
  },
  "byChannel": [
    {
      "channel": "seo",
      "catalogEntries": 80,
      "checkoutStarts": 30,
      "ordersPaid": 5,
      "revenuePaid": 2100000
    },
    {
      "channel": "blog",
      "catalogEntries": 40,
      "checkoutStarts": 15,
      "ordersPaid": 4,
      "revenuePaid": 1800000
    }
  ],
  "topCampaigns": [
    {
      "channel": "seo",
      "campaign": "thue-may-anh-tphcm",
      "landingPath": "/thue-may-anh-tphcm/",
      "catalogEntries": 25,
      "ordersPaid": 2,
      "revenuePaid": 900000
    }
  ],
  "funnel": {
    "contentCatalogEntry": 120,
    "catalogBookClick": 90,
    "checkoutStart": 45,
    "orderPaid": 12
  }
}
```

**Logic đếm (gợi ý SQL):**

- `CONTENT_CATALOG_ENTRY`: count events, filter `attr_channel IN ('seo','blog')` hoặc parse metaJson.
- `BOOKING_ORDER_PAID`: count unique `orderIdNew` hoặc `orderCode` (tránh double), `attr_channel` tại thời điểm PAID.
- `revenuePaid`: sum `order_total` trên PAID (dedupe theo order).
- `topCampaigns`: group by `attr_channel` + `attr_campaign`, sort `ordersPaid` DESC, limit 20.
- **Funnel:** count theo `clientSessionId` trong window (optional join) hoặc count raw events — document rõ trong API.

**GET** `v1/booking-analytics/reports/content-conversion/timeseries`

Query: `from`, `to`, `granularity=day|week`, `channel=seo|blog|all`

Response: mảng `{ date, catalogEntries, ordersPaid, revenuePaid }` để vẽ chart.

**Phân quyền:** Chỉ role ADMIN (giống các report khác). 401/403 nếu không đủ quyền.

### 1.6 Edge cases backend

- `metaJson` null / invalid JSON → lưu event, `attr_*` = null (không fail).
- Nhiều `BOOKING_ORDER_PAID` cùng `orderIdNew` → dedupe khi aggregate (lấy event mới nhất).
- Event PAID không có `attribution` → bucket `channel = unknown` trong report.
- Timezone báo cáo: **Asia/Ho_Chi_Minh**.

### 1.7 Test cases BE

1. POST event `BOOKING_ORDER_PAID` + metaJson có `attribution.channel=seo` → 201, query report thấy +1 đơn SEO.
2. POST `CONTENT_CATALOG_ENTRY` với channel blog → summary tăng catalogEntries blog.
3. Enum cũ vẫn nhận `PAGE_VIEW`, `CATALOG_BOOK_CLICK`.
4. Report `from`/`to` filter đúng theo VN timezone.
5. User không admin → GET report 403.

---

## Phần 2 — Admin UI

### 2.1 Vị trí & navigation

- Thêm menu: **Báo cáo** → **Hiệu quả SEO & Blog** (hoặc tab trong trang Booking Analytics hiện có).
- Route gợi ý: `/reports/booking-content-conversion` (đồng bộ pattern `/reports/booking-live-viewers`).

### 2.2 Layout màn hình

**Header**

- Title: `Hiệu quả nội dung → Đặt máy`
- Date range picker: 7d / 30d / custom (gọi API với `from`, `to`).
- Filter chips: Tất cả | SEO | Blog (map `channels` query).

**Hàng KPI cards (4–6 ô)**

| Card | Số liệu từ API |
|------|----------------|
| Vào catalog từ nội dung | `summary.contentCatalogEntries` |
| Đơn thanh toán (PAID) | `summary.ordersPaid` |
| Trong đó SEO | `summary.ordersPaidFromSeo` |
| Trong đó Blog | `summary.ordersPaidFromBlog` |
| Doanh thu PAID | `summary.revenuePaidTotal` (format VND) |
| Tỷ lệ catalog → đơn | `summary.conversionRateCatalogToPaid` % |

**Biểu đồ (line/bar)**

- Timeseries API: theo ngày — `catalogEntries` vs `ordersPaid` (2 series).
- Optional: stacked revenue SEO vs Blog.

**Bảng “Top landing / campaign”**

Cột: Kênh | Campaign (slug) | Landing | Vào catalog | Checkout | Đơn PAID | Doanh thu

Data: `topCampaigns` — sort mặc định Đơn PAID giảm dần.

**Bảng funnel (optional block)**

```
Nội dung → Catalog: 120
       → Click đặt máy: 90
       → Checkout: 45
       → Thanh toán PAID: 12
```

**Empty state:** Chưa có dữ liệu sau deploy — hướng dẫn “Cần 24–48h sau khi user truy cập landing SEO/blog”.

**Loading / error:** Skeleton + toast lỗi API.

### 2.3 UX / UI guidelines

- Dùng cùng design system admin hiện tại (card, table, date picker).
- Số tiền: `1.234.567 ₫` locale vi-VN.
- %: 1 chữ số thập phân.
- Link campaign: mở `https://faocamera.vn/{slug}` tab mới (slug blog/seo).
- Không cần realtime; refresh manual hoặc 5 phút auto-refresh optional.

### 2.4 API integration (frontend admin)

```typescript
// Ví dụ
GET /v1/booking-analytics/reports/content-conversion?from=2026-05-01&to=2026-05-20&channels=seo,blog
Authorization: Bearer <admin_token>
```

### 2.5 Test plan UI

- [ ] Chọn 7 ngày / 30 ngày → API gọi đúng params.
- [ ] Filter SEO only → chỉ hiện số SEO.
- [ ] Không data → empty state.
- [ ] Có data → KPI + bảng campaign khớp API mock.
- [ ] Mobile admin: KPI stack vertical (responsive).

---

## Phần 3 — Không nằm scope (tránh scope creep)

- Không tích hợp Google Search Console API trong phase 1.
- Không sửa repo `fao-booking` (FE đã xong).
- Không thay đổi flow PayOS — chỉ đọc event `BOOKING_ORDER_PAID` đã gửi từ FE.

---

## Phần 4 — Acceptance criteria (hoàn thành khi)

1. Deploy BE: event `BOOKING_ORDER_PAID` và `CONTENT_CATALOG_ENTRY` được lưu thành công.
2. Admin mở trang report, chọn 7 ngày, thấy KPI + bảng campaign (có thể 0 nếu chưa traffic).
3. Sau khi test flow: mở landing SEO → catalog → thanh toán PAID, trong vòng 30 ngày report tăng `ordersPaidFromSeo` ≥ 1 và đúng `campaign` slug.
4. Document API trong Swagger/OpenAPI admin (nếu có).

---

## Phần 5 — Gợi ý prompt ngắn (copy cho AI / dev)

```
Bạn là dev backend + admin FAO Manage.

Context: fao-booking đã gửi booking-analytics events kèm metaJson.attribution (channel seo|blog, campaign=slug, first-touch 30 ngày). Event mới: CONTENT_CATALOG_ENTRY, BOOKING_ORDER_PAID (meta có orderCode, orderIdNew, total).

Tasks:
1. BE: Whitelist 2 event types; parse metaJson.attribution; optional denormalize attr_channel, attr_campaign, order_total; dedupe PAID by orderIdNew.
2. BE: GET v1/booking-analytics/reports/content-conversion (+ timeseries) với from/to TZ Asia/Ho_Chi_Minh, response như spec trong docs/PROMPT-be-admin-seo-analytics.md.
3. Admin UI: Trang /reports/booking-content-conversion — KPI cards, date range, filter SEO/Blog, chart timeseries, table topCampaigns. Gọi API trên, ADMIN only.

Đọc spec đầy đủ: fao-booking/docs/PROMPT-be-admin-seo-analytics.md
Tham chiếu FE: fao-booking/src/lib/bookingAnalytics.js, trafficAttribution.js

Không đổi contract POST /events body. Test theo mục 1.7 và 2.5.
```

---

*Tạo từ repo fao-booking — đồng bộ với release SEO/blog + attribution.*
