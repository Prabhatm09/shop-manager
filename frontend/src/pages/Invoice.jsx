import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api/axios";

const Invoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [message, setMessage] = useState("");

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

  const handlePrint = () => {
    window.print();
  };

  if (message) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="rounded-xl bg-red-50 p-4 text-red-700">{message}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 text-slate-600">
        Loading invoice...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center justify-between print:hidden">
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-xl bg-[color:var(--shop-primary)] px-5 py-2 font-semibold text-white hover:bg-[color:var(--shop-primary-strong)]"
          >
            <Printer size={18} />
            Print Bill
          </button>
        </div>

        <div className="bg-white p-8 shadow-xl print:shadow-none">
          <div className="border-b border-slate-300 pb-6">
            <div className="flex justify-between gap-6">
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

              <div className="text-right">
                <h2 className="text-2xl font-bold text-[color:var(--shop-primary)]">INVOICE</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Bill No: #{order._id.slice(-6).toUpperCase()}
                </p>
                <p className="text-sm text-slate-600">
                  Date: {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-b border-slate-200 py-6">
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

            <div className="text-right">
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

          <table className="mt-6 w-full border-collapse">
            <thead>
              <tr className="bg-slate-100 text-left text-sm text-slate-700">
                <th className="border border-slate-300 px-4 py-3">#</th>
                <th className="border border-slate-300 px-4 py-3">Item</th>
                <th className="border border-slate-300 px-4 py-3">Unit</th>
                <th className="border border-slate-300 px-4 py-3 text-right">
                  Qty
                </th>
                <th className="border border-slate-300 px-4 py-3 text-right">
                  Rate
                </th>
                <th className="border border-slate-300 px-4 py-3 text-right">
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
                  <td className="border border-slate-300 px-4 py-3 text-right">
                    {item.quantity}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right">
                    ₹{item.pricePerUnit}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold">
                    ₹{item.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
    </div>
  );
};

export default Invoice;
