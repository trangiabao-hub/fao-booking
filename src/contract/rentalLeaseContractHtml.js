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
  <p class="mb2">Hai bên đồng ý ký kết Hợp đồng cho thuê tài sản - thuê máy ảnh (gọi tắt là "Hợp đồng") theo quy định pháp luật hiện hành, với các điều khoản sau:</p>
  <p class="mb1 mt1"><strong>ĐIỀU 1: ĐỐI TƯỢNG HỢP ĐỒNG VÀ THỜI HẠN THUÊ</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Tài sản cho thuê (máy, serial, giá trị tài sản ghi nhận bởi Bên A, giá thuê):</p>
  <div class="machine-list">${machineRowsHtml}</div>
  <p class="mb1"> &nbsp; &nbsp; 2. Tổng giá thuê: ${rentalPriceText}${rentalDaysText ? ` (${escapeHtml(rentalDaysText)})` : ""}.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Thời hạn thuê: từ <strong>${fromHour}:00 ngày ${fromDate}</strong> đến <strong>${toHour}:00 ngày ${toDate}</strong>.</p>
  <p class="mb1"> &nbsp; &nbsp; 4. Địa điểm giao/nhận tài sản: ${deliveryPlaceText}.</p>
  <p class="mb1"> &nbsp; &nbsp; 5. Giá trị từng tài sản ghi tại khoản 1 do Bên A xác định và Bên B xác nhận khi ký biên bản bàn giao; đây là căn cứ để xác định nghĩa vụ bồi thường, các khoản phạt và chi phí liên quan theo Hợp đồng, không phụ thuộc định giá thị trường, giá chào bán hoặc mua lại, mức khấu hao hay kết quả thẩm định độc lập khác, trừ khi hai bên lập văn bản sửa đổi Hợp đồng.</p>
  <p class="mb1 mt1"><strong>ĐIỀU 2: THANH TOÁN VÀ XÁC MINH ĐỊNH DANH</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Bên B thanh toán đủ tiền thuê trước hoặc đồng thời tại thời điểm nhận tài sản theo hướng dẫn của Bên A; việc nhận tài sản đồng nghĩa xác nhận đúng chủng loại, serial, hiện trạng vận hành và phụ kiện như biên bản bàn giao.</p>
  <p class="mb1"> &nbsp; &nbsp; 2. <strong>Hai bên không thỏa thuận áp dụng lãi chậm thanh toán theo Hợp đồng này.</strong> Khi Bên B chậm thanh toán hoặc chậm thực hiện nghĩa vụ tiền, Bên A được <strong>yêu cầu thanh toán ngay</strong> toàn bộ khoản còn phải trả và được <strong>áp dụng biện pháp thu hồi tài sản, khởi kiện, yêu cầu áp dụng biện pháp khẩn cấp</strong> hoặc biện pháp khác <strong>theo quy định pháp luật</strong>.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Sau khi Bên B hoàn trả đầy đủ tài sản và Bên A xác nhận nhận đủ theo biên bản, thời gian kiểm tra nội bộ của Bên A là từ hai mươi bốn (24) đến bốn mươi tám (48) giờ kể từ thời điểm Bên A xác nhận đã nhận đủ tài sản, trừ trường hợp phải kéo dài do thẩm định kỹ thuật phức tạp nhưng không quá bảy mươi hai (72) giờ kể từ cùng mốc và Bên A thông báo bằng văn bản cho Bên B. <strong>Sau khi hai bên ký biên bản bàn giao trả tài sản, Bên B xác nhận không còn khiếu nại</strong> về hiện trạng và nội dung đã ghi nhận tại biên bản, trừ trường hợp có chứng cứ về gian lận hoặc sai sót trọng yếu theo quy định pháp luật.</p>
  <p class="mb1"> &nbsp; &nbsp; 4. Bên A được chụp ảnh, sao chụp giấy tờ định danh của Bên B (CCCD, hộ chiếu hoặc giấy tờ thay thế hợp lệ theo pháp luật) và lưu trữ <strong>bản sao</strong> (điện tử hoặc giấy) nhằm xác minh danh tính và quản lý rủi ro. <strong>Bên A không giữ bản gốc</strong> CCCD, hộ chiếu hoặc giấy tờ định danh của Bên B theo nội dung Hợp đồng này, trừ khi pháp luật có quy định khác và được thể hiện bằng văn bản riêng. Bên B có nghĩa vụ xuất trình bản gốc để đối chiếu tại thời điểm giao nhận.</p>
  <p class="mb1"> &nbsp; &nbsp; 5. Bên B cung cấp thông tin định danh trung thực; Bên A được lưu trữ hồ sơ giao dịch, bản sao đã nêu tại khoản 4 và cung cấp cho cơ quan nhà nước có thẩm quyền khi được yêu cầu theo quy định pháp luật.</p>
  <p class="mb1 mt1"><strong>ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B; TRÁCH NHIỆM TUYỆT ĐỐI ĐỐI VỚI TÀI SẢN</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Bên B sử dụng tài sản đúng công năng, tự bảo quản trong suốt thời gian thuê, không tự ý tháo lắp, sửa chữa, thay thế linh kiện nếu chưa có văn bản chấp thuận của Bên A.</p>
  <p class="mb1"> &nbsp; &nbsp; 2. Bên B không được cầm cố, bán, cho thuê lại, chuyển giao, tẩu tán hoặc dùng tài sản thuê để bảo đảm nghĩa vụ khác dưới mọi hình thức.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Bên B hoàn trả tài sản đúng thời hạn và địa điểm đã thỏa thuận; gia hạn chỉ có hiệu lực khi Bên A xác nhận bằng văn bản hoặc kênh chính thức do Bên A quy định.</p>
  <p class="mb1"> &nbsp; &nbsp; 4. Khi có rủi ro, mất mát, hư hỏng hoặc sự cố liên quan tài sản, Bên B thông báo ngay cho Bên A và phối hợp xử lý theo chỉ dẫn.</p>
  <p class="mb1"> &nbsp; &nbsp; 5. Bên B chịu trách nhiệm tuyệt đối đối với tài sản thuê trong mọi trường hợp, kể cả nhưng không giới hạn: mất cắp, mất mát, hư hỏng do bên thứ ba, do sơ suất, bất cẩn của Bên B hoặc người do Bên B cho mượn hoặc cho sử dụng, hoặc do sự kiện bất khả kháng không được chứng minh theo quy định pháp luật và biên bản giao nhận. Bên B không được miễn trừ nghĩa vụ hoàn trả hoặc bồi thường bằng lý do khách quan nếu không chứng minh được đã giao trả đúng thời hạn, đúng hiện trạng cho Bên A theo biên bản.</p>
  <p class="mb1 mt1" id="dieu-4"><strong>ĐIỀU 4: VI PHẠM, BỒI THƯỜNG, PHẠT VI PHẠM VÀ CHI PHÍ PHÁT SINH</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Hư hỏng có thể khắc phục: Bên B thanh toán một trăm phần trăm (100%) chi phí sửa chữa, thay thế linh kiện, chi phí kỹ thuật và mọi chi phí hợp lý để khôi phục hiện trạng sử dụng của tài sản.</p>
  <p class="mb1"> &nbsp; &nbsp; 2. Mất tài sản, hư hỏng không thể sửa chữa, tẩu tán, thay đổi serial, chiếm giữ trái phép hoặc từ chối giao trả: Bên B phải thanh toán đồng thời (i) một trăm phần trăm (100%) giá trị tài sản theo Điều 1; (ii) toàn bộ chi phí phát sinh thực tế (thu hồi, lưu kho, thẩm định, đi lại, pháp lý, v.v.); (iii) khoản phạt vi phạm Hợp đồng tối thiểu bằng ba mươi phần trăm (30%) giá trị tài sản xác định tại Điều 1 (hoặc mức cao hơn nếu pháp luật hoặc thỏa thuận bổ sung cho phép). Các khoản trên được cộng dồn; <strong>Bên B phải thanh toán đủ ngay khi có yêu cầu của Bên A</strong>.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Quá hạn trả quá ba mươi (30) phút mà không được Bên A xác nhận gia hạn: áp dụng phí gia hạn một trăm nghìn (100.000) VND mỗi giờ (làm tròn lên theo giờ). Nếu gây lỡ lịch cho khách hàng khác của Bên A, Bên B bồi thường thêm toàn bộ thiệt hại thực tế chứng minh được.</p>
  <p class="mb1"> &nbsp; &nbsp; 4. Tổng nghĩa vụ tài chính của Bên B khi vi phạm bao gồm đồng thời: giá trị bồi thường tài sản theo Điều 1, chi phí và tổn thất phát sinh, khoản phạt vi phạm; Bên A không bắt buộc cộng dồn theo thứ tự ưu tiên cố định nếu một hành vi vi phạm đồng thời phát sinh nhiều nghĩa vụ.</p>
  <p class="mb1 mt1"><strong>ĐIỀU 5: XÁC MINH TỪ XA, CHỨNG CỨ, TRÌNH BÁO VÀ XỬ LÝ THEO QUY ĐỊNH PHÁP LUẬT</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Hai bên thống nhất bộ chứng cứ gồm: Hợp đồng, biên bản bàn giao, mã đơn, serial, dữ liệu định vị (nếu có), hình ảnh, video tại cửa hàng và trong quá trình thuê theo yêu cầu hợp lệ, lịch sử cuộc gọi, tin nhắn, email, hồ sơ thu hồi và chứng từ thanh toán. Hồ sơ này là căn cứ tham chiếu để cơ quan nhà nước có thẩm quyền (kể cả cơ quan tố tụng hình sự và Tòa án) xem xét, tiếp nhận tố giác, trình báo hoặc giải quyết tranh chấp dân sự khi Bên B không trả tài sản đúng thời hạn hoặc không thực hiện nghĩa vụ tài chính sau khi được thông báo hợp lệ.</p>
  <p class="mb1"> &nbsp; &nbsp; 2. Bên A được yêu cầu Bên B xác minh tình trạng tài sản từ xa <strong>trong khung giờ làm việc hợp lý hoặc khung giờ Bên A đã công bố</strong>, và/hoặc <strong>khi có dấu hiệu rủi ro</strong> (ví dụ: quá hạn trả, không phản hồi trong thời gian hợp lý, hoặc thông tin không nhất quán), trong phạm vi nội dung sau: video trực tiếp hoặc ghi hình, ảnh, serial, phụ kiện, vị trí thiết bị nếu có chức năng định vị. Bên A ưu tiên thông báo trước khung thời gian, hình thức xác minh và lý do (nếu có). Từ chối không có lý do chính đáng trong thời hạn Bên A ấn định hoặc cung cấp thông tin không trung thực có thể là căn cứ để Bên A áp dụng biện pháp bảo vệ quyền lợi và trình báo cơ quan có thẩm quyền khi <strong>có dấu hiệu theo quy định pháp luật</strong>, không phải là xác nhận của Bên A về việc có hay không có tội phạm.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Bên B không được dùng lý do hỏng điện thoại, mất sóng, không nhận được cuộc gọi, bận việc cá nhân hoặc lý do chủ quan khác để không trả tài sản đúng hẹn hoặc không phối hợp xác minh khi được yêu cầu hợp lệ. Nếu cần gia hạn, Bên B phải liên hệ và được Bên A xác nhận trước thời điểm hết hạn; mọi trường hợp không liên lạc được phải được chứng minh bằng chứng cứ khách quan (biên bản, xác nhận của tổ chức có thẩm quyền, v.v.). Thiếu chứng cứ, có thể xem xét để áp dụng các biện pháp bảo vệ quyền lợi theo quy định pháp luật.</p>
  <p class="mb1"> &nbsp; &nbsp; 4. Khi có căn cứ, chứng cứ cho thấy việc chiếm giữ trái phép, không hoàn trả đúng hạn, tẩu tán hoặc sử dụng trái phép tài sản, Bên A được quyền yêu cầu hoàn trả ngay và lập hồ sơ trình báo Công an hoặc cơ quan có thẩm quyền theo quy định.</p>
  <p class="mb1"> &nbsp; &nbsp; 5. Thông báo, nhắc nợ, yêu cầu xác minh được gửi qua số điện thoại, tin nhắn, Zalo hoặc địa chỉ Bên B cung cấp và được coi là đã đến sau hai mươi bốn (24) giờ kể từ lúc gửi thành công, trừ Bên B chứng minh nhận sớm hơn. Quá thời hạn không khắc phục, Bên A áp dụng mọi biện pháp thu hồi và khởi kiện.</p>
  <p class="mb1"> &nbsp; &nbsp; 6. Bên B phối hợp đầy đủ với Bên A và cơ quan có thẩm quyền, không cản trở xác minh; chấp nhận nghĩa vụ theo kết luận điều tra, bản án hoặc quyết định có hiệu lực.</p>
  <p class="mb1 mt1"><strong>ĐIỀU 6: GIẢI QUYẾT TRANH CHẤP, HIỆU LỰC VÀ QUYỀN CÔNG BỐ THÔNG TIN</strong></p>
  <p class="mb1"> &nbsp; &nbsp; 1. Tranh chấp ưu tiên thương lượng; không đạt, mỗi bên có quyền khởi kiện tại Tòa án nhân dân có thẩm quyền theo quy định pháp luật (nơi Bên A đặt trụ sở hoặc nơi phát sinh giao dịch, tùy điều kiện tố tụng).</p>
  <p class="mb1"> &nbsp; &nbsp; 2. Hợp đồng có hiệu lực kể từ khi ký hoặc kể từ thời điểm Bên B thanh toán và nhận tài sản, tùy mốc nào sớm hơn. Bên B xác nhận đã đọc, hiểu, được giải thích quyền và nghĩa vụ và tự nguyện chấp thuận toàn bộ điều khoản.</p>
  <p class="mb1"> &nbsp; &nbsp; 3. Khi Bên B vi phạm nghĩa vụ dẫn đến phải thu hồi tài sản, trình báo hoặc khởi kiện, Bên A được phép công bố thông tin vi phạm ở mức cần thiết để cảnh báo rủi ro (họ tên đầy đủ hoặc đã che một phần theo chính sách nội bộ, mô tả hành vi, thời gian, mã đơn; không công bố dữ liệu cực kỳ nhạy cảm trái luật) trên kênh nội bộ hoặc công khai, trong giới hạn pháp luật về danh dự, uy tín và bảo vệ dữ liệu cá nhân.</p>
  <div class="signature-row">
    <div class="signature-col"><p class="mt2 mb1"><strong>ĐẠI DIỆN BÊN A</strong></p><p class="mb1">(Ký và ghi rõ họ tên)</p></div>
    <div class="signature-col"><p class="mt2 mb1"><strong>ĐẠI DIỆN BÊN B</strong></p><p class="mb1">(Ký và ghi rõ họ tên)</p></div>
  </div>
