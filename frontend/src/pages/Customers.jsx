import { useEffect, useMemo, useState } from "react";
import { Edit, Search, Trash2, Eye, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import CustomerFormModal from "../components/CustomerFormModal";
import LoadingState from "../components/LoadingState";
import { initialCustomerForm } from "../constants/forms";
import { EmptyState, SearchInput, StatCard } from "../components/pos";

const Customers = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
 const [form, setForm] = useState(initialCustomerForm);
const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const fetchCustomers = async () => {
    try {
      setDataLoading(true);
      const res = await API.get("/customers");
      setCustomers(res.data.customers || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load customers");
    } finally {
      setDataLoading(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const keyword = search.toLowerCase();

    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(keyword) ||
        customer.phone?.toLowerCase().includes(keyword) ||
        customer.address?.toLowerCase().includes(keyword)
    );
  }, [customers, search]);

  const totalOpeningDue = customers.reduce(
    (sum, customer) => sum + Number(customer.openingDue || 0),
    0
  );

  useEffect(() => {
    fetchCustomers();
  }, []);

const resetForm = () => {
  setForm(initialCustomerForm);
  setEditingId(null);
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      ...form,
      openingDue: Number(form.openingDue || 0),
    };

    try {
      if (editingId) {
        await API.put(`/customers/${editingId}`, payload);
        setMessage("Customer updated successfully");
      } else {
        await API.post("/customers", payload);
        setMessage("Customer created successfully");
      }

      resetForm();
      fetchCustomers();
      setIsModalOpen(false);
    } catch (error) {
      setMessage(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

const handleEdit = (customer) => {
  setEditingId(customer._id);

  setForm({
    name: customer.name || "",
    phone: customer.phone || "",
    address: customer.address || "",
    openingDue: customer.openingDue || "",
    notes: customer.notes || "",
  });

  setIsModalOpen(true);
};

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this customer?");
    if (!confirmDelete) return;

    try {
      await API.delete(`/customers/${id}`);
      setMessage("Customer deleted successfully");
      fetchCustomers();
    } catch (error) {
      setMessage(error.response?.data?.message || "Delete failed");
    }
  };

  return (
  <AppLayout
  title="Customers"
  subtitle="Manage customers, addresses and dues"
  headerAction={
    <button
      onClick={() => {
        resetForm();
        setIsModalOpen(true);
      }}
      className="btn-success w-full md:w-auto"
    >
      + Add Customer
    </button>
  }
>
      {message && (
        <div className="toast mb-5 px-4 py-3 text-sm font-semibold">
          {message}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Customers" value={customers.length} icon={Users} />
        <StatCard label="Opening Due" value={`₹${totalOpeningDue}`} icon={Users} tone="danger" />
        <StatCard label="Showing" value={filteredCustomers.length} icon={Search} />
      </div>
      
     <div className="surface p-4 sm:p-6">

        <section>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Customer Ledger List
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Search customers before creating bill or collecting payment.
              </p>
            </div>
            <div className="lg:w-80">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer..."
              />
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {dataLoading ? (
              <LoadingState label="Loading shop customers..." />
            ) : filteredCustomers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No customers found"
                message="Add your first customer or try another search."
              />
            ) : (
              filteredCustomers.map((customer) => (
                <article key={customer._id} className="surface-flat p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {customer.name}
                      </h3>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {customer.phone}
                      </p>
                    </div>
                    <p className="rounded-xl bg-[color:var(--shop-brick-soft)] px-3 py-2 text-sm font-black text-red-700">
                      ₹{customer.openingDue || 0}
                    </p>
                  </div>

                  <p className="mt-3 rounded-xl bg-[color:var(--shop-panel-2)] p-3 text-sm font-medium text-slate-600">
                    {customer.address || "No address added"}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => navigate(`/customers/${customer._id}`)}
                      className="btn-success text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleEdit(customer)}
                      className="btn-muted text-sm text-green-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(customer._id)}
                      className="btn-muted text-sm text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="shop-table w-full min-w-[760px]">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Opening Due</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {dataLoading ? (
                  <tr>
                    <td colSpan="5" className="bg-[color:var(--shop-panel)] px-4 py-8">
                      <LoadingState label="Loading shop customers..." />
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr
                      key={customer._id}
                      className="border-b text-sm hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {customer.phone}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {customer.address || "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        ₹{customer.openingDue || 0}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => navigate(`/customers/${customer._id}`)}
                                className="btn-muted p-2 text-[color:var(--shop-primary-strong)]"
                                >
                                <Eye size={17} />
                            </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="btn-muted p-2 text-green-700"
                          >
                            <Edit size={17} />
                          </button>

                          <button
                            onClick={() => handleDelete(customer._id)}
                            className="btn-muted p-2 text-red-700"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <CustomerFormModal
  open={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  form={form}
  setForm={setForm}
  editingId={editingId}
  loading={loading}
  onSubmit={handleSubmit}
  onCancelEdit={resetForm}
/>
    </AppLayout>
  );
};

export default Customers;
