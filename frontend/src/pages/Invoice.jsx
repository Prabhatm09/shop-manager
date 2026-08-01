import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, MessageCircle, Printer, Share2, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";
import LoadingState from "../components/LoadingState";
import getBillNumber from "../utils/billNumber";

const Invoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("shop_user") || "{}");
  const shopName = storedUser?.shopName || "RM Trader";
  const shopPhone = storedUser?.shopPhone || "";
  const shopAddress = storedUser?.shopAddress || "Lucknow, Uttar Pradesh";

  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [billPreview, setBillPreview] = useState({
    open: false,
    imageUrl: "",
    blob: null,
    loading: false,
    error: "",
  });
  const [billLanguage, setBillLanguage] = useState("en");

  const billLanguageOptions = [
    { value: "en", label: "English" },
    { value: "hi", label: "हिंदी" },
  ];

  const fetchOrder = useCallback(async () => {
    try {
      const res = await API.get(`/orders/${id}`);
      const loadedOrder = res.data.order;
      const customerId =
        typeof loadedOrder.customer === "object"
          ? loadedOrder.customer?._id
          : loadedOrder.customer;

      if (!customerId) {
        setOrder(loadedOrder);
        return;
      }

      try {
        const customerRes = await API.get(`/customers/${customerId}`);
        const ledgerOrder = (customerRes.data.orders || []).find(
          (entry) => entry._id === loadedOrder._id
        );

        setOrder({
          ...loadedOrder,
          ledger: ledgerOrder?.ledger || null,
        });
      } catch {
        setOrder(loadedOrder);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load invoice");
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    return () => {
      if (billPreview.imageUrl) {
        URL.revokeObjectURL(billPreview.imageUrl);
      }
    };
  }, [billPreview.imageUrl]);

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (amount) => `Rs. ${Number(amount || 0).toFixed(2)}`;

  const getBillLabels = (language = "en") => {
    if (language === "hi") {
      return {
        estimate: "अनुमान",
        copy: "ग्राहक कॉपी",
        sideCopy: "बिल कॉपी",
        supplierType: "बिल्डिंग मटेरियल सप्लायर",
        billNo: "बिल नं:",
        date: "दिनांक:",
        to: "नाम:",
        materialGiven: "दिया गया माल",
        serial: "क्र.",
        product: "विवरण",
        rate: "रेट",
        qty: "मात्रा",
        amount: "रकम",
        noItems: "कोई सामान नहीं",
        materialReturned: "वापस आया माल",
        returnFormula: "वापसी क्रेडिट मजदूरी काटकर जोड़ा गया है",
        returnItem: "वापस माल",
        labour: "मजदूरी",
        credit: "क्रेडिट",
        materialGivenTotal: "दिया माल",
        materialReturnedTotal: "वापस माल",
        returnLabour: "वापसी मजदूरी",
        returnCredit: "वापसी क्रेडिट",
        labourCharge: "मजदूरी चार्ज",
        lateCharge: "लेट चार्ज",
        previousDue: "पुराना बकाया",
        previousAdvance: "पुराना एडवांस",
        totalBill: "कुल बिल",
        paidNow: "अभी जमा",
        remaining: "बाकी",
        due: "बकाया",
        customerAdvance: "ग्राहक एडवांस",
        refund: "रिफंड",
        note: "नोट",
        checked: "माल चेक किया",
        signature: "हस्ताक्षर",
        thanks: "धन्यवाद",
        thisBill: "इस बिल",
        returned: "वापस",
      };
    }

    return {
      estimate: "ESTIMATE",
      copy: "ORIGINAL CUSTOMER COPY",
      sideCopy: "estimate copy",
      supplierType: "Building Material Supplier",
      billNo: "Bill No:",
      date: "Date:",
      to: "To,",
      materialGiven: "MATERIAL GIVEN",
      serial: "Sl",
      product: "DETAILS",
      rate: "RATE",
      qty: "QTY",
      amount: "AMOUNT",
      noItems: "No items found",
      materialReturned: "MATERIAL RETURNED",
      returnFormula: "Return credit is added after labour deduction",
      returnItem: "RETURN DETAILS",
      labour: "LABOUR",
      credit: "CREDIT",
      materialGivenTotal: "Material Given",
      materialReturnedTotal: "Material Returned",
      returnLabour: "Return Labour",
      returnCredit: "Return Credit",
      labourCharge: "Labour Charge",
      lateCharge: "Late Charge",
      previousDue: "Previous Due",
      previousAdvance: "Previous Advance",
      totalBill: "Total Bill",
      paidNow: "Paid Now",
      remaining: "Remaining",
      due: "Due",
      customerAdvance: "Customer Advance",
      refund: "Refund",
      note: "NOTE",
      checked: "Checked and packed",
      signature: "Authorised Signature",
      thanks: "Thank you for your business",
      thisBill: "This Bill",
      returned: "Returned",
    };
  };

  const translateBillUnit = (unit, language = "en") => {
    if (language !== "hi") return unit;

    const unitMap = {
      bag: "बोरी",
      bags: "बोरी",
      "half bag": "आधी बोरी",
      kg: "किलो",
      feet: "फीट",
      foot: "फीट",
      piece: "पीस",
      pieces: "पीस",
      pcs: "पीस",
      trolley: "ट्रॉली",
    };

    return unitMap[String(unit || "").toLowerCase()] || unit;
  };

  const escapeXml = (value) => {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  };

  const normalizePhoneForWhatsapp = (phone) => {
    const digits = String(phone || "").replace(/\D/g, "");

    if (digits.length === 10) return `91${digits}`;
    if (digits.length > 10) return digits;

    return "";
  };

  const isSameAmount = (left, right) => {
    return Math.abs(Number(left || 0) - Number(right || 0)) < 0.01;
  };

  const getReturnEntries = (billOrder) =>
    (billOrder?.adjustments || []).filter((entry) => entry.type === "return");

  const getReturnSummary = (billOrder) => {
    const returns = getReturnEntries(billOrder);

    return returns.reduce(
      (summary, entry) => {
        const gross =
          Number(entry.quantity || 0) * Number(entry.returnRate || 0);
        const labour = Number(entry.labourCharge || 0);
        const credit = Number(entry.amount || 0);

        return {
          gross: summary.gross + gross,
          labour: summary.labour + labour,
          credit: summary.credit + credit,
        };
      },
      { gross: 0, labour: 0, credit: 0 }
    );
  };

  const getLedgerSummary = (billOrder) => {
    const ledger = billOrder?.ledger || {};
    const previousDue = Number(ledger.previousDue || 0);
    const previousAdvance = Number(ledger.previousAdvance || 0);
    const thisBill = Number(ledger.newBill ?? billOrder?.subTotal ?? 0);
    const paidNow = Number(ledger.paidNow ?? billOrder?.paidAmount ?? 0);
    const totalPayable = Number(
      ledger.totalPayable ?? Math.max(thisBill + previousDue - previousAdvance, 0)
    );
    const balanceAfterOrder = Number(
      ledger.balanceAfterOrder ??
        previousDue +
          thisBill -
          previousAdvance -
          paidNow
    );
    const currentDue = Number(
      ledger.dueAfterOrder ?? Math.max(balanceAfterOrder, 0)
    );
    const currentAdvance = Number(
      ledger.advanceAfterOrder ?? Math.max(Math.abs(balanceAfterOrder), 0)
    );

    return {
      previousDue,
      previousAdvance,
      thisBill,
      paidNow,
      totalPayable,
      currentDue,
      currentAdvance: balanceAfterOrder < 0 ? currentAdvance : 0,
      hasLedgerContext: previousDue > 0 || previousAdvance > 0,
    };
  };

  const getBillValidationError = (billOrder) => {
    if (!billOrder) return "Order is not ready";
    if (!billOrder.customerName?.trim()) {
      return "Customer name is missing";
    }

    const phoneDigits = String(billOrder.customerPhone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits === "0000000000") {
      return "Customer mobile number is required before sharing bill";
    }

    if (!Array.isArray(billOrder.items) || billOrder.items.length === 0) {
      return "Bill needs at least one item";
    }

    for (const item of billOrder.items) {
      const quantity = Number(item.quantity);
      const pricePerUnit = Number(item.pricePerUnit);
      const lineTotal = Number(item.total);

      if (!item.productName?.trim()) return "One bill item is missing a product name";
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return `Invalid quantity for ${item.productName}`;
      }
      if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
        return `Invalid rate for ${item.productName}`;
      }
      if (!Number.isFinite(lineTotal) || lineTotal < 0) {
        return `Invalid amount for ${item.productName}`;
      }
      if (!isSameAmount(lineTotal, quantity * pricePerUnit)) {
        return `${item.productName} amount does not match quantity and rate`;
      }
    }

    const itemTotal = billOrder.items.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0
    );
    const deliveryCharge = Number(billOrder.deliveryCharge || 0);
    const lateCharge = Number(billOrder.lateCharge || 0);
    const returnTotal = getReturnEntries(billOrder).reduce(
      (sum, entry) => sum + Number(entry.amount || 0),
      0
    );
    const billTotal = Number(billOrder.subTotal);
    const paidAmount = Number(billOrder.paidAmount || 0);
    const billDueAmount = Number(billOrder.dueAmount || 0);
    const ledgerSummary = getLedgerSummary(billOrder);
    const dueAmount = ledgerSummary.hasLedgerContext
      ? ledgerSummary.currentDue
      : billDueAmount;

    if (
      ![
        deliveryCharge,
        lateCharge,
        billTotal,
        paidAmount,
        billDueAmount,
        dueAmount,
        ledgerSummary.totalPayable,
      ].every(Number.isFinite)
    ) {
      return "Bill totals are not valid";
    }
    if (deliveryCharge < 0 || lateCharge < 0) {
      return "Labour charges cannot be negative";
    }
    if (
      !isSameAmount(
        billTotal,
        itemTotal + deliveryCharge + lateCharge - returnTotal
      )
    ) {
      return "Bill total does not match item total and charges";
    }
    if (paidAmount < 0) {
      return "Paid amount is not valid for this bill";
    }

    const expectedDue = ledgerSummary.hasLedgerContext
      ? Math.max(ledgerSummary.totalPayable - paidAmount, 0)
      : Math.max(billTotal - paidAmount, 0);

    if (!isSameAmount(dueAmount, expectedDue)) {
      return "Due amount does not match bill total and paid amount";
    }

    if (billOrder.orderType === "rental") {
      if (!billOrder.rentalStartDate || !billOrder.rentalEndDate) {
        return "Rental dates are missing";
      }
      if (new Date(billOrder.rentalEndDate) < new Date(billOrder.rentalStartDate)) {
        return "Rental return date is before start date";
      }
    }

    return "";
  };

  const wrapText = (text, maxChars) => {
    const words = String(text || "").split(" ");
    const lines = [];
    let current = "";

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;

      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) lines.push(current);

    return lines.length ? lines : ["-"];
  };

  const createBillSvg = (billOrder, language = billLanguage) => {
    const labels = getBillLabels(language);
    const items = billOrder.items || [];
    const itemTotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const deliveryCharge = Number(billOrder.deliveryCharge || 0);
    const lateCharge = Number(billOrder.lateCharge || 0);
    const ledgerSummary = getLedgerSummary(billOrder);
    const returns = getReturnEntries(billOrder);
    const returnSummary = getReturnSummary(billOrder);
    const visibleRows = Math.max(items.length + (returns.length ? 0 : 2), 1);
    const width = 620;
    const rowHeight = 44;
    const billNo = getBillNumber(billOrder);
    const date = new Date(billOrder.createdAt || Date.now()).toLocaleDateString("en-IN");
    const address = billOrder.deliveryAddress || billOrder.customer?.address || "-";
    const customerNameLines = wrapText(billOrder.customerName || "-", 34).slice(0, 2);
    const customerAddressLines = wrapText(
      `${billOrder.customerPhone || "-"} | ${address}`,
      64
    ).slice(0, 2);
    const customerStartY = 232;
    const customerAddressY = customerStartY + customerNameLines.length * 20 + 8;
    const tableTop = customerAddressY + customerAddressLines.length * 16 + 34;
    const tableHeight = 44 + visibleRows * rowHeight;
    const returnsTop = tableTop + tableHeight + 38;
    const returnRowHeight = 34;
    const returnsHeight = returns.length ? 40 + returns.length * returnRowHeight : 0;
    const totalsTop = returns.length
      ? returnsTop + returnsHeight + 24
      : tableTop + tableHeight + 24;
    const showPreviousAdvance = ledgerSummary.previousAdvance > 0;
    const summaryRows = [
      {
        label: "Material Given",
        amount: itemTotal,
        color: "#101827",
        strong: false,
      },
      ...(returnSummary.gross > 0
        ? [
            {
              label: "Material Returned",
              amount: -returnSummary.gross,
              color: "#0b6b3a",
              strong: false,
            },
            {
              label: "Return Labour",
              amount: returnSummary.labour,
              color: "#b45309",
              strong: false,
            },
            {
              label: "Return Credit",
              amount: -returnSummary.credit,
              color: "#0b6b3a",
              strong: true,
            },
          ]
        : []),
      ...(deliveryCharge > 0
        ? [
            {
              label: "Labour Charge",
              amount: deliveryCharge,
              color: "#101827",
              strong: false,
            },
          ]
        : []),
      ...(lateCharge > 0
        ? [
            {
              label: "Late Charge",
              amount: lateCharge,
              color: "#101827",
              strong: false,
            },
          ]
        : []),
      ...(ledgerSummary.hasLedgerContext
        ? [
            {
              label: "Previous Due",
              amount: ledgerSummary.previousDue,
              color: "#b45309",
              strong: false,
            },
            ...(showPreviousAdvance
              ? [
                  {
                    label: "Previous Advance",
                    amount: -ledgerSummary.previousAdvance,
                    color: "#0b6b3a",
                    strong: false,
                  },
                ]
              : []),
          ]
        : []),
    ];
    const totalLineY = totalsTop + 30 * summaryRows.length + 12;
    const billTotalY = totalLineY + 30;
    const paidY = billTotalY + 30;
    const dueY = paidY + 30;
    const notesY = dueY + 42;
    const notesHeight = billOrder.notes ? 58 : 0;
    const height = notesY + notesHeight + 112;

    const itemRows = items.length
      ? items
      .map((item, index) => {
        const y = tableTop + 44 + index * rowHeight;
        const itemDetail = `${item.quantity} ${translateBillUnit(item.selectedUnit || item.unit, language)} ${item.productName}`;
        const itemLines = wrapText(itemDetail, 34).slice(0, 2);
        const itemText = itemLines
          .map(
            (line, lineIndex) =>
              `<text x="112" y="${y + 26 + lineIndex * 14}" class="cell item-name">${escapeXml(line)}</text>`
          )
          .join("");

        return `
          <text x="74" y="${y + 27}" text-anchor="middle" class="cell serial">${index + 1}</text>
          ${itemText}
          <text x="560" y="${y + 27}" text-anchor="end" class="cell strong">${formatMoney(item.total).replace("Rs. ", "")}</text>
        `;
      })
      .join("")
      : `
        <text x="310" y="${tableTop + 86}" text-anchor="middle" class="cell muted">${labels.noItems}</text>
      `;

    const tableLines = Array.from({ length: visibleRows + 1 }, (_, index) => {
      const y = tableTop + 44 + index * rowHeight;
      return `<line x1="52" y1="${y}" x2="568" y2="${y}" class="grid"/>`;
    }).join("");

    const dueAmount = ledgerSummary.hasLedgerContext
      ? ledgerSummary.currentDue
      : Number(billOrder.dueAmount || 0);
    const totalBillAmount = ledgerSummary.hasLedgerContext
      ? ledgerSummary.totalPayable
      : Number(billOrder.subTotal || 0);
    const refundAmount = Math.max(
      Number(billOrder.paidAmount || 0) - totalBillAmount,
      0
    );
    const advanceAmount = ledgerSummary.hasLedgerContext
      ? ledgerSummary.currentAdvance
      : 0;
    const dueColor = dueAmount > 0 ? "#b42318" : "#0b6b3a";
    const returnRows = returns
      .map((entry, index) => {
        const y = returnsTop + 40 + index * returnRowHeight;
        const returnDateSource =
          entry.createdAt || billOrder.createdAt || billOrder.updatedAt;
        const returnDate = returnDateSource
          ? new Date(returnDateSource).toLocaleDateString("en-IN")
          : "-";
        const returnDetail = `${entry.quantity || ""} ${translateBillUnit(entry.unit || "", language)} ${entry.productName || "Return"}`;

        return `
          <text x="52" y="${y + 22}" class="small">${escapeXml(returnDate)}</text>
          <text x="144" y="${y + 22}" class="cell item-name">${escapeXml(entry.productName || "Return")}</text>
          <text x="326" y="${y + 22}" text-anchor="end" class="cell">${formatMoney(entry.returnRate || 0).replace("Rs. ", "")}</text>
          <text x="390" y="${y + 22}" text-anchor="middle" class="cell">${escapeXml(entry.quantity || "")} ${escapeXml(entry.unit || "")}</text>
          <text x="474" y="${y + 22}" text-anchor="end" class="cell">${formatMoney(entry.labourCharge || 0).replace("Rs. ", "")}</text>
          <text x="560" y="${y + 22}" text-anchor="end" class="cell strong">${formatMoney(entry.amount).replace("Rs. ", "")}</text>
        `;
      })
      .join("");

    const returnLines = returns.length
      ? Array.from({ length: returns.length + 1 }, (_, index) => {
        const y = returnsTop + 40 + index * returnRowHeight;
        return `<line x1="52" y1="${y}" x2="568" y2="${y}" class="grid"/>`;
      }).join("")
      : "";

    const customerNameText = customerNameLines
      .map(
        (line, index) =>
          `<text x="82" y="${customerStartY + index * 20}" class="body">${escapeXml(line)}</text>`
      )
      .join("");
    const customerAddressText = customerAddressLines
      .map(
        (line, index) =>
          `<text x="52" y="${customerAddressY + index * 16}" class="small">${escapeXml(line)}</text>`
      )
      .join("");

    const summaryTextRows = summaryRows
      .map((row, index) => {
        const y = totalsTop + index * 30;
        const amount = row.amount < 0 ? `-${formatMoney(Math.abs(row.amount))}` : formatMoney(row.amount);
        const className = row.strong ? "body strong" : "body";

        return `
          <text x="342" y="${y}" class="${className}" style="fill:${row.color}">${row.label}</text>
          <text x="560" y="${y}" text-anchor="end" class="${className}" style="fill:${row.color}">${amount}</text>
        `;
      })
      .join("");

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <defs>
          <filter id="paperNoise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="12" result="noise"/>
            <feColorMatrix type="saturate" values="0"/>
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.045"/>
            </feComponentTransfer>
          </filter>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#1f2937" flood-opacity="0.13"/>
          </filter>
          <pattern id="ruled" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 11.5 H12" stroke="#eef0e8" stroke-width="0.7"/>
          </pattern>
        </defs>
        <style>
          .shop { font: 900 27px Arial, sans-serif; fill: #1f3768; letter-spacing: 0.1px; }
          .estimate { font: 900 13px Arial, sans-serif; fill: #f7faf5; letter-spacing: 1.8px; }
          .label { font: 900 12.5px Arial, sans-serif; fill: #2b4778; letter-spacing: 1.2px; }
          .body { font: 700 15.2px Arial, sans-serif; fill: #27364f; }
          .small { font: 650 12.2px Arial, sans-serif; fill: #526176; }
          .tiny { font: 700 9.5px Arial, sans-serif; fill: #6f7d91; letter-spacing: 0.55px; }
          .cell { font: 700 13.6px Arial, sans-serif; fill: #253247; }
          .item-name { font-weight: 900; fill: #182235; }
          .serial { fill: #4d5b70; }
          .head { font: 800 11px Arial, sans-serif; fill: #334155; letter-spacing: 0.9px; }
          .strong { font-weight: 900; fill: #142034; }
          .muted { fill: #667085; }
          .grid { stroke: #536070; stroke-width: 0.75; opacity: 0.78; }
          .paper-edge { stroke: #d8dfdc; stroke-width: 1; }
          .side-brand { font: 900 20px Arial, sans-serif; fill: #244574; letter-spacing: 1.2px; }
          .side-small { font: 700 12px Arial, sans-serif; fill: #6a7690; }
          .logo-dot { fill: #294778; opacity: 0.94; }
        </style>

        <rect width="${width}" height="${height}" fill="#e9eef4"/>
        <path d="M28 18 H592 V${height - 26} Q592 ${height - 10} 576 ${height - 10} H44 Q28 ${height - 10} 28 ${height - 26} Z" fill="#eef4f0" filter="url(#softShadow)" opacity="0.6"/>
        <path d="M38 20 H582 V${height - 32} Q582 ${height - 20} 570 ${height - 20} H50 Q38 ${height - 20} 38 ${height - 32} Z" fill="#fbfdf7" class="paper-edge"/>
        <path d="M38 20 C50 25 56 15 68 20 C80 25 86 15 98 20 C110 25 116 15 128 20 C140 25 146 15 158 20 C170 25 176 15 188 20 C200 25 206 15 218 20 C230 25 236 15 248 20 C260 25 266 15 278 20 C290 25 296 15 308 20 C320 25 326 15 338 20 C350 25 356 15 368 20 C380 25 386 15 398 20 C410 25 416 15 428 20 C440 25 446 15 458 20 C470 25 476 15 488 20 C500 25 506 15 518 20 C530 25 536 15 548 20 C560 25 570 20 582 20" fill="#e9eef4"/>
        <rect x="38" y="24" width="544" height="${height - 58}" fill="url(#ruled)" opacity="0.25"/>
        <rect x="38" y="24" width="544" height="${height - 58}" filter="url(#paperNoise)"/>

        <g transform="translate(54 52)">
          <rect x="0" y="0" width="12" height="12" rx="3" class="logo-dot"/>
          <rect x="16" y="0" width="12" height="12" rx="3" class="logo-dot"/>
          <rect x="32" y="0" width="12" height="12" rx="3" class="logo-dot"/>
          <rect x="0" y="16" width="12" height="12" rx="3" class="logo-dot"/>
          <rect x="16" y="16" width="12" height="12" rx="3" class="logo-dot"/>
          <rect x="32" y="16" width="12" height="12" rx="3" class="logo-dot"/>
        </g>
        <text x="76" y="${height - 176}" class="side-brand" transform="rotate(-90 76 ${height - 176})">${escapeXml(shopName).slice(0, 22)}</text>
        <text x="88" y="${height - 176}" class="side-small" transform="rotate(-90 88 ${height - 176})">estimate copy</text>

        <rect x="250" y="56" width="120" height="30" rx="2" fill="#244574"/>
        <text x="310" y="70" text-anchor="middle" class="estimate">ESTIMATE</text>

        <text x="310" y="120" text-anchor="middle" class="shop">${escapeXml(shopName)}</text>
        <text x="310" y="143" text-anchor="middle" class="small">Building Material Supplier</text>
        <text x="310" y="162" text-anchor="middle" class="small">${escapeXml(shopPhone ? `${shopAddress} | ${shopPhone}` : shopAddress).slice(0, 72)}</text>
        <line x1="118" y1="184" x2="568" y2="184" stroke="#a7b1bb" stroke-dasharray="5 7"/>

        <text x="52" y="208" class="small">Bill No: </text>
        <text x="104" y="208" class="body strong">${billNo}</text>
        <text x="568" y="208" text-anchor="end" class="body strong">Date: ${date}</text>

        <text x="52" y="${customerStartY}" class="small">To,</text>
        <line x1="82" y1="${customerStartY + 5}" x2="568" y2="${customerStartY + 5}" stroke="#8f98a6" stroke-dasharray="7 6"/>
        ${customerNameText}
        ${customerAddressText}

        <text x="52" y="${tableTop - 12}" class="label">MATERIAL GIVEN</text>
        <rect x="52" y="${tableTop}" width="516" height="${tableHeight}" fill="#fffef8" stroke="#334155" stroke-width="1.35"/>
        <rect x="52" y="${tableTop}" width="516" height="44" fill="#f3f4eb" opacity="0.8"/>
        <line x1="96" y1="${tableTop}" x2="96" y2="${tableTop + tableHeight}" class="grid"/>
        <line x1="318" y1="${tableTop}" x2="318" y2="${tableTop + tableHeight}" class="grid"/>
        <line x1="398" y1="${tableTop}" x2="398" y2="${tableTop + tableHeight}" class="grid"/>
        <line x1="482" y1="${tableTop}" x2="482" y2="${tableTop + tableHeight}" class="grid"/>
        <line x1="52" y1="${tableTop + 44}" x2="568" y2="${tableTop + 44}" class="grid"/>
        ${tableLines}

        <text x="74" y="${tableTop + 28}" text-anchor="middle" class="head">Sl</text>
        <text x="207" y="${tableTop + 28}" text-anchor="middle" class="head">PRODUCT</text>
        <text x="357" y="${tableTop + 28}" text-anchor="middle" class="head">RATE</text>
        <text x="441" y="${tableTop + 28}" text-anchor="middle" class="head">QTY</text>
        <text x="534" y="${tableTop + 28}" text-anchor="middle" class="head">AMOUNT</text>

        ${itemRows}

        ${
          returns.length
            ? `
        <text x="52" y="${returnsTop - 12}" class="label">MATERIAL RETURNED</text>
        <text x="568" y="${returnsTop - 12}" text-anchor="end" class="small">Credit = wapas qty x rate - return labour</text>
        <rect x="52" y="${returnsTop}" width="516" height="${returnsHeight}" fill="#fffef8" stroke="#202a33" stroke-width="1.2"/>
        <line x1="116" y1="${returnsTop}" x2="116" y2="${returnsTop + returnsHeight}" class="grid"/>
        <line x1="398" y1="${returnsTop}" x2="398" y2="${returnsTop + returnsHeight}" class="grid"/>
        <line x1="492" y1="${returnsTop}" x2="492" y2="${returnsTop + returnsHeight}" class="grid"/>
        <line x1="52" y1="${returnsTop + 40}" x2="568" y2="${returnsTop + 40}" class="grid"/>
        ${returnLines}
        <text x="76" y="${returnsTop + 25}" text-anchor="middle" class="head">DATE</text>
        <text x="196" y="${returnsTop + 25}" text-anchor="middle" class="head">WAPAS ITEM</text>
        <text x="310" y="${returnsTop + 25}" text-anchor="middle" class="head">RATE</text>
        <text x="389" y="${returnsTop + 25}" text-anchor="middle" class="head">QTY</text>
        <text x="463" y="${returnsTop + 25}" text-anchor="middle" class="head">LABOUR</text>
        <text x="538" y="${returnsTop + 25}" text-anchor="middle" class="head">CREDIT</text>
        ${returnRows}
        `
            : ""
        }

        ${summaryTextRows}
        <line x1="332" y1="${totalLineY}" x2="570" y2="${totalLineY}" stroke="#202a33"/>
        <text x="342" y="${billTotalY}" class="body strong">Total Bill</text>
        <text x="560" y="${billTotalY}" text-anchor="end" class="body strong">${formatMoney(totalBillAmount)}</text>
        <text x="342" y="${paidY}" class="body">Paid Now</text>
        <text x="560" y="${paidY}" text-anchor="end" class="body strong">${formatMoney(billOrder.paidAmount)}</text>
        <text x="342" y="${dueY}" class="body strong" style="fill:${dueColor}">${ledgerSummary.hasLedgerContext ? "Remaining" : "Due"}</text>
        <text x="560" y="${dueY}" text-anchor="end" class="body strong" style="fill:${dueColor}">${formatMoney(dueAmount)}</text>
        ${
          advanceAmount > 0
            ? `<text x="342" y="${dueY + 30}" class="body strong" style="fill:#0b6b3a">Customer Advance</text>
               <text x="560" y="${dueY + 30}" text-anchor="end" class="body strong" style="fill:#0b6b3a">${formatMoney(advanceAmount)}</text>`
            : refundAmount > 0
            ? `<text x="342" y="${dueY + 30}" class="body strong" style="fill:#b45309">Refund</text>
               <text x="560" y="${dueY + 30}" text-anchor="end" class="body strong" style="fill:#b45309">${formatMoney(refundAmount)}</text>`
            : ""
        }

        ${
          billOrder.notes
            ? `<text x="52" y="${notesY}" class="label">NOTE</text>
               <line x1="100" y1="${notesY - 4}" x2="568" y2="${notesY - 4}" stroke="#667085" stroke-dasharray="6 6"/>
               <text x="104" y="${notesY - 10}" class="small">${escapeXml(billOrder.notes).slice(0, 72)}</text>`
            : ""
        }

        <rect x="58" y="${height - 96}" width="172" height="46" rx="4" fill="none" stroke="#d3c7ad" stroke-dasharray="5 5"/>
        <text x="144" y="${height - 69}" text-anchor="middle" class="tiny">Checked and packed</text>
        <line x1="394" y1="${height - 82}" x2="552" y2="${height - 82}" stroke="#8f98a6"/>
        <text x="473" y="${height - 60}" text-anchor="middle" class="small">Authorised Signature</text>
        <text x="310" y="${height - 30}" text-anchor="middle" class="small">Thank you for your business</text>
      </svg>
    `;
  };

  const generateBillImage = async (language = billLanguage) => {
    if (!order) return null;

    const validationError = getBillValidationError(order);
    if (validationError) {
      throw new Error(validationError);
    }

    const svg = createBillSvg(order, language);
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const image = new Image();
      image.decoding = "async";

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = svgUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = image.width * 2;
      canvas.height = image.height * 2;
      const context = canvas.getContext("2d");
      context.fillStyle = "#f7f1df";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(2, 2);
      context.drawImage(image, 0, 0);

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png", 0.95);
      });

      if (!blob) {
        throw new Error("Canvas export failed");
      }

      const imageUrl = URL.createObjectURL(blob);

      return { blob, imageUrl };
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  const openBillPreview = async (language = billLanguage) => {
    try {
      const validationError = getBillValidationError(order);
      if (validationError) {
        setBillPreview({
          open: true,
          imageUrl: "",
          blob: null,
          loading: false,
          error: validationError,
        });
        return;
      }

      if (billPreview.imageUrl) {
        URL.revokeObjectURL(billPreview.imageUrl);
      }

      setBillPreview({
        open: true,
        imageUrl: "",
        blob: null,
        loading: true,
        error: "",
      });

      const result = await generateBillImage(language);

      if (!result) {
        throw new Error("Order is not ready");
      }

      setBillPreview({
        open: true,
        imageUrl: result.imageUrl,
        blob: result.blob,
        loading: false,
        error: "",
      });
    } catch (error) {
      setBillPreview({
        open: true,
        imageUrl: "",
        blob: null,
        loading: false,
        error: error.message || "Bill image generation failed",
      });
    }
  };

  const handleBillLanguageChange = async (language) => {
    setBillLanguage(language);

    if (billPreview.open) {
      await openBillPreview(language);
    }
  };

  const closeBillPreview = () => {
    if (billPreview.imageUrl) {
      URL.revokeObjectURL(billPreview.imageUrl);
    }

    setBillPreview({
      open: false,
      imageUrl: "",
      blob: null,
      loading: false,
      error: "",
    });
  };

  const downloadBillImage = () => {
    if (!billPreview.imageUrl || !order) return;

    const link = document.createElement("a");
    link.href = billPreview.imageUrl;
    link.download = `rm-trader-bill-${getBillNumber(order)}-${billLanguage}.png`;
    link.click();
  };

  const shareBill = async () => {
    if (!order || !billPreview.blob) return;
    const ledgerSummary = getLedgerSummary(order);
    const returnLines = getReturnEntries(order).map((entry) => {
      const grossReturn =
        Number(entry.quantity || 0) * Number(entry.returnRate || 0);

      return `Returned: ${entry.productName} ${entry.quantity} ${entry.unit} x ${formatMoney(entry.returnRate)} = ${formatMoney(grossReturn)}, return labour ${formatMoney(entry.labourCharge)}, credit ${formatMoney(entry.amount)}`;
    });

    const file = new File(
      [billPreview.blob],
      `rm-trader-bill-${getBillNumber(order)}-${billLanguage}.png`,
      { type: "image/png" }
    );

    const shareText = [
      `${shopName} Bill ${getBillNumber(order)}`,
      `This Bill: ${formatMoney(order.subTotal)}`,
      ...returnLines,
      ledgerSummary.hasLedgerContext
        ? `Previous Due: ${formatMoney(ledgerSummary.previousDue)}`
        : "",
      ledgerSummary.previousAdvance > 0
        ? `Previous Advance: ${formatMoney(ledgerSummary.previousAdvance)}`
        : "",
      ledgerSummary.hasLedgerContext
        ? `Total Bill: ${formatMoney(ledgerSummary.totalPayable)}`
        : "",
      `Paid Now: ${formatMoney(order.paidAmount)}`,
      ledgerSummary.hasLedgerContext
        ? ledgerSummary.currentAdvance > 0
          ? `Customer Advance: ${formatMoney(ledgerSummary.currentAdvance)}`
          : `Remaining: ${formatMoney(ledgerSummary.currentDue)}`
        : `Due: ${formatMoney(order.dueAmount)}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "RM Trader Bill",
          text: shareText,
          files: [file],
        });
        return;
      }
    } catch (error) {
      if (error.name === "AbortError") return;
    }

    downloadBillImage();

    const phone = normalizePhoneForWhatsapp(order.customerPhone);
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(
          shareText
        )}`
      : `https://wa.me/?text=${encodeURIComponent(
          shareText
        )}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  if (message) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="rounded-xl bg-red-50 p-4 text-red-700">{message}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <LoadingState label="Loading bill details..." />
      </div>
    );
  }

  const returnEntries = getReturnEntries(order);
  const ledgerSummary = getLedgerSummary(order);
  const returnSummary = getReturnSummary(order);
  const totalBillAmount = ledgerSummary.hasLedgerContext
    ? ledgerSummary.totalPayable
    : Number(order.subTotal || 0);
  const refundAmount = Math.max(
    Number(order.paidAmount || 0) - totalBillAmount,
    0
  );
  const invoiceStatus = ledgerSummary.hasLedgerContext
    ? ledgerSummary.currentAdvance > 0
      ? "advance"
      : ledgerSummary.currentDue > 0
      ? "partial"
      : "paid"
    : order.paymentStatus;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="col-span-2 grid grid-cols-2 rounded-xl border bg-white p-1 shadow-sm sm:col-span-1" style={{ borderColor: "var(--shop-border)" }}>
              {billLanguageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleBillLanguageChange(option.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-black transition ${
                    billLanguage === option.value
                      ? "bg-[color:var(--shop-primary)] text-white"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => openBillPreview()}
              className="btn-success"
            >
              <Share2 size={18} />
              Share Image
            </button>

            <button
              onClick={handlePrint}
              className="btn-muted"
            >
              <Printer size={18} />
              Print
            </button>
          </div>
        </div>

        <div className="bg-white p-4 shadow-xl sm:p-8 print:shadow-none">
          <div className="border-b border-slate-300 pb-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {shopName}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Building Material Supplier
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {shopPhone ? `${shopAddress} | ${shopPhone}` : shopAddress}
                </p>
              </div>

              <div className="sm:text-right">
                <h2 className="text-2xl font-bold text-[color:var(--shop-primary)]">INVOICE</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Bill No: {getBillNumber(order)}
                </p>
                <p className="text-sm text-slate-600">
                  Date: {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 border-b border-slate-200 py-6">
            <div>
              <h3 className="mb-2 font-bold text-slate-900">Bill To</h3>
              <p className="font-semibold text-slate-800">
                {order.customerName}
              </p>
              <p className="text-sm text-slate-600">{order.customerPhone}</p>
              <p className="mt-1 text-sm text-slate-600">
                {order.deliveryAddress || order.customer?.address || "-"}
              </p>
            </div>

            <div className="sm:text-right">
              <h3 className="mb-2 font-bold text-slate-900">Payment Status</h3>
              <span
                className={`inline-block rounded-full px-4 py-1 text-sm font-bold capitalize ${
                  invoiceStatus === "paid" || invoiceStatus === "advance"
                    ? "bg-green-50 text-green-700"
                    : invoiceStatus === "partial"
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {invoiceStatus}
              </span>
            </div>
          </div>

          <h3 className="mt-6 text-sm font-black uppercase text-slate-600">
            Material Given
          </h3>
          <table className="mt-2 w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left text-sm text-slate-700">
                <th className="border border-slate-300 px-4 py-3">#</th>
                <th className="border border-slate-300 px-4 py-3">Details</th>
                <th className="border border-slate-300 px-4 py-3 sm:text-right">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {order.items.map((item, index) => (
                <tr key={index} className="text-sm">
                  <td className="border border-slate-300 px-4 py-3">
                    {index + 1}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 font-semibold">
                    {item.quantity} {item.selectedUnit || item.unit} {item.productName}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 sm:text-right font-semibold">
                    ₹{item.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {returnEntries.length > 0 && (
            <>
              <div className="mt-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <h3 className="text-sm font-black uppercase text-slate-600">
                  Material Returned
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Credit = returned qty x return rate - wapas lane ka labour.
                </p>
              </div>

              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr className="bg-orange-50 text-left text-sm text-slate-700">
                      <th className="border border-slate-300 px-4 py-3">Date</th>
                      <th className="border border-slate-300 px-4 py-3">Wapas Item</th>
                      <th className="border border-slate-300 px-4 py-3 sm:text-right">
                        Returned Qty
                      </th>
                      <th className="border border-slate-300 px-4 py-3 sm:text-right">
                        Return Rate
                      </th>
                      <th className="border border-slate-300 px-4 py-3 sm:text-right">
                        Return Labour
                      </th>
                      <th className="border border-slate-300 px-4 py-3 sm:text-right">
                        Bill Credit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnEntries.map((entry) => (
                      <tr key={entry._id} className="text-sm">
                        <td className="border border-slate-300 px-4 py-3">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 font-semibold">
                          {entry.productName}
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {entry.quantity} {entry.unit} x ₹{entry.returnRate || 0} = ₹
                            {Number(entry.quantity || 0) *
                              Number(entry.returnRate || 0)}
                            , labour ₹{entry.labourCharge || 0}
                          </p>
                        </td>
                        <td className="border border-slate-300 px-4 py-3 sm:text-right">
                          {entry.quantity} {entry.unit}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 sm:text-right">
                          ₹{entry.returnRate || 0}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 sm:text-right">
                          ₹{entry.labourCharge || 0}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 font-semibold text-green-700 sm:text-right">
                          -₹{entry.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Material Given</span>
                <span className="font-bold text-slate-900">
                  ₹
                  {order.items.reduce(
                    (sum, item) => sum + Number(item.total || 0),
                    0
                  )}
                </span>
              </div>

              {returnSummary.gross > 0 && (
                <>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-600">Material Returned</span>
                    <span className="font-bold text-green-700">
                      -₹{returnSummary.gross}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-600">Return Labour</span>
                    <span className="font-bold text-orange-700">
                      ₹{returnSummary.labour}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-700">Return Credit</span>
                    <span className="font-bold text-green-700">
                      -₹{returnSummary.credit}
                    </span>
                  </div>
                </>
              )}

              {Number(order.deliveryCharge || 0) > 0 && (
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Labour Charge</span>
                  <span className="font-bold text-slate-900">
                    ₹{order.deliveryCharge}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">This Bill</span>
                <span className="font-bold text-slate-900">
                  ₹{order.subTotal}
                </span>
              </div>

              {ledgerSummary.hasLedgerContext && (
                <>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-600">Previous Due</span>
                    <span className="font-bold text-orange-700">
                      ₹{ledgerSummary.previousDue}
                    </span>
                  </div>

                  {ledgerSummary.previousAdvance > 0 && (
                    <div className="flex justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-600">Previous Advance</span>
                      <span className="font-bold text-green-700">
                        ₹{ledgerSummary.previousAdvance}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-700">Total Bill</span>
                    <span className="font-bold text-amber-700">
                      ₹{ledgerSummary.totalPayable}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Paid Now</span>
                <span className="font-bold text-green-700">
                  ₹{order.paidAmount}
                </span>
              </div>

              <div className="flex justify-between rounded-xl bg-red-50 px-4 py-3">
                <span className="font-bold text-red-700">
                  {ledgerSummary.hasLedgerContext ? "Remaining" : "Due Amount"}
                </span>
                <span className="font-bold text-red-700">
                  ₹{ledgerSummary.hasLedgerContext ? ledgerSummary.currentDue : order.dueAmount}
                </span>
              </div>

              {ledgerSummary.currentAdvance > 0 ? (
                <div className="flex justify-between rounded-xl bg-green-50 px-4 py-3">
                  <span className="font-bold text-green-700">Customer Advance</span>
                  <span className="font-bold text-green-700">
                    ₹{ledgerSummary.currentAdvance}
                  </span>
                </div>
              ) : (
                refundAmount > 0 && (
                  <div className="flex justify-between rounded-xl bg-orange-50 px-4 py-3">
                    <span className="font-bold text-orange-700">Refund</span>
                    <span className="font-bold text-orange-700">
                      ₹{refundAmount}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {order.notes && (
            <div className="mt-8 rounded-xl bg-slate-50 p-4">
              <h3 className="font-bold text-slate-900">Notes</h3>
              <p className="mt-1 text-sm text-slate-600">{order.notes}</p>
            </div>
          )}

          <div className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
            Thank you for your business.
          </div>
        </div>
      </div>

      {billPreview.open && (
        <div className="mobile-sheet fixed inset-0 z-50 flex bg-black/50 sm:px-4 print:hidden">
          <div className="modal-panel max-h-[94vh] w-full max-w-3xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6" style={{ borderColor: "var(--shop-border)" }}>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Bill Draft Preview
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Choose Hindi or English before sending to customer.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBillPreview}
                className="btn-muted p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-y-auto bg-[#e7edf4] p-4 sm:p-6">
              {billPreview.loading ? (
                <div className="flex min-h-80 items-center justify-center rounded-xl bg-[color:var(--shop-panel)] text-sm font-bold text-slate-500">
                  Generating bill image...
                </div>
              ) : billPreview.error ? (
                <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">
                  {billPreview.error}
                </div>
              ) : (
                <img
                  src={billPreview.imageUrl}
                  alt="Bill preview"
                  className="mx-auto max-h-[58vh] w-auto max-w-full rounded-md border bg-white object-contain shadow-2xl"
                  style={{ borderColor: "var(--shop-border)" }}
                />
              )}
            </div>

            <div className="thumb-footer grid gap-3 border-t px-4 py-4 sm:grid-cols-3 sm:px-6" style={{ borderColor: "var(--shop-border)" }}>
              <button
                type="button"
                onClick={downloadBillImage}
                disabled={!billPreview.blob}
                className="btn-muted"
              >
                <Download size={18} />
                Download
              </button>

              <button
                type="button"
                onClick={shareBill}
                disabled={!billPreview.blob}
                className="btn-success sm:col-span-2"
              >
                <MessageCircle size={18} />
                Share on WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoice;
