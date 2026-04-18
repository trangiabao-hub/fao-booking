/**
 * Mẫu HTML hợp đồng thuê máy — clone nội dung từ FAO staff/timeline.
 * Dùng trang /hop-dong-thue-chuan trên fao-booking.
 */
import dayjs from "dayjs";
import { formatVND } from "../utils/formatVND";
import { PRINT_NEUTRAL_BODY, PRINT_NEUTRAL_MUTED } from "../utils/printInkNeutral";

export const CONTRACT_BEN_A = {
  fullName: "Trần Phương Vy",
  cccd: "079305034054",
  address: "370/16A Bình Quới, Phường 28, Q.Bình Thạnh.",
  phone: "0901355198",
};

export const DEFAULT_DELIVERY_PLACE = "475 Huỳnh Văn Bánh, Phường Phú Nhuận";

const formatVndForContract = (amount) => {
  if (amount == null || Number.isNaN(Number(amount))) return "0";
  return formatVND(amount);
};

const formatCompactMoneyForContract = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "...";
  return `${formatVND(amount)} đ`;
};

const toDottedText = (value, totalLength = 31) => {
  const text = String(value || "").trim();
  if (!text) return ".".repeat(totalLength);
  if (text.length >= totalLength) return text;
  return `${text}${".".repeat(totalLength - text.length)}`;
};

const formatRentalDaysForContract = (days) => {
  const value = Number(days);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (Number.isInteger(value)) return `${value} ngày`;
  return `${value.toFixed(1).replace(".0", "")} ngày`;
};

