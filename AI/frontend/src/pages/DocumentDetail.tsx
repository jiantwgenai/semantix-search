import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";

const DocumentDetail = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await api.get(`/documents/${id}`);
        setDocument(response.data);
      } catch (error) {
        setDocument(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDocument();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!document) return <div>Document not found.</div>;

  return (
    <div>
      <h2>{document.filename}</h2>
      <p>Type: {document.file_type}</p>
      <p>Uploaded: {document.created_at}</p>
      {/* Add more fields as needed */}
    </div>
  );
};

export default DocumentDetail;
