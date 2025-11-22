import { Routes, Route } from 'react-router-dom';
import DeliveryListView from '../components/delivery/DeliveryListView';
import DeliveryForm from '../components/delivery/DeliveryForm';

export default function Deliveries() {
  return (
    <Routes>
      <Route index element={<DeliveryListView />} />
      <Route path="new" element={<DeliveryForm />} />
      <Route path=":id" element={<DeliveryForm />} />
      <Route path=":id/edit" element={<DeliveryForm />} />
    </Routes>
  );
}

