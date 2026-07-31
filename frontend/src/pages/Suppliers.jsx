import { useEffect, useMemo, useState } from "react";
import { Edit, IndianRupee, Plus, ReceiptText, Trash2, X } from "lucide-react";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import LoadingState from "../components/LoadingState";

const today = () => new Date().toISOString().slice(0, 10);

const initialSupplierForm = {
  name: "",
  phone: "",
  address: "",
  notes: "",
};

const createMaterialForm = (supplierId = "") => ({
  supplierId,
  transactionDate: today(),
  productName: "",
  quantity: "",
  unit: "",
  supplierRate: "",
  amount: "",
  paidAmount: "",
  paymentMode: "cash",
  notes: "",
});

const createPaymentForm = (supplierId = "") => ({
  supplierId,
  amount: "",
  paymentMode: "cash",
  paymentDate: today(),
  notes: "",
});

const formatMoney = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierForm, setSupplierForm] = useState(initialSupplierForm);
  const [materialForm, setMaterialForm] = useState(createMaterialForm());
  const [paymentForm, setPaymentForm] = useState(createPaymentForm());
  const [ledger, setLedger] = useState({
    transactions: [],
    payments: [],
    summary: null,
  });
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activePanel, setActivePanel] = useState("ledger");
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/suppliers");
      const list = res.data.suppliers || [];

      setSuppliers(list);
      setSelectedSupplierId((current) => current || list[0]?._id || "");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const selectedSupplier = suppliers.find(
    (supplier) => supplier._id === selectedSupplierId
  );

  useEffect(() => {
    setMaterialForm(createMaterialForm(selectedSupplierId));
    setPaymentForm(createPaymentForm(selectedSupplierId));
  }, [selectedSupplierId]);

  useEffect(() => {
    const fetchLedger = async () => {
      if (!selectedSupplierId) {
        setLedger({ transactions: [], payments: [], summary: null });
        return;
      }

      try {
        setLedgerLoading(true);
        const res = await API.get(`/suppliers/${selectedSupplierId}/ledger`);
        setLedger({
          transactions: res.data.transactions || [],
          payments: res.data.payments || [],
          summary: res.data.summary || null,
        });
      } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load supplier ledger");
      } finally {
        setLedgerLoading(false);
      }
    };

    fetchLedger();
  }, [selectedSupplierId]);

  const materialAutoAmount =
    Number(materialForm.quantity || 0) * Number(materialForm.supplierRate || 0);
  const materialTotal = materialAutoAmount;
  const materialPending = Math.max(
    materialTotal - Number(materialForm.paidAmount || 0),
    0
  );

  const supplierPendingAfterMaterial = useMemo(() => {
    return (
      Number(selectedSupplier?.summary?.dueAmount || 0) +
      materialTotal -
      Number(materialForm.paidAmount || 0)
    );
  }, [selectedSupplier, materialTotal, materialForm.paidAmount]);

  const resetSupplierForm = () => {
    setSupplierForm(initialSupplierForm);
    setEditingId(null);
  };

  const openAddSupplier = () => {
    resetSupplierForm();
    setSupplierModalOpen(true);
  };

  const openEditSupplier = (supplier) => {
    setEditingId(supplier._id);
    setSupplierForm({
      name: supplier.name || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setSupplierModalOpen(true);
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();

    if (!supplierForm.name.trim()) {
      setMessage("Supplier name is required");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      if (editingId) {
        await API.put(`/suppliers/${editingId}`, supplierForm);
        setMessage("Supplier updated");
      } else {
        const res = await API.post("/suppliers", supplierForm);
        setSelectedSupplierId(res.data.supplier?._id || "");
        setMessage("Supplier added");
      }

      resetSupplierForm();
      setSupplierModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      setMessage(error.response?.data?.message || "Supplier save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleMaterialSubmit = async (e) => {
    e.preventDefault();

    const quantity = Number(materialForm.quantity);
    const supplierRate = Number(materialForm.supplierRate);
    const amount = quantity * supplierRate;
    const paidAmount = Number(materialForm.paidAmount || 0);

    if (!selectedSupplier) {
      setMessage("Select supplier first");
      return;
    }

    if (!materialForm.productName.trim()) {
      setMessage("Material name is required");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessage("Quantity must be greater than 0");
      return;
    }

    if (!materialForm.unit.trim()) {
      setMessage("Unit is required");
      return;
    }

    if (!Number.isFinite(supplierRate) || supplierRate <= 0) {
      setMessage("Material rate must be greater than 0");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Total amount must be greater than 0");
      return;
    }

    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      setMessage("Paid amount cannot be negative");
      return;
    }

    if (paidAmount > amount) {
      setMessage("Paid amount cannot be greater than total amount");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      await API.post(`/suppliers/${selectedSupplier._id}/transactions`, {
        productName: materialForm.productName,
        quantity,
        unit: materialForm.unit,
        supplierRate,
        amount,
        paidAmount,
        paymentMode: materialForm.paymentMode,
        transactionDate: materialForm.transactionDate,
        notes: materialForm.notes,
      });
      setMaterialForm(createMaterialForm(selectedSupplier._id));
      setMessage("Material purchase saved");
      setActivePanel("ledger");
      await fetchSuppliers();
      const ledgerRes = await API.get(`/suppliers/${selectedSupplier._id}/ledger`);
      setLedger({
        transactions: ledgerRes.data.transactions || [],
        payments: ledgerRes.data.payments || [],
        summary: ledgerRes.data.summary || null,
      });
    } catch (error) {
      setMessage(error.response?.data?.message || "Material purchase failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(paymentForm.amount);

    if (!selectedSupplier) {
      setMessage("Select supplier first");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Payment amount must be greater than 0");
      return;
    }

    try {
      setSaving(true);
      setMessage("");
      await API.post(`/suppliers/${selectedSupplier._id}/payments`, {
        amount,
        paymentMode: paymentForm.paymentMode,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
      });
      setPaymentForm(createPaymentForm(selectedSupplier._id));
      setMessage("Supplier payment saved");
      setActivePanel("ledger");
      await fetchSuppliers();
      const ledgerRes = await API.get(`/suppliers/${selectedSupplier._id}/ledger`);
      setLedger({
        transactions: ledgerRes.data.transactions || [],
        payments: ledgerRes.data.payments || [],
        summary: ledgerRes.data.summary || null,
      });
    } catch (error) {
      setMessage(error.response?.data?.message || "Payment save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplierId) => {
    const confirmDelete = window.confirm("Delete this supplier?");
    if (!confirmDelete) return;

    try {
      setSaving(true);
      setMessage("");
      await API.delete(`/suppliers/${supplierId}`);
      setMessage("Supplier deleted");
      if (selectedSupplierId === supplierId) {
        setSelectedSupplierId("");
      }
      fetchSuppliers();
    } catch (error) {
      setMessage(error.response?.data?.message || "Supplier delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout
      title="Suppliers"
      subtitle="Supplier material purchases, payments and pending hisaab"
      headerAction={
        <button onClick={openAddSupplier} className="btn-primary w-full md:w-auto">
          <Plus size={18} />
          Add Supplier
        </button>
      }
    >
      {message && (
        <div className="toast mb-5 px-4 py-3 text-sm font-semibold">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <section className="surface overflow-hidden">
          <div
            className="border-b px-5 py-4"
            style={{ borderColor: "var(--shop-border)" }}
          >
            <h2 className="text-lg font-black text-slate-900">Suppliers</h2>
          </div>

          {loading ? (
            <div className="p-5">
              <LoadingState label="Loading suppliers..." />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-slate-500">
              Add supplier one time, then maintain material and payment entries.
            </div>
          ) : (
            <div
              className="max-h-[18rem] divide-y overflow-y-auto xl:max-h-[calc(100vh-13rem)]"
              style={{ borderColor: "var(--shop-border)" }}
            >
              {suppliers.map((supplier) => {
                const isSelected = supplier._id === selectedSupplierId;

                return (
                  <button
                    key={supplier._id}
                    type="button"
                    onClick={() => setSelectedSupplierId(supplier._id)}
                    className={`block w-full px-4 py-3 text-left sm:px-5 sm:py-4 ${
                      isSelected
                        ? "bg-[color:var(--shop-primary-soft)]"
                        : "bg-[color:var(--shop-panel)] hover:bg-[color:var(--shop-panel-2)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-slate-900">{supplier.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {supplier.phone || "No phone"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                        {formatMoney(supplier.summary?.dueAmount)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="surface overflow-hidden">
          {!selectedSupplier ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-500">
              Select a supplier to add material purchase or payment.
            </div>
          ) : (
            <>
              <div
                className="flex flex-col gap-4 border-b px-4 py-4 sm:px-5 md:flex-row md:items-start md:justify-between"
                style={{ borderColor: "var(--shop-border)" }}
              >
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {selectedSupplier.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {selectedSupplier.phone || "No phone"}{" "}
                    {selectedSupplier.address ? `· ${selectedSupplier.address}` : ""}
                  </p>
                </div>

                <div className="grid w-full grid-cols-3 gap-2 text-left text-sm md:w-auto md:text-right">
                  <div className="rounded-lg bg-[color:var(--shop-panel-2)] px-2 py-2 sm:px-3">
                    <p className="text-xs font-bold text-slate-500">Bills</p>
                    <p className="font-black text-slate-900">
                      {formatMoney(selectedSupplier.summary?.totalSupplied)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 px-2 py-2 sm:px-3">
                    <p className="text-xs font-bold text-green-700">Paid</p>
                    <p className="font-black text-green-800">
                      {formatMoney(selectedSupplier.summary?.totalPaid)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-red-50 px-2 py-2 sm:px-3">
                    <p className="text-xs font-bold text-red-700">Pending</p>
                    <p className="font-black text-red-800">
                      {formatMoney(selectedSupplier.summary?.dueAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: "var(--shop-border)" }}>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  {[
                    { label: "Ledger", value: "ledger", icon: ReceiptText },
                    { label: "Material", value: "material", icon: ReceiptText },
                  ].map((panel) => {
                    const Icon = panel.icon;

                    return (
                      <button
                        key={panel.value}
                        type="button"
                        onClick={() => setActivePanel(panel.value)}
                        className={`btn-muted justify-center text-sm ${
                          activePanel === panel.value
                            ? "bg-[color:var(--shop-primary)] text-white"
                            : ""
                        }`}
                      >
                        <Icon size={16} />
                        {panel.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentForm(createPaymentForm(selectedSupplier._id));
                      setActivePanel("payment");
                    }}
                    className={`btn-muted justify-center text-sm ${
                      activePanel === "payment"
                        ? "bg-[color:var(--shop-primary)] text-white"
                        : "text-green-700"
                    }`}
                  >
                    <IndianRupee size={16} />
                    Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditSupplier(selectedSupplier)}
                    className="btn-muted justify-center text-sm text-orange-700"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedSupplier._id)}
                    className="btn-muted justify-center text-sm text-red-700"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {activePanel === "ledger" && (
                  <div className="space-y-5">
                    {ledgerLoading ? (
                      <LoadingState label="Loading supplier ledger..." />
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2 md:gap-3">
                          <div className="rounded-xl bg-[color:var(--shop-panel-2)] p-4">
                            <p className="text-xs font-bold text-slate-500">Material Bills</p>
                            <p className="mt-1 text-xl font-black text-slate-900">
                              {formatMoney(ledger.summary?.totalSupplied)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-green-50 p-4">
                            <p className="text-xs font-bold text-green-700">Paid</p>
                            <p className="mt-1 text-xl font-black text-green-800">
                              {formatMoney(ledger.summary?.totalPaid)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-red-50 p-4">
                            <p className="text-xs font-bold text-red-700">Pending</p>
                            <p className="mt-1 text-xl font-black text-red-800">
                              {formatMoney(ledger.summary?.dueAmount)}
                            </p>
                          </div>
                        </div>

                        <section>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-base font-black text-slate-900">
                              Material Purchased
                            </h3>
                            <button
                              type="button"
                              onClick={() => setActivePanel("material")}
                              className="btn-primary text-sm"
                            >
                              <Plus size={16} />
                              Add Material
                            </button>
                          </div>

                          {ledger.transactions.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
                              No material purchase saved for this supplier.
                            </div>
                          ) : (
                            <>
                            <div className="space-y-3 md:hidden">
                              {ledger.transactions.map((entry) => (
                                <article
                                  key={entry._id}
                                  className="rounded-xl border border-slate-200 bg-[color:var(--shop-panel)] p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-black text-slate-900">
                                        {entry.productName}
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-slate-500">
                                        {new Date(
                                          entry.transactionDate || entry.createdAt
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <p className="text-right font-black text-slate-900">
                                      {formatMoney(entry.amount)}
                                    </p>
                                  </div>
                                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[color:var(--shop-panel-2)] p-3 text-sm">
                                    <p>
                                      <span className="font-bold text-slate-500">Qty </span>
                                      <span className="font-black text-slate-900">
                                        {entry.quantity} {entry.unit}
                                      </span>
                                    </p>
                                    <p>
                                      <span className="font-bold text-slate-500">Rate </span>
                                      <span className="font-black text-slate-900">
                                        {formatMoney(entry.supplierRate)}
                                      </span>
                                    </p>
                                  </div>
                                  {entry.notes && (
                                    <p className="mt-3 text-sm font-semibold text-slate-500">
                                      {entry.notes}
                                    </p>
                                  )}
                                </article>
                              ))}
                            </div>

                            <div className="hidden overflow-x-auto rounded-xl border md:block" style={{ borderColor: "var(--shop-border)" }}>
                              <table className="shop-table w-full min-w-[880px]">
                                <thead>
                                  <tr className="text-left">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Material</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">Rate</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ledger.transactions.map((entry) => (
                                    <tr key={entry._id} className="text-sm">
                                      <td className="px-4 py-3 font-semibold text-slate-600">
                                        {new Date(entry.transactionDate || entry.createdAt).toLocaleDateString()}
                                      </td>
                                      <td className="px-4 py-3 font-black text-slate-900">
                                        {entry.productName}
                                      </td>
                                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                                        {entry.quantity} {entry.unit}
                                      </td>
                                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                                        {formatMoney(entry.supplierRate)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-black text-slate-900">
                                        {formatMoney(entry.amount)}
                                      </td>
                                      <td className="px-4 py-3 text-slate-500">
                                        {entry.notes || "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            </>
                          )}
                        </section>

                        <section>
                          <div className="mb-3">
                            <h3 className="text-base font-black text-slate-900">
                              Payment History
                            </h3>
                          </div>

                          {ledger.payments.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
                              No payment saved for this supplier.
                            </div>
                          ) : (
                            <>
                            <div className="space-y-3 md:hidden">
                              {ledger.payments.map((payment) => (
                                <article
                                  key={payment._id}
                                  className="rounded-xl border border-slate-200 bg-[color:var(--shop-panel)] p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-black capitalize text-slate-900">
                                        {payment.paymentMode}
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-slate-500">
                                        {new Date(
                                          payment.paymentDate || payment.createdAt
                                        ).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <p className="font-black text-green-700">
                                      {formatMoney(payment.amount)}
                                    </p>
                                  </div>
                                  {payment.notes && (
                                    <p className="mt-3 text-sm font-semibold text-slate-500">
                                      {payment.notes}
                                    </p>
                                  )}
                                </article>
                              ))}
                            </div>

                            <div className="hidden overflow-x-auto rounded-xl border md:block" style={{ borderColor: "var(--shop-border)" }}>
                              <table className="shop-table w-full min-w-[720px]">
                                <thead>
                                  <tr className="text-left">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Mode</th>
                                    <th className="px-4 py-3">Notes</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ledger.payments.map((payment) => (
                                    <tr key={payment._id} className="text-sm">
                                      <td className="px-4 py-3 font-semibold text-slate-600">
                                        {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}
                                      </td>
                                      <td className="px-4 py-3 font-black capitalize text-slate-700">
                                        {payment.paymentMode}
                                      </td>
                                      <td className="px-4 py-3 text-slate-500">
                                        {payment.notes || "-"}
                                      </td>
                                      <td className="px-4 py-3 text-right font-black text-green-700">
                                        {formatMoney(payment.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            </>
                          )}
                        </section>
                      </>
                    )}
                  </div>
                )}

                {activePanel === "material" && (
                  <form onSubmit={handleMaterialSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="field-label">Material Name</label>
                        <input
                          value={materialForm.productName}
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              productName: e.target.value,
                            })
                          }
                          className="form-control px-4 py-3"
                          placeholder="Example: cement"
                        />
                      </div>
                      <div>
                        <label className="field-label">Purchase Date</label>
                        <input
                          type="date"
                          value={materialForm.transactionDate}
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              transactionDate: e.target.value,
                            })
                          }
                          className="form-control px-4 py-3"
                        />
                      </div>
                      <div>
                        <label className="field-label">Quantity</label>
                        <input
                          value={materialForm.quantity}
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              quantity: e.target.value,
                            })
                          }
                          type="number"
                          min="0.001"
                          step="0.001"
                          className="form-control px-4 py-3"
                          placeholder="Example: 100"
                        />
                      </div>
                      <div>
                        <label className="field-label">Unit</label>
                        <input
                          value={materialForm.unit}
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              unit: e.target.value,
                            })
                          }
                          className="form-control px-4 py-3"
                          placeholder="Example: bag"
                        />
                      </div>
                      <div>
                        <label className="field-label">Material Rate</label>
                        <input
                          value={materialForm.supplierRate}
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              supplierRate: e.target.value,
                            })
                          }
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="form-control px-4 py-3"
                          placeholder="Example: 360"
                        />
                      </div>
                      <div>
                        <label className="field-label">Total Amount</label>
                        <input
                          value={materialAutoAmount || ""}
                          type="number"
                          readOnly
                          className="form-control bg-[color:var(--shop-panel-2)] px-4 py-3 font-black"
                          placeholder="Auto calculated"
                        />
                      </div>
                      <div>
                        <label className="field-label">Paid Now</label>
                        <input
                          value={materialForm.paidAmount}
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              paidAmount: e.target.value,
                            })
                          }
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control px-4 py-3"
                          placeholder="Example: 10000"
                        />
                      </div>
                      <div>
                        <label className="field-label">Payment Mode</label>
                        <select
                          value={materialForm.paymentMode}
                          onChange={(e) =>
                            setMaterialForm({
                              ...materialForm,
                              paymentMode: e.target.value,
                            })
                          }
                          className="form-control px-4 py-3"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="bank">Bank</option>
                          <option value="cheque">Cheque</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[color:var(--shop-panel-2)] p-4 text-sm font-bold text-slate-700">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <p>Total: {formatMoney(materialTotal)}</p>
                        <p>Paid: {formatMoney(materialForm.paidAmount)}</p>
                        <p>Remains: {formatMoney(materialPending)}</p>
                      </div>
                      <p className="mt-2 text-slate-500">
                        Supplier pending after save:{" "}
                        {formatMoney(supplierPendingAfterMaterial)}
                      </p>
                    </div>

                    <div>
                      <label className="field-label">Notes</label>
                      <textarea
                        rows="3"
                        value={materialForm.notes}
                        onChange={(e) =>
                          setMaterialForm({
                            ...materialForm,
                            notes: e.target.value,
                          })
                        }
                        className="form-control resize-none px-4 py-3"
                        placeholder="Example: delivered by trolley"
                      />
                    </div>

                    <button disabled={saving} className="btn-success">
                      {saving ? "Saving..." : "Save Material Purchase"}
                    </button>
                  </form>
                )}

                {activePanel === "payment" && (
                  <form onSubmit={handlePaymentSubmit} className="max-w-xl space-y-4">
                    <div>
                      <label className="field-label">Payment Amount</label>
                      <input
                        type="number"
                        min="1"
                        value={paymentForm.amount}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            amount: e.target.value,
                          })
                        }
                        className="form-control px-4 py-3"
                        placeholder="Example: 10000"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="field-label">Payment Date</label>
                        <input
                          type="date"
                          value={paymentForm.paymentDate}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              paymentDate: e.target.value,
                            })
                          }
                          className="form-control px-4 py-3"
                        />
                      </div>
                      <div>
                        <label className="field-label">Payment Mode</label>
                        <select
                          value={paymentForm.paymentMode}
                          onChange={(e) =>
                            setPaymentForm({
                              ...paymentForm,
                              paymentMode: e.target.value,
                            })
                          }
                          className="form-control px-4 py-3"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="bank">Bank</option>
                          <option value="cheque">Cheque</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="field-label">Notes</label>
                      <textarea
                        rows="3"
                        value={paymentForm.notes}
                        onChange={(e) =>
                          setPaymentForm({
                            ...paymentForm,
                            notes: e.target.value,
                          })
                        }
                        className="form-control resize-none px-4 py-3"
                        placeholder="Example: cash paid at shop"
                      />
                    </div>
                  <button disabled={saving} className="btn-success">
                      {saving ? "Saving..." : "Save Payment"}
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {supplierModalOpen && (
        <div className="mobile-sheet fixed inset-0 z-50 flex bg-black/50 sm:px-4">
          <div className="modal-panel max-h-[92vh] w-full max-w-xl overflow-hidden">
            <div
              className="flex items-center justify-between border-b px-4 py-4 sm:px-6"
              style={{ borderColor: "var(--shop-border)" }}
            >
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingId ? "Edit Supplier" : "Add Supplier"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  One-time supplier details for your shop relation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSupplierModalOpen(false);
                  resetSupplierForm();
                }}
                disabled={saving}
                className="btn-muted p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSupplierSubmit}>
              <div className="space-y-4 p-4 sm:p-6">
                <div>
                  <label className="field-label">Supplier Name</label>
                  <input
                    value={supplierForm.name}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        name: e.target.value,
                      })
                    }
                    className="form-control px-4 py-3"
                    placeholder="Example: Mishra Traders"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input
                    value={supplierForm.phone}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        phone: e.target.value,
                      })
                    }
                    className="form-control px-4 py-3"
                    placeholder="Example: 9876543210"
                  />
                </div>
                <div>
                  <label className="field-label">Address</label>
                  <textarea
                    rows="3"
                    value={supplierForm.address}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        address: e.target.value,
                      })
                    }
                    className="form-control resize-none px-4 py-3"
                    placeholder="Example: Main market, near depot"
                  />
                </div>
                <div>
                  <label className="field-label">Notes</label>
                  <textarea
                    rows="2"
                    value={supplierForm.notes}
                    onChange={(e) =>
                      setSupplierForm({
                        ...supplierForm,
                        notes: e.target.value,
                      })
                    }
                    className="form-control resize-none px-4 py-3"
                    placeholder="Example: cement and balu supplier"
                  />
                </div>
              </div>

              <div
                className="thumb-footer flex flex-col-reverse gap-3 border-t px-4 py-4 sm:flex-row sm:justify-end sm:px-6"
                style={{ borderColor: "var(--shop-border)" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSupplierModalOpen(false);
                    resetSupplierForm();
                  }}
                  disabled={saving}
                  className="btn-muted"
                >
                  Cancel
                </button>
                <button disabled={saving || !supplierForm.name.trim()} className="btn-primary">
                  {saving ? "Saving..." : editingId ? "Update Supplier" : "Add Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Suppliers;
