import { useEffect, useState } from "react";
import { ArrowLeft, Edit, Plus, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import CustomerFormModal, {
  initialCustomerForm,
} from "../components/CustomerFormModal";

const Customers = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
 const [form, setForm] = useState(initialCustomerForm);
const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchCustomers = async () => {
    try {
      const res = await API.get("/customers");
      setCustomers(res.data.customers || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load customers");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

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
      className="w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 md:w-auto"
    >
      + Add Customer
    </button>
  }
>
      
     <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Customer List
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
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
                {customers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No customers found. Add your first customer.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
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
                                className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                                >
                                <Eye size={17} />
                            </button>
                          <button
                            onClick={() => handleEdit(customer)}
                            className="rounded-lg bg-green-50 p-2 text-green-600 hover:bg-green-100"
                          >
                            <Edit size={17} />
                          </button>

                          <button
                            onClick={() => handleDelete(customer._id)}
                            className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
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