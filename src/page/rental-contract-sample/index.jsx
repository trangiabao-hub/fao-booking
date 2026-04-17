import React, { useMemo } from "react";
import dayjs from "dayjs";
import SeoMeta from "../../components/SeoMeta";
import {
  buildSingleContractPage,
  buildRentalContractDocumentHtml,
} from "../../contract/rentalLeaseContractHtml";

/** Trang mẫu hợp đồng thuê máy — /hop-dong-thue-chuan (cùng nội dung FAO timeline). */
export default function RentalContractSamplePage() {
  const srcDoc = useMemo(() => {
    const t1 = dayjs().add(1, "day").hour(9).minute(0).second(0).toISOString();
    const t2 = dayjs()
      .add(2, "day")
      .hour(20)
      .minute(30)
      .second(0)
      .toISOString();
    const page = buildSingleContractPage({
      machineName: [
        {
          name: "Máy ảnh (ví dụ minh họa — điều khoản giống hợp đồng in tại shop)",
          serial: "",
          machineValue: 18_000_000,
          rentalPrice: 400_000,
        },
      ],
      rentalPrice: 400_000,
      t1,
      t2,
      deliveryPlace: undefined,
      customerName: "",
      rentalDays: 1,
    });
    return buildRentalContractDocumentHtml([page], { autoPrint: false });
  }, []);

  return (
    <SeoMeta
      title="Hợp đồng thuê máy (mẫu)"
      description="Toàn văn điều khoản hợp đồng thuê máy ảnh FAO — tham khảo trước khi đặt."
      path="/hop-dong-thue-chuan"
    >
      <div
        style={{
          minHeight: "100vh",
          background: "#fafafa",
          padding: "12px 0 24px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 12px" }}>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 800,
              margin: "0 0 8px",
              color: "#111",
            }}
          >
            Hợp đồng thuê máy ảnh (mẫu chuẩn)
          </h1>
          <p style={{ fontSize: 13, color: "#555", margin: "0 0 14px" }}>
            Toàn văn điều khoản giống hợp đồng in tại FAO. Phần máy, giá và
            ngày bên dưới chỉ là ví dụ; đơn thật shop điền theo lịch của bạn.
          </p>
          <iframe
            title="Hợp đồng thuê máy mẫu"
            srcDoc={srcDoc}
            style={{
              width: "100%",
              minHeight: "85vh",
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "#fff",
            }}
          />
        </div>
      </div>
    </SeoMeta>
  );
}
