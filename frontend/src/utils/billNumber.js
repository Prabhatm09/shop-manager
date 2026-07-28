const getBillNumber = (order) => {
  if (order?.billNumber) return order.billNumber;

  const idPart = String(order?._id || "").slice(-6).toUpperCase() || "BILL";
  const date = new Date(order?.createdAt || order?.orderDate || Date.now());
  const year = date.getFullYear();

  return `RM-${year}-${idPart}`;
};

export default getBillNumber;
