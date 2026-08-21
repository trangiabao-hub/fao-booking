import React from "react";
import { BW_MIX, BW_SVG_FILTER_ID, BW_SVG_TABLES } from "../../lib/bwGrade";

/**
 * Bản SVG của grade trong bwGrade.js, để preview trên màn hình khớp với file in.
 * colorInterpolationFilters="sRGB" là bắt buộc: mặc định SVG lọc ở linearRGB,
 * để nguyên thì tone curve lệch hẳn so với bản bake bằng canvas.
 */
export default function BwGradeFilterDefs() {
  const { r, g, b } = BW_MIX;
  const mixRow = `${r} ${g} ${b} 0 0`;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        <filter id={BW_SVG_FILTER_ID} colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values={`${mixRow} ${mixRow} ${mixRow} 0 0 0 1 0`}
          />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={BW_SVG_TABLES.r} />
            <feFuncG type="table" tableValues={BW_SVG_TABLES.g} />
            <feFuncB type="table" tableValues={BW_SVG_TABLES.b} />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
