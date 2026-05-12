import React from 'react';

const CertificatesSection = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Certificate Management</h1>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Generate Certificates</h3>
            <p className="text-gray-600 mb-4">Create digital certificates for approved artworks</p>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Generate Certificate
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Watermark Management</h3>
            <p className="text-gray-600 mb-4">Add or remove watermarks for image protection</p>
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Manage Watermarks
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Certificate Verification</h3>
            <p className="text-gray-600 mb-4">Verify certificate authenticity via QR codes</p>
            <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Verify Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificatesSection;
