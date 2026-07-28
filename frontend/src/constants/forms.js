const CATEGORY_OPTIONS = {
  building_material: ["cement", "balu", "maurang", "gitti", "brick"],
  timber: ["balli", "patra", "caheli", "sandeli", "ladder"],
  other: ["farma", "10 feet", "8 feet", "other"],
};

const initialProductForm = {
  name: "",
  category: "building_material",
  subCategory: "cement",
  unit: "bag",
  pricePerUnit: "",
  currentStock: "",
  lowStockAlert: "10",
  description: "",
};

const initialCustomerForm = {
  name: "",
  phone: "",
  address: "",
  openingDue: "",
  notes: "",
};

const initialPaymentForm = {
  orderId: "",
  amount: "",
  paymentMode: "cash",
  paymentDate: "",
  notes: "",
};

export {
  CATEGORY_OPTIONS,
  initialProductForm,
  initialCustomerForm,
  initialPaymentForm,
};
