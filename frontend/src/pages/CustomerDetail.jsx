import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, IndianRupee, Phone, MapPin, ShoppingCart } from "lucide-react";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState("");

  const fetchCustomerDetail = async () => {
    try {
      const [customerRes, orderRes, paymentRes] = await Promise.all([
        API.get(`/customers/${id}`),
        API.get(`/orders/customer/${id}`),
        API.get(`/payments/customer/${id}`),
      ]);

      setCustomer(customerRes.data.customer);
      setOrders(orderRes.data.orders || []);
      setPayments(paymentRes.data.payments || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load customer detail");
    }
  };

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

  const stats = useMemo(() => {
    const totalPurchase = orders.reduce((sum, order) => sum + Number(order.subTotal || 0), 0);
    const totalPaidFromOrders = orders.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0);
    const totalDue = orders.reduce((sum, order) => sum + Number(order.dueAmount || 0), 0);
    const totalPaymentHistory = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    return {
      totalOrders: orders.length,
      totalPurchase,
      totalPaidFromOrders,
      totalDue,
      totalPaymentHistory,
    };
  }, [orders, payments]);

  return (
    <AppLayout
      title="Customer Detail"
      subtitle="View customer orders, payments and due amount"
    >
      <button
        onClick={() => navigate("/customers")}
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
      >
        <ArrowLeft size={18} />
        Back to Customers
      </button>

      {message && (
        <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {message}
        </div>
      )}

      {customer && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">{customer.name}</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <Phone className="text-blue-600" size={20} />
              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="font-bold text-slate-900">{customer.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 md:col-span-2">
              <MapPin className="text-green-600" size={20} />
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="font-bold text-slate-900">
                  {customer.address || "-"}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShoppingCart className="text-purple-600" />
          <p className="mt-4 text-sm text-slate-500">Total Orders</p>
          <h3 className="text-2xl font-bold text-slate-900">{stats.totalOrders}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <IndianRupee className="text-indigo-600" />
          <p className="mt-4 text-sm text-slate-500">Total Purchase</p>
          <h3 className="text-2xl font-bold text-slate-900">₹{stats.totalPurchase}</h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <IndianRupee className="text-green-600" />
          <p className="mt-4 text-sm text-slate-500">Total Paid</p>
          <h3 className="text-2xl font-bold text-slate-900">
            ₹{stats.totalPaidFromOrders}
          </h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <IndianRupee className="text-red-600" />
          <p className="mt-4 text-sm text-slate-500">Total Due</p>
          <h3 className="text-2xl font-bold text-slate-900">₹{stats.totalDue}</h3>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Order History
          </h2>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No orders found.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order._id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      <h3 className="mt-1 font-bold text-slate-900">
                        ₹{order.subTotal}
                      </h3>
                    </div>

                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-bold capitalize ${
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

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between py-1 text-sm">
                        <span className="text-slate-600">
                          {item.productName} × {item.quantity} {item.unit}
                        </span>
                        <span className="font-semibold text-slate-900">
                          ₹{item.total}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                    <div>
                      <p className="text-slate-500">Paid</p>
                      <p className="font-bold text-green-700">₹{order.paidAmount}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Due</p>
                      <p className="font-bold text-red-700">₹{order.dueAmount}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Return</p>
                      <p className="font-bold text-slate-900">
                        {order.returnDate
                          ? new Date(order.returnDate).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Payment History
          </h2>

          <div className="space-y-4">
            {payments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No payments found.
              </div>
            ) : (
              payments.map((payment) => (
                <div key={payment._id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        ₹{payment.amount}
                      </h3>
                      <p className="mt-1 text-sm capitalize text-slate-500">
                        {payment.paymentMode}
                      </p>
                    </div>

                    <p className="text-sm text-slate-500">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </p>
                  </div>

                  {payment.notes && (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      {payment.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default CustomerDetail;