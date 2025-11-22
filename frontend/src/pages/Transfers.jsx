import { Routes, Route } from 'react-router-dom';
import TransferListView from '../components/transfers/TransferListView';
import TransferForm from '../components/transfers/TransferForm';

export default function Transfers() {
  return (
    <Routes>
      <Route index element={<TransferListView />} />
      <Route path="new" element={<TransferForm />} />
      <Route path=":id" element={<TransferForm />} />
      <Route path=":id/edit" element={<TransferForm />} />
    </Routes>
  );
}

