import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { UserAdministration } from '@/pages/UserAdministration';

createRoot(document.getElementById("root")!).render(
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/documents" element={<MyDocuments />} />
    <Route path="/upload" element={<DocumentUpload />} />
    <Route path="/admin" element={<UserAdministration />} />
  </Routes>
);
