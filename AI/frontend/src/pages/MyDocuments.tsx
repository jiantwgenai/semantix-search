import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Document, DocumentStatus } from '@/types/document';
import { api } from '@/lib/api';
import { formatDate } from '@/utils/dateUtils';
import { useToast } from '@/components/ui/use-toast';

export function MyDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents');
      console.log('Fetched documents:', response.data); // Debug log
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error); // Debug log
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (documentId: number) => {
    try {
      await api.delete(`/documents/${documentId}`);
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      fetchDocuments();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    const statusColors = {
      [DocumentStatus.PROCESSING]: 'bg-yellow-100 text-yellow-800',
      [DocumentStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [DocumentStatus.FAILED]: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Documents</h1>
        <div className="flex gap-4">
          <Button onClick={() => navigate('/upload')}>Upload New Document</Button>
          <Button onClick={() => navigate('/admin')}>User Administration</Button>
        </div>
      </div>

      <div className="grid gap-6">
        {documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 mb-4">No documents found</p>
              <Button onClick={() => navigate('/upload')}>Upload Your First Document</Button>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">{doc.filename}</CardTitle>
                <div className="flex items-center gap-4">
                  {getStatusBadge(doc.status)}
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    View
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(doc.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Uploaded</p>
                    <p>{formatDate(doc.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">File Type</p>
                    <p>{doc.file_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}