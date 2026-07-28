import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, MessageCircle, Printer, Share2, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";
import LoadingState from "../components/LoadingState";
import getBillNumber from "../utils/billNumber";

const Invoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("");
  const [billPreview, setBillPreview] = useState({
    open: false,
    imageUrl: "",
    blob: null,
    loading: false,
    error: "",
  });

  const fetchOrder = useCallback(async () => {
    try {
      const res = await API.get(`/orders/${id}`);
      setOrder(res.data.order);
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
    const dueAmount = Number(billOrder.dueAmount || 0);

    if (![deliveryCharge, lateCharge, billTotal, paidAmount, dueAmount].every(Number.isFinite)) {
      return "Bill totals are not valid";
    }
    if (deliveryCharge < 0 || lateCharge < 0) {
      return "Extra charges cannot be negative";
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
    if (!isSameAmount(dueAmount, Math.max(billTotal - paidAmount, 0))) {
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

  const createBillSvg = (billOrder) => {
    const items = billOrder.items || [];
    const itemTotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const deliveryCharge = Number(billOrder.deliveryCharge || 0);
    const lateCharge = Number(billOrder.lateCharge || 0);
    const returns = getReturnEntries(billOrder);
    const visibleRows = Math.max(items.length, 10);
    const width = 620;
    const rowHeight = 44;
    const tableTop = 260;
    const tableHeight = 44 + visibleRows * rowHeight;
    const returnsTop = tableTop + tableHeight + 38;
    const returnRowHeight = 34;
    const returnsHeight = returns.length ? 40 + returns.length * returnRowHeight : 0;
    const totalsTop = returns.length
      ? returnsTop + returnsHeight + 24
      : tableTop + tableHeight + 24;
    const billNo = getBillNumber(billOrder);
    const date = new Date(billOrder.createdAt || Date.now()).toLocaleDateString("en-IN");
    const address = billOrder.deliveryAddress || billOrder.customer?.address || "-";
    const baseOffset =
      (deliveryCharge > 0 ? 30 : 0) + (lateCharge > 0 ? 30 : 0);
    const totalLineY = totalsTop + 40 + baseOffset + 12;
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
        const itemLines = wrapText(item.productName, 22).slice(0, 2);
        const itemText = itemLines
          .map(
            (line, lineIndex) =>
              `<text x="112" y="${y + 26 + lineIndex * 14}" class="cell strong">${escapeXml(line)}</text>`
          )
          .join("");

        return `
          <text x="62" y="${y + 27}" text-anchor="middle" class="cell">${index + 1}</text>
          ${itemText}
          <text x="386" y="${y + 27}" text-anchor="end" class="cell">${formatMoney(item.pricePerUnit).replace("Rs. ", "")}</text>
          <text x="446" y="${y + 27}" text-anchor="middle" class="cell">${escapeXml(item.quantity)} ${escapeXml(item.selectedUnit || item.unit)}</text>
          <text x="560" y="${y + 27}" text-anchor="end" class="cell strong">${formatMoney(item.total).replace("Rs. ", "")}</text>
        `;
      })
      .join("")
      : `
        <text x="310" y="${tableTop + 86}" text-anchor="middle" class="cell muted">No items found</text>
      `;

    const tableLines = Array.from({ length: visibleRows + 1 }, (_, index) => {
      const y = tableTop + 44 + index * rowHeight;
      return `<line x1="36" y1="${y}" x2="584" y2="${y}" class="grid"/>`;
    }).join("");

    const dueAmount = Number(billOrder.dueAmount || 0);
    const refundAmount = Math.max(
      Number(billOrder.paidAmount || 0) - Number(billOrder.subTotal || 0),
      0
    );
    const dueColor = dueAmount > 0 ? "#b42318" : "#0b6b3a";
    const returnRows = returns
      .map((entry, index) => {
        const y = returnsTop + 40 + index * returnRowHeight;
        const returnDate = new Date(entry.createdAt || billOrder.createdAt || Date.now())
          .toLocaleDateString("en-IN");

        return `
          <text x="52" y="${y + 22}" class="small">${escapeXml(returnDate)}</text>
          <text x="144" y="${y + 22}" class="cell strong">${escapeXml(entry.productName || "Return")}</text>
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
        return `<line x1="36" y1="${y}" x2="584" y2="${y}" class="grid"/>`;
      }).join("")
      : "";

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <style>
          .shop { font: 900 34px Arial, sans-serif; fill: #101827; letter-spacing: 0.4px; }
          .estimate { font: 800 15px Arial, sans-serif; fill: #fffdf7; letter-spacing: 1.8px; }
          .label { font: 800 14px Arial, sans-serif; fill: #667085; letter-spacing: 0.9px; }
          .body { font: 700 17px Arial, sans-serif; fill: #101827; }
          .small { font: 600 13px Arial, sans-serif; fill: #667085; }
          .cell { font: 700 15px Arial, sans-serif; fill: #202a33; }
          .head { font: 800 13px Arial, sans-serif; fill: #334155; letter-spacing: 1px; }
          .strong { font-weight: 800; fill: #101827; }
          .muted { fill: #667085; }
          .grid { stroke: #8993a0; stroke-width: 1; }
          .paper-edge { stroke: #ded6c6; stroke-width: 1.2; }
        </style>

        <rect width="${width}" height="${height}" fill="#eee8d9"/>
        <path d="M30 20 H590 V${height - 28} Q590 ${height - 12} 574 ${height - 12} H46 Q30 ${height - 12} 30 ${height - 28} Z" fill="#fffef8" class="paper-edge"/>
        <path d="M30 20 C42 28 50 12 62 20 C74 28 82 12 94 20 C106 28 114 12 126 20 C138 28 146 12 158 20 C170 28 178 12 190 20 C202 28 210 12 222 20 C234 28 242 12 254 20 C266 28 274 12 286 20 C298 28 306 12 318 20 C330 28 338 12 350 20 C362 28 370 12 382 20 C394 28 402 12 414 20 C426 28 434 12 446 20 C458 28 466 12 478 20 C490 28 498 12 510 20 C522 28 530 12 542 20 C554 28 562 12 574 20 C584 26 590 20 590 20" fill="#eee8d9"/>

        <rect x="250" y="48" width="120" height="32" rx="4" fill="#26406d"/>
        <text x="310" y="70" text-anchor="middle" class="estimate">ESTIMATE</text>

        <text x="310" y="114" text-anchor="middle" class="shop">RM Trader</text>
        <text x="310" y="138" text-anchor="middle" class="small">Building Material Supplier</text>
        <text x="310" y="158" text-anchor="middle" class="small">Lucknow, Uttar Pradesh</text>

        <text x="40" y="188" class="small">Bill No: ${billNo}</text>
        <text x="580" y="188" text-anchor="end" class="body">Date: ${date}</text>

        <text x="40" y="224" class="small">To,</text>
        <line x1="75" y1="221" x2="580" y2="221" stroke="#667085" stroke-dasharray="6 6"/>
        <text x="116" y="214" class="body">${escapeXml(billOrder.customerName)}</text>
        <text x="40" y="246" class="small">${escapeXml(billOrder.customerPhone)} | ${escapeXml(address).slice(0, 54)}</text>

        <text x="36" y="${tableTop - 12}" class="label">ITEMS PURCHASED</text>
        <rect x="36" y="${tableTop}" width="548" height="${tableHeight}" fill="#fffef8" stroke="#202a33" stroke-width="1.2"/>
        <line x1="86" y1="${tableTop}" x2="86" y2="${tableTop + tableHeight}" class="grid"/>
        <line x1="316" y1="${tableTop}" x2="316" y2="${tableTop + tableHeight}" class="grid"/>
        <line x1="398" y1="${tableTop}" x2="398" y2="${tableTop + tableHeight}" class="grid"/>
        <line x1="484" y1="${tableTop}" x2="484" y2="${tableTop + tableHeight}" class="grid"/>
        <line x1="36" y1="${tableTop + 44}" x2="584" y2="${tableTop + 44}" class="grid"/>
        ${tableLines}

        <text x="62" y="${tableTop + 28}" text-anchor="middle" class="head">Sl</text>
        <text x="201" y="${tableTop + 28}" text-anchor="middle" class="head">PRODUCT</text>
        <text x="357" y="${tableTop + 28}" text-anchor="middle" class="head">RATE</text>
        <text x="441" y="${tableTop + 28}" text-anchor="middle" class="head">QTY</text>
        <text x="534" y="${tableTop + 28}" text-anchor="middle" class="head">AMOUNT</text>

        ${itemRows}

        ${
          returns.length
            ? `
        <text x="36" y="${returnsTop - 12}" class="label">ITEMS RETURNED</text>
        <text x="580" y="${returnsTop - 12}" text-anchor="end" class="small">Returned material is adjusted in this bill</text>
        <rect x="36" y="${returnsTop}" width="548" height="${returnsHeight}" fill="#fffef8" stroke="#202a33" stroke-width="1.2"/>
        <line x1="116" y1="${returnsTop}" x2="116" y2="${returnsTop + returnsHeight}" class="grid"/>
        <line x1="276" y1="${returnsTop}" x2="276" y2="${returnsTop + returnsHeight}" class="grid"/>
        <line x1="344" y1="${returnsTop}" x2="344" y2="${returnsTop + returnsHeight}" class="grid"/>
        <line x1="434" y1="${returnsTop}" x2="434" y2="${returnsTop + returnsHeight}" class="grid"/>
        <line x1="492" y1="${returnsTop}" x2="492" y2="${returnsTop + returnsHeight}" class="grid"/>
        <line x1="36" y1="${returnsTop + 40}" x2="584" y2="${returnsTop + 40}" class="grid"/>
        ${returnLines}
        <text x="76" y="${returnsTop + 25}" text-anchor="middle" class="head">DATE</text>
        <text x="196" y="${returnsTop + 25}" text-anchor="middle" class="head">RETURN ITEM</text>
        <text x="310" y="${returnsTop + 25}" text-anchor="middle" class="head">RATE</text>
        <text x="389" y="${returnsTop + 25}" text-anchor="middle" class="head">QTY</text>
        <text x="463" y="${returnsTop + 25}" text-anchor="middle" class="head">LABOUR</text>
        <text x="538" y="${returnsTop + 25}" text-anchor="middle" class="head">CREDIT</text>
        ${returnRows}
        `
            : ""
        }

        <text x="342" y="${totalsTop}" class="body">Items Total</text>
        <text x="560" y="${totalsTop}" text-anchor="end" class="body strong">${formatMoney(itemTotal)}</text>
        ${
          deliveryCharge > 0
            ? `<text x="342" y="${totalsTop + 30}" class="body">Delivery Charge</text>
               <text x="560" y="${totalsTop + 30}" text-anchor="end" class="body strong">${formatMoney(deliveryCharge)}</text>`
            : ""
        }
        ${
          lateCharge > 0
            ? `<text x="342" y="${totalsTop + 30 + (deliveryCharge > 0 ? 30 : 0)}" class="body">Late Charge</text>
               <text x="560" y="${totalsTop + 30 + (deliveryCharge > 0 ? 30 : 0)}" text-anchor="end" class="body strong">${formatMoney(lateCharge)}</text>`
            : ""
        }
        <line x1="332" y1="${totalLineY}" x2="570" y2="${totalLineY}" stroke="#202a33"/>
        <text x="342" y="${billTotalY}" class="body strong">Bill Total</text>
        <text x="560" y="${billTotalY}" text-anchor="end" class="body strong">${formatMoney(billOrder.subTotal)}</text>
        <text x="342" y="${paidY}" class="body">Paid</text>
        <text x="560" y="${paidY}" text-anchor="end" class="body strong">${formatMoney(billOrder.paidAmount)}</text>
        <text x="342" y="${dueY}" class="body strong" style="fill:${dueColor}">Due</text>
        <text x="560" y="${dueY}" text-anchor="end" class="body strong" style="fill:${dueColor}">${formatMoney(dueAmount)}</text>
        ${
          refundAmount > 0
            ? `<text x="342" y="${dueY + 30}" class="body strong" style="fill:#b42318">Refund</text>
               <text x="560" y="${dueY + 30}" text-anchor="end" class="body strong" style="fill:#b42318">${formatMoney(refundAmount)}</text>`
            : ""
        }

        ${
          billOrder.notes
            ? `<text x="40" y="${notesY}" class="label">NOTE</text>
               <line x1="88" y1="${notesY - 4}" x2="580" y2="${notesY - 4}" stroke="#667085" stroke-dasharray="6 6"/>
               <text x="92" y="${notesY - 10}" class="small">${escapeXml(billOrder.notes).slice(0, 72)}</text>`
            : ""
        }

        <line x1="394" y1="${height - 78}" x2="570" y2="${height - 78}" stroke="#667085"/>
        <text x="482" y="${height - 56}" text-anchor="middle" class="small">Signature</text>
        <text x="310" y="${height - 28}" text-anchor="middle" class="small">Thank you for your business</text>
      </svg>
    `;
  };

  const generateBillImage = async () => {
    if (!order) return null;

    const validationError = getBillValidationError(order);
    if (validationError) {
      throw new Error(validationError);
    }

    const svg = createBillSvg(order);
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

  const openBillPreview = async () => {
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

      const result = await generateBillImage();

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
    link.download = `rm-trader-bill-${getBillNumber(order)}.png`;
    link.click();
  };

  const shareBill = async () => {
    if (!order || !billPreview.blob) return;

    const file = new File(
      [billPreview.blob],
      `rm-trader-bill-${getBillNumber(order)}.png`,
      { type: "image/png" }
    );

    const shareText = `RM Trader Bill ${getBillNumber(
      order
    )}\nAmount: ${formatMoney(order.subTotal)}\nPaid: ${formatMoney(
      order.paidAmount
    )}\nDue: ${formatMoney(order.dueAmount)}`;

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
  const refundAmount = Math.max(
    Number(order.paidAmount || 0) - Number(order.subTotal || 0),
    0
  );

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

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              onClick={openBillPreview}
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
                  Shop Manager
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Building Material Supplier
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Lucknow, Uttar Pradesh
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
                  order.paymentStatus === "paid"
                    ? "bg-green-50 text-green-700"
                    : order.paymentStatus === "partial"
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>

          <h3 className="mt-6 text-sm font-black uppercase text-slate-600">
            Items Purchased
          </h3>
          <table className="mt-2 w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left text-sm text-slate-700">
                <th className="border border-slate-300 px-4 py-3">#</th>
                <th className="border border-slate-300 px-4 py-3">Item</th>
                <th className="border border-slate-300 px-4 py-3">Unit</th>
                <th className="border border-slate-300 px-4 py-3 sm:text-right">
                  Qty
                </th>
                <th className="border border-slate-300 px-4 py-3 sm:text-right">
                  Rate
                </th>
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
                    {item.productName}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 capitalize">
                    {item.selectedUnit || item.unit}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 sm:text-right">
                    {item.quantity}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 sm:text-right">
                    ₹{item.pricePerUnit}
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
                  Items Returned
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Returned material is adjusted in this bill.
                </p>
              </div>

              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="bg-orange-50 text-left text-sm text-slate-700">
                      <th className="border border-slate-300 px-4 py-3">Date</th>
                      <th className="border border-slate-300 px-4 py-3">Item</th>
                      <th className="border border-slate-300 px-4 py-3 sm:text-right">
                        Qty
                      </th>
                      <th className="border border-slate-300 px-4 py-3 sm:text-right">
                        Return Rate
                      </th>
                      <th className="border border-slate-300 px-4 py-3 sm:text-right">
                        Labour
                      </th>
                      <th className="border border-slate-300 px-4 py-3 sm:text-right">
                        Credit
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
              {Number(order.deliveryCharge || 0) > 0 && (
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-600">Delivery Charge</span>
                  <span className="font-bold text-slate-900">
                    ₹{order.deliveryCharge}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Grand Total</span>
                <span className="font-bold text-slate-900">
                  ₹{order.subTotal}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Paid Amount</span>
                <span className="font-bold text-green-700">
                  ₹{order.paidAmount}
                </span>
              </div>

              <div className="flex justify-between rounded-xl bg-red-50 px-4 py-3">
                <span className="font-bold text-red-700">Due Amount</span>
                <span className="font-bold text-red-700">
                  ₹{order.dueAmount}
                </span>
              </div>

              {refundAmount > 0 && (
                <div className="flex justify-between rounded-xl bg-orange-50 px-4 py-3">
                  <span className="font-bold text-orange-700">Refund</span>
                  <span className="font-bold text-orange-700">
                    ₹{refundAmount}
                  </span>
                </div>
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
                  Check the bill image before sending to customer.
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

            <div className="max-h-[68vh] overflow-y-auto bg-[color:var(--shop-panel-2)] p-4 sm:p-6">
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
                  className="mx-auto max-h-[58vh] w-auto max-w-full rounded-xl border bg-white object-contain shadow-lg"
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
