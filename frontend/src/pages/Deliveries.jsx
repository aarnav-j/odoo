import { Routes, Route } from 'react-router-dom';
import DeliveryListView from '../components/delivery/DeliveryListView';
import DeliveryDetail from './DeliveryDetail';

export default function Deliveries() {
  return (
    <Routes>
      <Route index element={<DeliveryListView />} />
      <Route path="new" element={<DeliveryDetail />} />
      <Route path=":id" element={<DeliveryDetail />} />
    </Routes>
  );
}