</div>`;
};

/** Cân bằng độ lớn chữ khi in (~12.5pt tương đương) và mức gọn (~2 trang A4 tùy số dòng máy). */
export const RENTAL_CONTRACT_PRINT_STYLE_BLOCK = `@page{size:A4;margin:8mm 11mm 9mm 11mm;}
*{box-sizing:border-box;}
body{font-family:"Times New Roman",Times,serif;font-size:12.75px;line-height:1.37;padding:0;margin:0;color:${PRINT_NEUTRAL_BODY};display:flex;justify-content:center;}
.contract-page{width:100%;max-width:190mm;margin:0 auto;padding:0 5.5mm;padding-top:8px;padding-bottom:6px;page-break-inside:auto;page-break-after:always;}
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
  padding:0;
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
  column-gap:8px;
}
.party-row > span{
  white-space:nowrap;
}
.party-row > span:last-child{
  padding-left:8px;
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
  min-width:14px;
  margin-left:3px;
  border-bottom:0.85px dotted currentColor;
  opacity:.82;
  transform: translateY(-0.5px);
}
.machine-list{margin:2px 0 5px 14px;}
.machine-line{
  font-family:"Times New Roman",Times,serif;
  font-size:inherit;
  line-height:1.32;
  display:grid;
  grid-template-columns:29% 25% 22% 24%;
  column-gap:0;
  align-items:start;
}
.machine-col{
  display:block;
  padding-right:10px;
  white-space:nowrap;
}
.machine-name{
  white-space:normal;
  overflow-wrap:anywhere;
}
.machine-serial{
  padding-right:0;
  padding-left:12px;
}
.machine-serial .dot-fill{
  transform: translateY(-1px);
}
.centre{text-align:center;}
.underline{text-decoration:underline;text-underline-offset:1px;}
.mb1{margin-bottom:3px;}
.mb2{margin-bottom:5px;}
.mt1{margin-top:6px;}
.mt2{margin-top:8px;}
.signature-row{display:flex;justify-content:space-between;align-items:flex-start;margin-top:8px;gap:18px;page-break-inside:avoid;}
.signature-col{flex:1;min-width:0;text-align:center;}
@media print{
  html,body{
    -webkit-print-color-adjust:exact!important;
    print-color-adjust:exact!important;
  }
  body{padding:0!important;margin:0!important;font-size:12.5px!important;line-height:1.36!important;display:block!important;color:${PRINT_NEUTRAL_BODY}!important;}
  .contract-page{padding:0 5mm!important;padding-top:6px!important;padding-bottom:5px!important;}
  .customer-fixed{
    font-size:10.25px!important;
    top:0;
    right:0;
  }
  .mb1{margin-bottom:3px!important;}
  .mb2{margin-bottom:4px!important;}
  .mt1{margin-top:5px!important;}
  .mt2{margin-top:7px!important;}
  .machine-line{line-height:1.32!important;}
  .machine-list{margin:1px 0 4px 14px!important;}
  .signature-row{margin-top:6px!important;gap:14px!important;}
  .machine-line{font-size:inherit!important;}
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