const escapeHtml = (value) => {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

export const buildSingleContractPage = ({
  machineName,
  rentalPrice,
  t1,
  t2,
  deliveryPlace,
  customerName,
  rentalDays,
}) => {
  const from = dayjs(t1);
  const to = dayjs(t2);
  const contractMoment = from.isValid() ? from : dayjs();
  const fromHour = from.isValid() ? from.format("HH") : "……";
  const fromDate = from.isValid() ? from.format("DD/MM/YYYY") : "……/……/……";
  const toHour = to.isValid() ? to.format("HH") : "……";
  const toDate = to.isValid() ? to.format("DD/MM/YYYY") : "……/……/……";

  const rentalPriceText =
    typeof rentalPrice === "number" && Number.isFinite(rentalPrice)
      ? `${escapeHtml(formatVndForContract(rentalPrice))} VND`
      : "………………………..";
  const deliveryPlaceText = escapeHtml(
    String(deliveryPlace || DEFAULT_DELIVERY_PLACE),
  );
  const machineRows = Array.isArray(machineName)
    ? machineName
    : [{ name: machineName || "—", serial: "" }];
  const customerNameRaw = String(customerName || "").trim() || "Khách lẻ";
  const pickupHourLabel = contractMoment.isValid()
    ? `${contractMoment.format("H")}h`
    : "";
  const customerNameText = escapeHtml(
    pickupHourLabel ? `${customerNameRaw} (${pickupHourLabel})` : customerNameRaw,
  );
  const rentalDaysText = formatRentalDaysForContract(rentalDays);
  const machineRowsHtml = machineRows
    .map(
      (row) =>
        `<p class="mb1 machine-line">
          <span class="machine-col machine-name">- ${escapeHtml(row?.name || "—")}</span>
          <span class="machine-col machine-value">Giá trị: ${escapeHtml(
            formatCompactMoneyForContract(row?.machineValue),
          )}</span>
          <span class="machine-col machine-rent">Giá thuê: ${escapeHtml(
            formatCompactMoneyForContract(row?.rentalPrice),
          )}</span>
          <span class="machine-col machine-serial">Seri: ${escapeHtml(
            toDottedText(row?.serial, 31),
          )}</span>
        </p>`,
    )
    .join("");

  return `
<div class="contract-page">
  <div class="customer-fixed">${customerNameText}</div>
  <p class="centre mb1" style="margin-top:0;"><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p>
  <p class="centre mb1">Độc lập – Tự do – Hạnh phúc</p>
  <p class="centre mb2">---------------</p>
  <p class="centre mb2"><strong>HỢP ĐỒNG CHO THUÊ TÀI SẢN – THUÊ MÁY ẢNH</strong></p>
  <p class="mb2">Hôm nay, vào lúc ${contractMoment.format("HH")} giờ ngày ${contractMoment.format("DD")} tháng ${contractMoment.format("MM")} năm ${contractMoment.format("YYYY")} chúng tôi gồm có:</p>
  <p class="mb1"><strong>BÊN A (Bên cho thuê):</strong></p>
  <div class="party-row mb1">
    <span>Họ và Tên : ${escapeHtml(CONTRACT_BEN_A.fullName)}</span>
    <span>CCCD số: ${escapeHtml(CONTRACT_BEN_A.cccd)}</span>
  </div>
  <div class="party-row mb1">
    <span>Địa chỉ: ${escapeHtml(CONTRACT_BEN_A.address)}</span>
    <span>Điện thoại: ${escapeHtml(CONTRACT_BEN_A.phone)}</span>
  </div>
  <p class="mb1 mt1"><strong>BÊN B (Bên thuê):</strong></p>
  <div class="party-row mb1">
    <span class="fill-line">Họ và Tên:<span class="dot-fill"></span></span>
    <span class="fill-line">CCCD số:<span class="dot-fill"></span></span>
  </div>
  <div class="party-row party-row-full mb2">
    <span class="fill-line">Địa chỉ thường trú (hộ khẩu):<span class="dot-fill"></span></span>
  </div>
  <div class="party-row party-row-full mb2">
    <span class="fill-line">Địa chỉ tạm trú (Tại HCM):<span class="dot-fill"></span></span>
  </div>
  <div class="party-row party-row-equal mb2">
    <span class="fill-line">Số điện thoại:<span class="dot-fill"></span></span>
    <span class="fill-line">Số điện thoại tham chiếu:<span class="dot-fill"></span></span>
  </div>
  <p class="mb2">Hai bên đồng ý ký kết Hợp đồng cho thuê tài sản - thuê máy ảnh (gọi tắt là "Hợp đồng") theo quy định pháp luật dân sự hiện hành, với các điều khoản sau:</p>
  <p class="mb1 mt1"><strong>ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG VÀ THỜI HẠN THUÊ</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Tài sản cho thuê (máy, serial, giá trị máy, giá thuê):</p>
  <div class="machine-list">${machineRowsHtml}</div>
  <p class="mb1"> &nbsp; &nbsp; 2. Tổng giá thuê: ${rentalPriceText}${rentalDaysText ? ` (${escapeHtml(rentalDaysText)})` : ""}.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Thời hạn thuê: từ <strong>${fromHour}:00 ngày ${fromDate}</strong> đến <strong>${toHour}:00 ngày ${toDate}</strong>.</p>
  <p class="mb1"> &nbsp; &nbsp; 4. Địa điểm giao/nhận tài sản: ${deliveryPlaceText}.</p>
  <p class="mb1 mt1"><strong>ĐIỀU 2: THANH TOÁN, TIỀN CỌC VÀ HOÀN CỌC</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Bên B thanh toán tiền thuê và tiền cọc (nếu có) khi nhận tài sản; việc nhận tài sản đồng nghĩa xác nhận tài sản đúng model, đúng serial, hoạt động bình thường và đủ phụ kiện theo biên bản bàn giao.</p>
  <p class="mb1"> &nbsp; &nbsp; 2. Bên A hoàn cọc sau khi nhận lại tài sản, kiểm tra ngoại quan/chức năng và đối trừ toàn bộ khoản phát sinh theo Hợp đồng; thời gian kiểm tra tối đa 06 giờ kể từ thời điểm nhận lại tài sản.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Bên B đồng ý cung cấp và chịu trách nhiệm về tính chính xác của thông tin định danh (CCCD, số điện thoại, địa chỉ thường trú/tạm trú). Bên A được quyền lưu trữ bản chụp giấy tờ và dữ liệu giao dịch để phục vụ quản lý rủi ro, thu hồi tài sản, giải quyết tranh chấp hoặc cung cấp cho cơ quan có thẩm quyền khi được yêu cầu.</p>
  <p class="mb1 mt1"><strong>ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Bên B sử dụng tài sản đúng công năng, tự bảo quản trong suốt thời gian thuê, không tự ý tháo lắp/sửa chữa/thay thế linh kiện nếu chưa có chấp thuận của Bên A.</p>
  <p class="mb1"> &nbsp; &nbsp; 2. Bên B không được cầm cố, bán, cho thuê lại, chuyển giao, tẩu tán hoặc dùng tài sản thuê để bảo đảm cho nghĩa vụ khác dưới mọi hình thức.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Bên B cam kết hoàn trả tài sản đúng thời hạn, đúng địa điểm đã thỏa thuận; nếu có nhu cầu gia hạn phải chủ động liên hệ và chỉ được xem là gia hạn hợp lệ khi có xác nhận của Bên A.</p>
  <p class="mb1"> &nbsp; &nbsp; 4. Khi có rủi ro, mất mát, hư hỏng hoặc sự cố liên quan tài sản, Bên B phải thông báo ngay cho Bên A và phối hợp xử lý.</p>
  <p class="mb1 mt1" id="dieu-4"><strong>ĐIỀU 4: VI PHẠM, BỒI THƯỜNG VÀ PHẠT VI PHẠM</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Hư hỏng có thể sửa chữa: Bên B thanh toán 100% chi phí sửa chữa/thay thế linh kiện, chi phí kỹ thuật và các chi phí liên quan để khôi phục hiện trạng hoạt động của tài sản.</p>
  <p class="mb1"> &nbsp; &nbsp; 2. Mất tài sản, hư hỏng không thể sửa chữa, thay đổi serial hoặc chiếm giữ trái phép tài sản: Bên B bồi thường 100% giá trị máy theo Hợp đồng, cộng phạt vi phạm 30% giá trị máy và toàn bộ chi phí thu hồi/xử lý phát sinh.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Quá hạn trả quá 30 phút mà không được Bên A xác nhận gia hạn: áp dụng phí gia hạn 100.000 VND/giờ (làm tròn theo giờ). Bên A có quyền yêu cầu Bên B xác thực tình trạng tài sản qua Zalo (hình ảnh/video, serial, phụ kiện) trước khi chấp thuận gia hạn; nếu Bên B không thực hiện hoặc thực hiện không trung thực thì bị xem là vi phạm Hợp đồng. Nếu gây lỡ lịch khách sau, Bên B thanh toán thêm toàn bộ thiệt hại thực tế phát sinh.</p>
  <p class="mb1 mt1"><strong>ĐIỀU 5: CHỨNG CỨ, XỬ LÝ VI PHẠM VÀ TRÌNH BÁO CƠ QUAN CÓ THẨM QUYỀN</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Hai bên thống nhất các tài liệu/chứng cứ gồm: hợp đồng này, biên bản bàn giao, serial thiết bị, dữ liệu định vị (nếu có), hình ảnh/video tại cửa hàng, lịch sử cuộc gọi/tin nhắn và chứng từ thanh toán.</p>
  <p class="mb1"> &nbsp; &nbsp; 2. Khi có dấu hiệu chiếm giữ, tẩu tán hoặc sử dụng trái phép tài sản thuê, Bên A có quyền tạm giữ tiền cọc, yêu cầu Bên B hoàn trả ngay tài sản và lập hồ sơ trình báo Công an/phối hợp cơ quan có thẩm quyền theo quy định pháp luật.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Thông báo vi phạm được thực hiện qua số điện thoại, tin nhắn SMS, Zalo hoặc địa chỉ do Bên B cung cấp và được xem là đã nhận sau 24 giờ kể từ thời điểm gửi thành công; quá thời hạn thông báo mà Bên B không khắc phục, Bên A có quyền áp dụng biện pháp thu hồi tài sản theo quy định pháp luật.</p>
  <p class="mb1"> &nbsp; &nbsp; 4. Mọi hành vi giữ tài sản quá hạn mà không được Bên A chấp nhận đều được xem là dấu hiệu chiếm giữ, chiếm đoạt tài sản để Bên A áp dụng các biện pháp xử lý theo quy định pháp luật.</p>
  <p class="mb1"> &nbsp; &nbsp; 5. Trường hợp Bên B quá hạn trả mà không chứng minh được vị trí, tình trạng tài sản (theo yêu cầu xác thực hợp lý của Bên A) hoặc cung cấp thông tin mập mờ/không nhất quán về tài sản thuê, hành vi này được xem là có dấu hiệu chiếm giữ, tẩu tán hoặc chiếm đoạt tài sản; Bên A có quyền lập hồ sơ, trình báo Công an và chuyển toàn bộ chứng cứ cho cơ quan điều tra để xử lý theo quy định pháp luật.</p>
  <p class="mb1"> &nbsp; &nbsp; 6. Bên B cam kết phối hợp làm việc, không cản trở việc xác minh và chấp nhận nghĩa vụ bồi hoàn theo kết luận của cơ quan có thẩm quyền hoặc phán quyết có hiệu lực pháp luật.</p>
  <p class="mb1 mt1"><strong>ĐIỀU 6: GIẢI QUYẾT TRANH CHẤP VÀ HIỆU LỰC</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Tranh chấp được ưu tiên thương lượng; nếu không đạt kết quả, một trong hai bên có quyền khởi kiện tại Tòa án nhân dân có thẩm quyền nơi Bên A đặt trụ sở hoặc nơi phát sinh giao dịch theo quy định pháp luật.</p>
  <p class="mb1"> &nbsp; &nbsp; 2. Hợp đồng có hiệu lực từ thời điểm hai bên ký xác nhận hoặc từ thời điểm Bên B thanh toán/nhận tài sản (tùy thời điểm nào đến trước). Bên B xác nhận đã đọc, hiểu, được giải thích đầy đủ quyền/nghĩa vụ và tự nguyện đồng ý toàn bộ điều khoản.</p>
  <div class="signature-row">
    <div class="signature-col"><p class="mt2 mb1"><strong>ĐẠI DIỆN BÊN A</strong></p><p class="mb1">(Ký và ghi rõ họ tên)</p></div>
    <div class="signature-col"><p class="mt2 mb1"><strong>ĐẠI DIỆN BÊN B</strong></p><p class="mb1">(Ký và ghi rõ họ tên)</p></div>
  </div>
</div>`;
};

export const RENTAL_CONTRACT_PRINT_STYLE_BLOCK = `@page{size:A4;margin:10mm 14mm 12mm 14mm;}
*{box-sizing:border-box;}
body{font-family:"Times New Roman",Times,serif;font-size:12.8px;line-height:1.38;padding:0;margin:0;color:${PRINT_NEUTRAL_BODY};display:flex;justify-content:center;}
.contract-page{width:100%;max-width:190mm;margin:0 auto;padding:0 7mm;padding-top:12px;padding-bottom:8px;page-break-inside:auto;page-break-after:always;}
.contract-page{position:relative;}
.contract-page:last-child{page-break-after:auto;}
p{margin:0;}
.customer-fixed{
  position:absolute;
  top:0;
  right:0;
  font-size:10.5px;
  line-height:1.2;
  color:${PRINT_NEUTRAL_MUTED};
  font-weight:400;
  opacity:.95;
  padding:1px 0;
}
.party-row{
  display:grid;
  grid-template-columns:68% 32%;
  column-gap:0;
}
.party-row-full{
  grid-template-columns:100%;
}
.party-row-equal{
  grid-template-columns:50% 50%;
  column-gap:10px;
}
.party-row > span{
  white-space:nowrap;
}
.party-row > span:last-child{
  padding-left:10px;
}
.party-row-full > span:last-child,
.party-row-equal > span:last-child{
  padding-left:0;
}
.fill-line{
  display:flex;
  align-items:baseline;
  min-width:0;
  white-space:nowrap;
}
.dot-fill{
  flex:1;
  min-width:16px;
  margin-left:4px;
  border-bottom:0.9px dotted currentColor;
  opacity:.82;
  transform: translateY(-0.5px);
}
.machine-list{margin:3px 0 7px 18px;}
.machine-line{
  font-family:"Times New Roman",Times,serif;
  font-size:inherit;
  line-height:1.34;
  display:grid;
  grid-template-columns:29% 25% 22% 24%;
  column-gap:0;
  align-items:start;
}
.machine-col{
  display:block;
  padding-right:14px;
  white-space:nowrap;
}
.machine-name{
  white-space:normal;
  overflow-wrap:anywhere;
}
.machine-serial{
  padding-right:0;
  padding-left:18px;
}
.machine-serial .dot-fill{
  transform: translateY(-1px);
}
.centre{text-align:center;}
.underline{text-decoration:underline;text-underline-offset:1px;}
.mb1{margin-bottom:3px;}
.mb2{margin-bottom:5px;}
.mt1{margin-top:7px;}
.mt2{margin-top:10px;}
.signature-row{display:flex;justify-content:space-between;align-items:flex-start;margin-top:12px;gap:24px;}
.signature-col{flex:1;min-width:0;text-align:center;}
@media print{
  html,body{
    -webkit-print-color-adjust:exact!important;
    print-color-adjust:exact!important;
  }
  body{padding:0;margin:0;font-size:13.9px;line-height:1.58;display:block;color:${PRINT_NEUTRAL_BODY};}
  .contract-page{padding:0 7mm;padding-top:12px;padding-bottom:8px;}
  .customer-fixed{
    font-size:10px;
    top:0;
    right:0;
  }
  .mb1{margin-bottom:4px;}
  .mb2{margin-bottom:6px;}
  .mt1{margin-top:7px;}
  .mt2{margin-top:9px;}
  .machine-line{line-height:1.56;}
  .signature-row{margin-top:11px;}
  .machine-line{font-size:inherit;}
}`;

export function buildRentalContractDocumentHtml(
  pageBodies,
  { autoPrint = true, bodyExtraStyle = "" } = {},
) {
  const script = autoPrint
    ? `<script>
(function(){
  window.onload = function() {
    window.focus();
    setTimeout(function() { window.print(); }, 350);
  };
  window.onafterprint = function() { window.close(); };
})();
</script>`
    : "";
  const screenCss = autoPrint
    ? ""
    : `body{display:block!important;padding:14px 10px!important;background:#f2f2f4!important;max-width:900px;margin:0 auto!important;}`;
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Hợp đồng thuê máy ảnh — FAO</title>
<style>
${RENTAL_CONTRACT_PRINT_STYLE_BLOCK}
${screenCss ? `\n${screenCss}` : ""}
${bodyExtraStyle ? `\n${bodyExtraStyle}` : ""}
</style>
</head>
<body>
${pageBodies.join("\n")}
${script}
</body>
</html>`;
}
